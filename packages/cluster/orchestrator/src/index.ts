/**
 * Wake the owner of a shared task as soon as its blockers clear.
 *
 * The Team domain records `blockedBy` edges and reports readiness, but it never
 * notifies anybody: a released task waits until a member happens to re-list the
 * board. This plugin closes that gap by reacting to the durable `team/task`
 * commit and sending one durable peer message per newly unblocked owner.
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

/** Cordis plugin name. */
export const name = 'cluster-orchestrator'

/** Services required by the cluster orchestrator. */
export const inject = ['agents', 'agentTeams']

/** Orchestration configuration. */
export interface Config {
  /** Whether a completed blocker wakes the released task's owner. */
  readonly dependencyAutoUnlock?: boolean
}

/** Loader schema for the cluster orchestrator. */
export const Config: z<Config> = z.object({
  dependencyAutoUnlock: z.boolean().default(true),
})

/** Shape of one durable Team task commit read from the session log. */
interface TeamTaskEvent {
  readonly type: 'team/task'
  readonly data: { readonly task: TeamTaskView }
}

/** Narrow one session event to a Team task commit. */
function isTeamTaskEvent(event: SessionEvent): event is SessionEvent & TeamTaskEvent {
  return event.type === 'team/task'
}

/**
 * Wake every owner released by one completion.
 * @param ctx - plugin context owning the registrations.
 * @param config - resolved orchestrator configuration.
 */
export function apply(ctx: Context, config: Config = {}): void {
  if (config.dependencyAutoUnlock === false) return
  const controller = new AbortController()
  // One completion can only be processed once, and a slow delivery must not let
  // a later event overtake it on the same board.
  const inFlight = new Set<string>()
  let tail: Promise<void> = Promise.resolve()

  const wake = async (sessionId: string, completedTaskId: string): Promise<void> => {
    const lead: Agent | undefined = ctx.agents.get(sessionId as Parameters<typeof ctx.agents.get>[0])
    if (lead === undefined) return
    let membership
    try {
      membership = ctx.agentTeams.tryMembership(lead)
    } catch {
      return
    }
    if (membership === undefined || membership.role !== 'lead') return
    const tasks = ctx.agentTeams.listTasks(lead)
    for (const notice of readyNotices(tasks, completedTaskId)) {
      if (notice.ownerName === membership.name) continue
      await ctx.agentTeams.sendMessage(lead, {
        target: notice.ownerName,
        content: [{ type: 'text', text: readyMessage(notice) }],
        signal: controller.signal,
      })
    }
  }

  ctx.on('session/event', (session, event) => {
    if (!isTeamTaskEvent(event)) return
    const task = event.data.task
    if (task.status !== 'completed') return
    const completedTaskId = String(task.id)
    const key = `${String(session.id)}::${completedTaskId}`
    if (inFlight.has(key)) return
    inFlight.add(key)
    tail = tail.then(async () => {
      try {
        await wake(String(session.id), completedTaskId)
      } catch (error: unknown) {
        ctx.logger.warn('cluster-orchestrator: readiness delivery failed: %s', String(error))
      } finally {
        inFlight.delete(key)
      }
    })
  })

  ctx.effect(() => () => {
    controller.abort()
    return tail
  }, 'cluster-orchestrator.dependencyAutoUnlock()')
}
