/**
 * Keep the shared Team task board moving without the Lead polling it.
 *
 * Two coordination rules ride the same durable fact — a `team/task` commit:
 * a completion wakes the owners it released, and a completion opens the review
 * the cluster declared, counting rejections until the retry budget is spent.
 *
 * @module @deepseek-ai/dsh-cluster-orchestrator
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { TeamTaskId } from '@deepseek-ai/dsh-experimental-agent-team'
import type { TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { InferValue, ValueSchemaSpec } from '@deepseek-ai/dsh-tools'
import { broadcastTargets } from './broadcast.ts'
import {
  debatePlan,
  debateSummary,
  isVerdictTask,
  MAX_DEBATE_ROUNDS,
  readStatements,
  speechDescription,
  speechMessage,
  speechSubject,
  verdictDescription,
  verdictSubject,
} from './debate.ts'
import { handoffMessage, ownershipHandoffs } from './handoff.ts'
import {
  ballotDescription,
  ballotMessage,
  ballotSubject,
  isTallyTask,
  motionPlan,
  readTally,
  tallyDescription,
  tallySubject,
  tallySummary,
} from './motion.ts'
import {
  answerDescription,
  answerSubject,
  questionMessage,
  roundtablePlan,
  synthesisDescription,
  synthesisSubject,
} from './roundtable.ts'
import { readyMessage, readyNotices, releaseDecision } from './ready.ts'
import { retryMessage, retryNotice, reviewMessage, reviewRequest, type ReviewRequest } from './review.ts'
import { addUsage, budgetNotice, emptySpend, overBudget, type MemberSpend, type SpendRoute } from './spend.ts'

/** Cordis plugin name. */
export const name = 'cluster-orchestrator'

/** Services required by the cluster orchestrator. */
export const inject = ['agents', 'agentTeams']

/** Orchestration configuration. */
export interface Config {
  /** Whether a completed blocker wakes the released task's owner. */
  readonly dependencyAutoUnlock?: boolean
  /** Whether a completed task opens the review its cluster declares. */
  readonly reviewLoop?: boolean
  /** Whether a member past its declared token budget is told to wind down. */
  readonly budgetWatch?: boolean
}

/** Loader schema for the cluster orchestrator. */
export const Config: z<Config> = z.object({
  dependencyAutoUnlock: z.boolean().default(true),
  reviewLoop: z.boolean().default(true),
  budgetWatch: z.boolean().default(true),
})

/**
 * Structural view of the optional cluster policy source. A composition that
 * mounts `@deepseek-ai/dsh-cluster-config` gets readiness wake-ups and the
 * review loop; one without it leaves the board to the members themselves.
 */
interface ClusterPolicySource {
  defaultClusterName(): string
  reviewFor(clusterName: string): { enabled: boolean; reviewer: string; maxRetries: number } | undefined
  budgetFor(clusterName: string, memberName: string): number | undefined
}

/** Shape of one durable Team task commit read from the session log. */
interface TeamTaskEvent {
  readonly type: 'team/task'
  readonly data: { readonly task: TeamTaskView }
}

/** How many processed board revisions to remember for replay suppression. */
const SEEN_LIMIT = 512

