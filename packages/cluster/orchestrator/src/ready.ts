/**
 * Pure readiness arithmetic for the shared Team task board.
 *
 * The Team domain gates nothing on readiness: a task whose blockers cleared is
 * still only *listed* as ready, and no event tells its owner. This module turns
 * one completion into the exact set of owners that must be woken, so the plugin
 * layer stays a thin adapter and the rule stays testable without a live Team.
 *
 * @module @deepseek-ai/dsh-cluster-orchestrator
 */

import type { TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import { reviewedTaskOf } from './review.ts'

/** One owner that must be told a task just became claimable. */
export interface ReadyNotice {
  /** Team-local task identity. */
  readonly taskId: string
  /** Subject of the unblocked task. */
  readonly subject: string
  /** Durable owner name that receives the notice. */
  readonly ownerName: string
  /** The task whose completion released the blocker. */
  readonly completedTaskId: string
  /** Blockers that are satisfied now, in board order. */
  readonly satisfiedBy: readonly string[]
}

/**
 * Compute the notices owed after one task reached `completed`.
 *
 * A notice is owed exactly when the completed task is one of a pending task's
 * blockers and every remaining blocker is completed too. Deduplicating on the
 * completed task keeps the rule idempotent: replaying the same event, or
 * re-reading a board that has not moved, produces no second wake-up.
 *
 * @param tasks - complete current board, including the completed task.
 * @param completedTaskId - the task that just transitioned to completed.
 * @returns one notice per owner that must be woken, in board order.
 */
export function readyNotices(
  tasks: readonly TeamTaskView[],
  completedTaskId: string,
): ReadyNotice[] {
  const completed = new Set(
    tasks.filter(task => task.status === 'completed').map(task => String(task.id)),
  )
  if (!completed.has(completedTaskId)) return []

  const byId = new Map(tasks.map(task => [String(task.id), task]))
  const notices: ReadyNotice[] = []
  for (const task of tasks) {
    if (task.status !== 'pending') continue
    const ownerName = task.ownerName
    if (ownerName === undefined) continue
    const blockers = task.blockedBy.map(String)
    if (!blockers.includes(completedTaskId)) continue
    if (!blockers.every(blocker => completed.has(blocker))) continue
    notices.push({
      taskId: String(task.id),
      subject: task.subject,
      ownerName,
      completedTaskId,
      satisfiedBy: blockers.filter(blocker => byId.get(blocker)?.status === 'completed'),
    })
  }
  return notices
}

/**
 * Render one model-facing wake-up. The Lead and its teammates share a mailbox
 * contract, so the notice names the task, the reason it opened, and the exact
 * board calls that follow.
 * @param notice - the computed readiness notice.
 * @returns the message text delivered to the owner.
 */
export function readyMessage(notice: ReadyNotice): string {
  return [
    `[TASK READY] ${notice.taskId} "${notice.subject}" is unblocked`,
    `because ${notice.completedTaskId} completed.`,
    `Call team_task_get ${notice.taskId} for the current revision, then`,
    `team_task_update ${notice.taskId} with action "claim" using that revision,`,
    'and report the outcome to the Lead.',
  ].join(' ')
}

/**
 * Decide which task's dependents one completion releases.
 *
 * A completion that still owes a review releases nothing: its dependents wait
 * for the verdict, because a review that gates no work gates nothing. What
 * releases them is the *review* completing, so downstream work waits on the
 * approval rather than on the delivery it is supposed to be checking.
 *
 * @param tasks - complete current board, including the completed task.
 * @param completedTaskId - the task that just transitioned to completed.
 * @param reviewOwed - whether this completion still owes a review.
 * @returns the task whose dependents to wake, or undefined when none is due yet.
 */
export function releaseDecision(
  tasks: readonly TeamTaskView[],
  completedTaskId: string,
  reviewOwed: boolean,
): string | undefined {
  const completed = tasks.find(task => String(task.id) === completedTaskId)
  if (completed === undefined) return undefined
  const reviewed = reviewedTaskOf(completed)
  if (reviewed !== undefined) return reviewed
  return reviewOwed ? undefined : completedTaskId
}
