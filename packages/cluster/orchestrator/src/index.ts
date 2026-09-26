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
import type {} from '@deepseek-ai/dsh-experimental-agent-team'
import type { TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { InferValue, ValueSchemaSpec } from '@deepseek-ai/dsh-tools'
import { broadcastTargets } from './broadcast.ts'
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
        for (const target of plan.send) {
          const sent = await ctx.agentTeams.sendMessage(caller, {
            target,
            content: [{ type: 'text', text: args.message }],
            signal: exec.signal,
          })
          delivered.push({ target, messageId: String(sent.messageId), status: sent.status })
        }
        return {
          delivered,
          skipped: plan.skipped.map(skip => ({ target: skip.target, reason: skip.reason })),
        }
      },
    }))
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
          if (released !== undefined) await wakeReleased(lead, tasks, released)
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
    const registered = registerBroadcast(agent)
    if (registered !== undefined) broadcasts.set(agent, registered)
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
