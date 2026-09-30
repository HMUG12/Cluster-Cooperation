/**
 * The four protocols a Cluster Lead can call: one durable message to many
 * members, a parallel roundtable with a synthesis, a motion with a tally, and
 * a debate with a verdict.
 *
 * Each one is a fan-out the Lead could not express otherwise: the board closes
 * a poll or releases a synthesis on its own because every participant owns a
 * row that the collector task blocks on. Installation is Lead-only, and a
 * composition that mounts no tool runtime simply gets no tools.
 *
 * @module @deepseek-ai/dsh-experimental-tool-cluster
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { TeamTaskId } from '@deepseek-ai/dsh-experimental-agent-team'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { InferValue, ValueSchemaSpec } from '@deepseek-ai/dsh-tools'
import { broadcastTargets } from './broadcast.ts'
import {
  debatePlan,
  MAX_DEBATE_ROUNDS,
  speechDescription,
  speechMessage,
  speechSubject,
  verdictDescription,
  verdictSubject,
} from './debate.ts'
import {
  ballotDescription,
  ballotMessage,
  ballotSubject,
  motionPlan,
  tallyDescription,
  tallySubject,
} from './motion.ts'
import {
  answerDescription,
  answerSubject,
  questionMessage,
  roundtablePlan,
  synthesisDescription,
  synthesisSubject,
} from './roundtable.ts'

// The orchestrator reads a released tally or verdict to carry its count into the
// handoff notice, so the vocabulary both packages share is re-exported here
// rather than reached through a subpath the package does not expose.
export { debateSummary, isVerdictTask, readStatements } from './debate.ts'
export { isTallyTask, readTally, tallySummary } from './motion.ts'

/** Cordis plugin name. */
export const name = 'tool-cluster'

/** Services the protocol tools require. */
export const inject = ['agents', 'agentTeams']

/** One broadcast result, matching what the tool promises the model. */
const BROADCAST_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    delivered: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          target: { type: 'string', required: true },
          messageId: { type: 'string', required: true },
          status: { type: 'string', required: true, enum: ['accepted', 'queued'] },
        },
      },
    },
    skipped: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          target: { type: 'string', required: true },
          reason: { type: 'string', required: true },
        },
      },
    },
  },
} as const

/** One roundtable result, matching what the tool promises the model. */
const ROUNDTABLE_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    round: {
      type: 'object',
      required: true,
      additionalProperties: false,
      properties: {
        taskId: { type: 'string', required: true },
        subject: { type: 'string', required: true },
        ownerName: { type: 'string', required: true },
      },
    },
    asked: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          target: { type: 'string', required: true },
          taskId: { type: 'string', required: true },
          messageId: { type: 'string', required: true },
          status: { type: 'string', required: true, enum: ['accepted', 'queued'] },
        },
      },
    },
    skipped: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          target: { type: 'string', required: true },
          reason: { type: 'string', required: true },
        },
      },
    },
  },
} as const

/** One debate result, matching what the tool promises the model. */
const DEBATE_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: {
      type: 'object',
      required: true,
      additionalProperties: false,
      properties: {
        taskId: { type: 'string', required: true },
        subject: { type: 'string', required: true },
        ownerName: { type: 'string', required: true },
      },
    },
    speeches: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          round: { type: 'integer', required: true },
          target: { type: 'string', required: true },
          taskId: { type: 'string', required: true },
        },
      },
    },
    skipped: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          target: { type: 'string', required: true },
          reason: { type: 'string', required: true },
        },
      },
    },
  },
} as const

/** One motion result, matching what the tool promises the model. */
const MOTION_VALUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tally: {
      type: 'object',
      required: true,
      additionalProperties: false,
      properties: {
        taskId: { type: 'string', required: true },
        subject: { type: 'string', required: true },
        ownerName: { type: 'string', required: true },
      },
    },
    ballots: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          target: { type: 'string', required: true },
          taskId: { type: 'string', required: true },
          messageId: { type: 'string', required: true },
          status: { type: 'string', required: true, enum: ['accepted', 'queued'] },
        },
      },
    },
    skipped: {
      type: 'array',
      required: true,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          target: { type: 'string', required: true },
          reason: { type: 'string', required: true },
        },
      },
    },
  },
} as const

