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
import { readyMessage, readyNotices } from './ready.ts'
import { retryMessage, retryNotice, reviewMessage, reviewRequest } from './review.ts'
import { addUsage, budgetNotices, emptySpend, overBudget, type MemberSpend, type SpendRoute } from './spend.ts'

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

  const wakeReleased = async (lead: Agent, tasks: readonly TeamTaskView[], completedTaskId: string): Promise<void> => {
    for (const notice of readyNotices(tasks, completedTaskId)) {
      await deliver(lead, notice.ownerName, readyMessage(notice))
    }
  }

  const openReview = async (
    lead: Agent,
    tasks: readonly TeamTaskView[],
    completedTaskId: string,
    reviewer: string,
  ): Promise<void> => {
    const request = reviewRequest(tasks, completedTaskId, reviewer)
    if (request === undefined) return
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
    await tryDeliver(lead, notice.exhausted ? 'lead' : notice.ownerName, retryMessage(notice, taskId))
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
    const notices = budgetNotices(declared.name, record, declared.limit)
    // The member notice is the actionable one; a refused Lead notice must not
    // cost it, so both are best-effort and one failure cannot hide the other.
    await tryDeliver(lead, declared.name, notices.member)
    await tryDeliver(lead, 'lead', notices.lead)
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
        if (config.dependencyAutoUnlock !== false && task.status === 'completed') {
          await wakeReleased(lead, tasks, String(task.id))
        }
        if (config.reviewLoop === false) return
        const source = policy()
        if (source === undefined) return
        const review = source.reviewFor(source.defaultClusterName())
        if (review === undefined) return
        if (task.status === 'completed') {
          await openReview(lead, tasks, String(task.id), review.reviewer)
        } else {
          await countRejection(lead, tasks, String(task.id), review.maxRetries)
        }
      } catch (error: unknown) {
        ctx.logger.warn('cluster-orchestrator: board coordination failed: %s', String(error))
      }
    })
  })

  ctx.effect(() => () => {
    controller.abort()
    return tail
  }, 'cluster-orchestrator.boardCoordination()')
}