/** Narrow one session event to a Team task commit. */
function isTeamTaskEvent(event: SessionEvent): event is SessionEvent & TeamTaskEvent {
  return event.type === 'team/task'
}

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
 * Wake every owner released by one completion, then run the review rule that
 * completion implies.
 * @param ctx - plugin context owning the registrations.
 * @param config - resolved orchestrator configuration.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const controller = new AbortController()
  // A revision identifies one board state: replaying an event cannot deliver the
  // same notice twice, while any genuine mutation still gets through.
  const seen = new Set<string>()
  let tail: Promise<void> = Promise.resolve()

  const remember = (key: string): void => {
    seen.add(key)
    if (seen.size <= SEEN_LIMIT) return
    const oldest = seen.values().next().value
    if (oldest !== undefined) seen.delete(oldest)
  }

  // Spend folds from durable usage. A Session's seq is monotonic, so counting
  // only events newer than the last fold makes the total exactly-once under
  // replay without keeping a per-event key that could be evicted.
  const spend = new Map<string, MemberSpend>()
  const lastFoldedSeq = new Map<string, number>()
  const resolvedBudget = new Map<string, { readonly name: string; readonly limit: number } | null>()
  const notified = new Set<string>()

  const policy = (): ClusterPolicySource | undefined =>
    (ctx as unknown as { get(key: string): unknown }).get('clusterConfig') as ClusterPolicySource | undefined

  const resolveLead = (sessionId: string): Agent | undefined => {
    const lead = ctx.agents.get(sessionId as Parameters<typeof ctx.agents.get>[0])
    if (lead === undefined) return undefined
    try {
      return ctx.agentTeams.tryMembership(lead)?.role === 'lead' ? lead : undefined
    } catch {
      return undefined
    }
  }

  const deliver = async (lead: Agent, target: string, text: string): Promise<void> => {
    if (target.length === 0) return
    await ctx.agentTeams.sendMessage(lead, {
      target,
      content: [{ type: 'text', text }],
      signal: controller.signal,
    })
  }

  const tryDeliver = async (lead: Agent, target: string, text: string): Promise<void> => {
    try {
      await deliver(lead, target, text)
    } catch (error: unknown) {
      ctx.logger.warn('cluster-orchestrator: notice to "%s" failed: %s', target, String(error))
    }
  }

  /**
   * Register the one Lead-facing tool, when this scope can register tools.
   *
   * Deliveries stay sequential so the returned order is the order the caller
   * named, and one refused target is reported rather than aborting the rest.
   * @param agent - the Agent whose scope owns the tool, always the Lead.
   * @returns the disposer, or undefined when the composition mounts no tool runtime.
   */
  /**
   * Register the roundtable tool, when this scope can register tools.
   *
   * The synthesis task is created last so one write carries both its blockers
   * and the names of the tasks it collects, and it is left unowned: the
   * declaration in its description is what the release-time handoff assigns.
   * @param agent - the Agent whose scope owns the tool, always the Lead.
   * @returns the disposer, or undefined when the composition mounts no tool runtime.
   */
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

  /**
   * Assign every released task that declares an owner.
   *
   * The board refuses to assign a blocked task, so a declared owner can only be
   * applied once the task is released — and until it is applied the readiness
   * notice has nobody to wake. A lost compare-and-set means the board moved
   * first: the row is somebody else's decision by then, so it is skipped.
   * @param lead - the Lead, whose credential authorizes the reassignment.
   * @param tasks - the board read for this completion.
   * @param releasedTaskId - the task whose dependents this completion released.
   */
  const handOver = async (lead: Agent, tasks: readonly TeamTaskView[], releasedTaskId: string): Promise<void> => {
    const memberNames = ctx.agentTeams.listMembers(lead).map(member => member.name)
    for (const handoff of ownershipHandoffs(tasks, releasedTaskId, memberNames)) {
      try {
        await ctx.agentTeams.updateTask(lead, {
          taskId: TeamTaskId(handoff.taskId),
          expectedRevision: handoff.revision,
          action: 'reassign',
          owner: handoff.ownerName,
        })
      } catch (error: unknown) {
        ctx.logger.warn('cluster-orchestrator: could not assign %s: %s', handoff.taskId, String(error))
        continue
      }
      // A tally carries the count the board already agrees on and a verdict
      // carries how much of the final round is readable, so each collector
      // checks a number instead of counting free text itself.
      const released = tasks.find(candidate => String(candidate.id) === handoff.taskId)
      const carried = released === undefined
        ? undefined
        : isTallyTask(released)
          ? tallySummary(readTally(released, tasks))
          : isVerdictTask(released)
            ? debateSummary(readStatements(released, tasks))
            : undefined
      await tryDeliver(lead, handoff.ownerName, handoffMessage(handoff, carried))
    }
  }

  const wakeReleased = async (lead: Agent, tasks: readonly TeamTaskView[], releasedTaskId: string): Promise<void> => {
    for (const notice of readyNotices(tasks, releasedTaskId)) {
      await deliver(lead, notice.ownerName, readyMessage(notice))
    }
  }

  const openReview = async (lead: Agent, request: ReviewRequest): Promise<void> => {
    const created = await ctx.agentTeams.createTask(lead, {
      subject: request.subject,
      description: request.description,
      writeScopes: [...request.writeScopes],
    })
    // The board hands out tasks unowned, and only the Lead may assign one.
    await ctx.agentTeams.updateTask(lead, {
      taskId: created.id,
      expectedRevision: created.revision,
      action: 'reassign',
      owner: request.ownerName,
    })
    await deliver(lead, request.ownerName, reviewMessage(request, String(created.id)))
  }

  const countRejection = async (
    lead: Agent,
    tasks: readonly TeamTaskView[],
    taskId: string,
    maxRetries: number,
  ): Promise<void> => {
    const notice = retryNotice(tasks, taskId, maxRetries)
    if (notice === undefined) return
    // An unowned task has no legal recipient: only a teammate may address the
    // Lead, and the mailbox refuses a message the Lead sends to itself. Warn the
    // operator rather than attempting a delivery that would be thrown away.
    if (notice.ownerName.length === 0) {
      ctx.logger.warn('cluster-orchestrator: %s was rejected %d times and has no owner to report it', taskId, notice.attempt)
      return
    }
    await tryDeliver(lead, notice.ownerName, retryMessage(notice, taskId))
  }

  /**
   * Resolve the budget declared for one session's member, once.
   *
   * A session that is not on the roster yet is left unresolved rather than
   * cached as unbudgeted: a teammate's first usage can arrive while its roster
   * row is still settling, and caching that miss would silently disable the
   * budget for the member's whole life.
   */
  const resolveBudget = (
    lead: Agent,
    sessionId: string,
    source: ClusterPolicySource,
  ): { readonly name: string; readonly limit: number } | undefined => {
    const cached = resolvedBudget.get(sessionId)
    if (cached !== undefined) return cached ?? undefined
    try {
      const member = ctx.agentTeams.listMembers(lead).find(entry => String(entry.id) === sessionId)
      if (member === undefined) return undefined
      const limit = source.budgetFor(source.defaultClusterName(), member.name)
      const declared = limit === undefined ? null : { name: member.name, limit }
      resolvedBudget.set(sessionId, declared)
      return declared ?? undefined
    } catch {
      return undefined
    }
  }

  /** Tell a member that overspent, and its Lead, exactly once per Session. */
  const watchBudget = async (lead: Agent, sessionId: string, source: ClusterPolicySource): Promise<void> => {
    if (notified.has(sessionId)) return
    const record = spend.get(sessionId)
    if (record === undefined) return
    const declared = resolveBudget(lead, sessionId, source)
    if (declared === undefined || !overBudget(record, declared.limit)) return
    notified.add(sessionId)
    await tryDeliver(lead, declared.name, budgetNotice(declared.name, record, declared.limit))
  }

  /**
   * Fold one durable model call into its session's spend, then test the budget.
   *
   * Only `assistant/message` carries `TokenUsage`, and it is recorded once per
   * settled call, so this is the whole usage signal the harness exposes.
   */
  const foldSpend = (sessionId: string, event: SessionEvent): void => {
    if (event.type !== 'assistant/message' || config.budgetWatch === false) return
    if (event.seq <= (lastFoldedSeq.get(sessionId) ?? -1)) return
    lastFoldedSeq.set(sessionId, event.seq)
    const { usage } = event.data
    if (usage === undefined) return
    const attribution = event.data.message.source as { readonly provider?: string; readonly model?: string }
    const route: SpendRoute = {
      ...attribution.provider === undefined ? {} : { provider: attribution.provider },
      ...attribution.model === undefined ? {} : { model: attribution.model },
    }
    spend.set(sessionId, addUsage(spend.get(sessionId) ?? emptySpend(sessionId), usage, route))
    tail = tail.then(async () => {
      try {
        const lead = resolveLead(sessionId)
        if (lead === undefined) return
        const cluster = policy()
        if (cluster === undefined) return
        await watchBudget(lead, sessionId, cluster)
      } catch (error: unknown) {
        ctx.logger.warn('cluster-orchestrator: budget watch failed: %s', String(error))
      }
    })
  }

  ctx.on('session/event', (session, event) => {
    const sessionId = String(session.id)
    if (event.type === 'assistant/message') {
      foldSpend(sessionId, event)
      return
    }
    if (!isTeamTaskEvent(event)) return
    const task = event.data.task
    const key = `${sessionId}::${String(task.id)}::${task.revision}`
    if (seen.has(key)) return
    remember(key)
    tail = tail.then(async () => {
      try {
        const lead = resolveLead(sessionId)
        if (lead === undefined) return
        const tasks = ctx.agentTeams.listTasks(lead)
        const taskId = String(task.id)
        const source = policy()
        const review = config.reviewLoop === false || source === undefined
          ? undefined
          : source.reviewFor(source.defaultClusterName())
        // A completion that still owes a review is not the fact downstream work
        // waits for: the verdict is. Computing the request once keeps the
        // release decision and the task that actually gets opened reading the
        // same board.
        const request = review === undefined || task.status !== 'completed'
          ? undefined
          : reviewRequest(tasks, taskId, review.reviewer)
        if (config.dependencyAutoUnlock !== false && task.status === 'completed') {
          const released = releaseDecision(tasks, taskId, request !== undefined)
          if (released !== undefined) {
            await handOver(lead, tasks, released)
            await wakeReleased(lead, tasks, released)
          }
        }
        if (review === undefined) return
        if (request !== undefined) {
          await openReview(lead, request)
        } else if (task.status !== 'completed') {
          await countRejection(lead, tasks, taskId, review.maxRetries)
        }
      } catch (error: unknown) {
        ctx.logger.warn('cluster-orchestrator: board coordination failed: %s', String(error))
      }
    })
  })

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
    controller.abort()
    for (const dispose of broadcasts.values()) dispose()
    broadcasts.clear()
    return tail
  }, 'cluster-orchestrator.boardCoordination()')
}