/** Declare one canonical output schema with compact model-facing JSON. */
function jsonOutput<const S extends ValueSchemaSpec>(schema: S): {
  schema: S
  render: (args: unknown, value: InferValue<S>) => [{ type: 'text'; text: string }]
} {
  return {
    schema,
    render: (_args: unknown, value: InferValue<S>) => [{ type: 'text', text: JSON.stringify(value) }],
  }
}

/** Structural view of the optional tool runtime. */
interface ToolRuntime {
  register(tool: unknown): () => void
}

/**
 * Read the tool runtime when the composition mounts one.
 *
 * The board policy needs only `agents` and `agentTeams`, so this stays a
 * structural lookup instead of an injection: a composition without the tool
 * runtime has no model to call a tool, and the orchestrator must keep loading
 * there rather than gain a requirement for a surface it does not need.
 * @param ctx - context that may carry the tool runtime.
 * @returns the runtime, or undefined when the composition mounts none.
 */
function toolRuntime(ctx: Context): ToolRuntime | undefined {
  const found = (ctx as unknown as { get(name: string): unknown }).get('tools')
  if (typeof found !== 'object' || found === null) return undefined
  const register = (found as { register?: unknown }).register
  return typeof register === 'function' ? found as ToolRuntime : undefined
}

/**
 * Register the protocol tools on every Team Lead, and dispose them with it.
 *
 * A session tree can hold several Leads, so installation is per Agent and
 * idempotent, and a composition that mounts no tool runtime is left alone
 * rather than given a requirement it does not need.
 * @param ctx - plugin context owning the registrations.
 */
export function apply(ctx: Context): void {
  /**
   * Run one board or mailbox step, reporting a failure instead of abandoning the rest.
   *
   * Every protocol here mutates one target at a time, and the roster can refuse a
   * target a plan expected to work with. Letting the first refusal propagate would
   * skip every target after it and leave whatever rows the step had already
   * created, so each target is attempted alone and its failure becomes a reason
   * the model can read.
   * @param step - one delivery or board mutation.
   * @returns the value, or the message the failure carries.
   */
  const attempt = async <T>(step: () => Promise<T>): Promise<
    { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: string }
  > => {
    try {
      return { ok: true, value: await step() }
    } catch (error: unknown) {
      return { ok: false, reason: error instanceof Error ? error.message : String(error) }
    }
  }

  const registerRoundtable = (agent: Agent): (() => void) | undefined => {
    const tools = toolRuntime(agent.ctx)
    if (tools === undefined) return undefined
    return tools.register(defineTool({
      name: 'roundtable',
      description: 'Ask several teammates one question in parallel, with a synthesis task that is assigned to a teammate the moment the last answer lands. Only the Team Lead may call this tool.',
      parameters: {
        question: { type: 'string', required: true, description: 'The question every participant must answer.' },
        synthesize: {
          type: 'string',
          required: true,
          description: 'Teammate that collects the answers once the last one lands. Never the Lead, which no notice can wake.',
        },
        participants: {
          type: 'array',
          items: { type: 'string' },
          description: 'Teammate names to ask; omit to ask every current teammate.',
        },
      },
      output: jsonOutput(ROUNDTABLE_VALUE_SCHEMA),
      async execute(args, exec) {
        const caller = exec.agent
        if (caller === undefined) throw new Error('roundtable requires a calling Agent')
        const decision = roundtablePlan(args.participants, ctx.agentTeams.listMembers(caller), args.synthesize)
        if (!decision.ok) throw new Error(`roundtable refused: ${decision.reason}`)
        const { plan } = decision
        const asked: Array<{ target: string; taskId: string; messageId: string; status: 'accepted' | 'queued' }> = []
        const refused = plan.skipped.map(skip => ({ target: skip.target, reason: skip.reason }))
        for (const target of plan.ask) {
          const setup = await attempt(async () => {
            const task = await ctx.agentTeams.createTask(caller, {
              subject: answerSubject(args.question),
              description: answerDescription(args.question, plan.synthesizer),
            })
            await ctx.agentTeams.updateTask(caller, {
              taskId: task.id,
              expectedRevision: task.revision,
              action: 'reassign',
              owner: target,
            })
            const sent = await ctx.agentTeams.sendMessage(caller, {
              target,
              content: [{ type: 'text', text: questionMessage(String(task.id), args.question) }],
              signal: exec.signal,
            })
            return {
              taskId: String(task.id),
              messageId: String(sent.messageId),
              status: sent.status,
            }
          })
          if (!setup.ok) {
            refused.push({ target, reason: setup.reason })
            continue
          }
          asked.push({ target, ...setup.value })
        }
        // A synthesis task with no answers blocks on nothing, and readiness alone
        // wakes nobody, so a round that asked nobody has to fail loudly instead of
        // leaving a task whose collector is never assigned.
        if (asked.length === 0) {
          throw new Error(`roundtable asked nobody: ${refused.map(skip => `${skip.target} (${skip.reason})`).join('; ')}`)
        }
        const round = await ctx.agentTeams.createTask(caller, {
          subject: synthesisSubject(args.question),
          description: synthesisDescription(args.question, plan.synthesizer, asked.map(entry => entry.taskId)),
          blockedBy: asked.map(entry => TeamTaskId(entry.taskId)),
        })
        return {
          round: { taskId: String(round.id), subject: round.subject, ownerName: plan.synthesizer },
          asked,
          skipped: refused,
        }
      },
    }))
  }

  /**
   * Register the motion tool, when this scope can register tools.
   *
   * One ballot row per voter is what lets the board close the poll: the tally
   * task blocks on exactly those rows, so the ordinary release path both wakes
   * the counter and carries the count.
   * @param agent - the Agent whose scope owns the tool, always the Lead.
   * @returns the disposer, or undefined when the composition mounts no tool runtime.
   */
  const registerMotion = (agent: Agent): (() => void) | undefined => {
    const tools = toolRuntime(agent.ctx)
    if (tools === undefined) return undefined
    return tools.register(defineTool({
      name: 'motion',
      description: 'Put one motion to a vote: every voter owns a ballot task, and a tally task is assigned to a teammate the moment the last ballot is cast. Only the Team Lead may call this tool.',
      parameters: {
        motion: { type: 'string', required: true, description: 'The motion every voter decides on.' },
        count: {
          type: 'string',
          required: true,
          description: 'Teammate that counts the ballots once the last one is cast. Never the Lead, which no notice can wake.',
        },
        voters: {
          type: 'array',
          items: { type: 'string' },
          description: 'Teammate names to ask; omit to ask every current teammate.',
        },
      },
      output: jsonOutput(MOTION_VALUE_SCHEMA),
      async execute(args, exec) {
        const caller = exec.agent
        if (caller === undefined) throw new Error('motion requires a calling Agent')
        const decision = motionPlan(args.voters, ctx.agentTeams.listMembers(caller), args.count)
        if (!decision.ok) throw new Error(`motion refused: ${decision.reason}`)
        const { plan } = decision
        const ballots: Array<{ target: string; taskId: string; messageId: string; status: 'accepted' | 'queued' }> = []
        const refused = plan.skipped.map(skip => ({ target: skip.target, reason: skip.reason }))
        for (const target of plan.ask) {
          const setup = await attempt(async () => {
            const ballot = await ctx.agentTeams.createTask(caller, {
              subject: ballotSubject(args.motion),
              description: ballotDescription(args.motion, plan.counter),
            })
            await ctx.agentTeams.updateTask(caller, {
              taskId: ballot.id,
              expectedRevision: ballot.revision,
              action: 'reassign',
              owner: target,
            })
            const sent = await ctx.agentTeams.sendMessage(caller, {
              target,
              content: [{ type: 'text', text: ballotMessage(String(ballot.id), args.motion) }],
              signal: exec.signal,
            })
            return {
              taskId: String(ballot.id),
              messageId: String(sent.messageId),
              status: sent.status,
            }
          })
          if (!setup.ok) {
            refused.push({ target, reason: setup.reason })
            continue
          }
          ballots.push({ target, ...setup.value })
        }
        // A tally with no ballots blocks on nothing, and readiness alone wakes
        // nobody, so a motion nobody could vote in has to fail loudly rather than
        // leave a tally whose counter is never assigned.
        if (ballots.length === 0) {
          throw new Error(`motion polled nobody: ${refused.map(skip => `${skip.target} (${skip.reason})`).join('; ')}`)
        }
        const tally = await ctx.agentTeams.createTask(caller, {
          subject: tallySubject(args.motion),
          description: tallyDescription(args.motion, plan.counter, ballots.map(entry => entry.taskId)),
          blockedBy: ballots.map(entry => TeamTaskId(entry.taskId)),
        })
        return {
          tally: { taskId: String(tally.id), subject: tally.subject, ownerName: plan.counter },
          ballots,
          skipped: refused,
        }
      },
    }))
  }

  /**
   * Register the debate tool, when this scope can register tools.
   *
   * A debate is the one protocol whose shape is layered rather than fanned: the
   * opening round is assigned and announced here, and every later round is left
   * to the ordinary release path, which opens a round only once the previous one
   * is fully argued. No board state carries the round, because the round *is*
   * the blocker list.
   * @param agent - the Agent whose scope owns the tool, always the Lead.
   * @returns the disposer, or undefined when the composition mounts no tool runtime.
   */
  const registerDebate = (agent: Agent): (() => void) | undefined => {
    const tools = toolRuntime(agent.ctx)
    if (tools === undefined) return undefined
    return tools.register(defineTool({
      name: 'debate',
      description: 'Run a debate over several rounds: every speaker owns one speech per round, each round stays blocked until the previous one is argued, and a verdict task is assigned to a judge the moment the final round closes. Only the Team Lead may call this tool.',
      parameters: {
        topic: { type: 'string', required: true, description: 'The question the debate argues.' },
        rounds: {
          type: 'integer',
          required: true,
          description: `Rounds to run, at least 2 and at most ${MAX_DEBATE_ROUNDS}; each round spends every speaker a turn.`,
        },
        judge: {
          type: 'string',
          required: true,
          description: 'Teammate that weighs the final round. Never a speaker, and never the Lead, which no notice can wake.',
        },
        speakers: {
          type: 'array',
          items: { type: 'string' },
          description: 'Teammate names to seat, in speaking order; omit to seat every current teammate except the judge.',
        },
      },
      output: jsonOutput(DEBATE_VALUE_SCHEMA),
      async execute(args, exec) {
        const caller = exec.agent
        if (caller === undefined) throw new Error('debate requires a calling Agent')
        const decision = debatePlan(args.speakers, ctx.agentTeams.listMembers(caller), args.rounds, args.judge)
        if (!decision.ok) throw new Error(`debate refused: ${decision.reason}`)
        const { plan } = decision
        const speeches: Array<{ round: number; target: string; taskId: string }> = []
        const refused = plan.skipped.map(skip => ({ target: skip.target, reason: skip.reason }))
        // Each round blocks on the previous one, so open them in order and let
        // the release path do the rest of the work.
        let prior: string[] = []
        for (let round = 1; round <= plan.rounds; round += 1) {
          const ids: string[] = []
          for (const target of plan.speakers) {
            const setup = await attempt(async () => {
              const speech = await ctx.agentTeams.createTask(caller, {
                subject: speechSubject(round, plan.rounds, args.topic),
                description: speechDescription(args.topic, target, round, plan.rounds, plan.judge, prior),
                ...prior.length === 0 ? {} : { blockedBy: prior.map(id => TeamTaskId(id)) },
              })
              // The opening round is ready the moment it exists, so nothing else
              // will ever assign it; later rounds wait for the handoff.
              if (round > 1) return { taskId: String(speech.id) }
              await ctx.agentTeams.updateTask(caller, {
                taskId: speech.id,
                expectedRevision: speech.revision,
                action: 'reassign',
                owner: target,
              })
              await ctx.agentTeams.sendMessage(caller, {
                target,
                content: [{ type: 'text', text: speechMessage(String(speech.id), round, plan.rounds) }],
                signal: exec.signal,
              })
              return { taskId: String(speech.id) }
            })
            if (!setup.ok) {
              refused.push({ target: `round ${round} ${target}`, reason: setup.reason })
              continue
            }
            ids.push(setup.value.taskId)
            speeches.push({ round, target, taskId: setup.value.taskId })
          }
          prior = ids
        }
        // A verdict blocked by nothing is woken by nothing, so a debate that
        // opened no speech has to fail loudly rather than leave it waiting.
        if (prior.length === 0) {
          throw new Error(`debate opened no speech: ${refused.map(skip => `${skip.target} (${skip.reason})`).join('; ')}`)
        }
        const verdict = await ctx.agentTeams.createTask(caller, {
          subject: verdictSubject(args.topic),
          description: verdictDescription(args.topic, plan.judge, prior),
          blockedBy: prior.map(id => TeamTaskId(id)),
        })
        return {
          verdict: { taskId: String(verdict.id), subject: verdict.subject, ownerName: plan.judge },
          speeches,
          skipped: refused,
        }
      },
    }))
  }

  const registerBroadcast = (agent: Agent): (() => void) | undefined => {
    const tools = toolRuntime(agent.ctx)
    if (tools === undefined) return undefined
    return tools.register(defineTool({
      name: 'broadcast_message',
      description: 'Send one durable message to several Team members at once. Omitting targets addresses every current teammate. Only the Team Lead may call this tool.',
      parameters: {
        message: { type: 'string', required: true, description: 'Self-contained message for every target.' },
        targets: {
          type: 'array',
          items: { type: 'string' },
          description: 'Member names to address, in delivery order; omit to address every current teammate.',
        },
      },
      output: jsonOutput(BROADCAST_VALUE_SCHEMA),
      async execute(args, exec) {
        const caller = exec.agent
        if (caller === undefined) throw new Error('broadcast_message requires a calling Agent')
        const plan = broadcastTargets(args.targets, ctx.agentTeams.listMembers(caller))
        const delivered: Array<{ target: string; messageId: string; status: 'accepted' | 'queued' }> = []
        const refused = plan.skipped.map(skip => ({ target: skip.target, reason: skip.reason }))
        for (const target of plan.send) {
          const sent = await attempt(() => ctx.agentTeams.sendMessage(caller, {
            target,
            content: [{ type: 'text', text: args.message }],
            signal: exec.signal,
          }))
          if (!sent.ok) {
            refused.push({ target, reason: sent.reason })
            continue
          }
          delivered.push({ target, messageId: String(sent.value.messageId), status: sent.value.status })
        }
        return { delivered, skipped: refused }
      },
    }))
  }


  const broadcasts = new Map<Agent, () => void>()
  const maybeInstallBroadcast = (agent: Agent): void => {
    if (broadcasts.has(agent)) return
    try {
      if (ctx.agentTeams.tryMembership(agent)?.role !== 'lead') return
    } catch {
      return
    }
    const registered = [
      registerBroadcast(agent),
      registerRoundtable(agent),
      registerMotion(agent),
      registerDebate(agent),
    ]
      .filter((dispose): dispose is () => void => dispose !== undefined)
    if (registered.length === 0) return
    broadcasts.set(agent, () => {
      for (const dispose of registered) dispose()
    })
  }
  for (const agent of ctx.agents.list()) maybeInstallBroadcast(agent)
  ctx.on('agent/created', ({ agent }) => { maybeInstallBroadcast(agent) })
  ctx.on('agent/disposed', ({ agent }) => {
    broadcasts.get(agent)?.()
    broadcasts.delete(agent)
  })

  ctx.effect(() => () => {
    for (const dispose of broadcasts.values()) dispose()
    broadcasts.clear()
  }, 'tool-cluster.protocolTools()')
}
