/**
 * Pure ownership handoff for tasks released by a completion.
 *
 * `createTask` hands out unowned rows, and `reassign` refuses a task that is
 * still blocked — so a task that waits on blockers cannot carry an owner while
 * it waits. The wake-up rule then has nobody to wake, which leaves any
 * fan-out-then-collect pattern (brief N members, let one synthesizer act when
 * the last answer lands) with no way to close its own loop.
 *
 * A declaration in the description closes it: the owner a task names is
 * assigned the moment its last blocker lands, and that owner is then the one
 * the ordinary readiness notice wakes.
 *
 * @module @deepseek-ai/dsh-cluster-orchestrator
 */

import type { TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'

/** Marker line that names the member a released task belongs to. */
const OWNER_MARKER_PREFIX = 'cluster-owner: '

/** One released task that must be assigned before anyone can be woken. */
export interface OwnershipHandoff {
  /** Team-local task identity. */
  readonly taskId: string
  /** Revision the assignment compare-and-sets against. */
  readonly revision: number
  /** Subject of the released task. */
  readonly subject: string
  /** Member name the task declares as its owner. */
  readonly ownerName: string
}

/**
 * Read the owner one task declares, when it declares one.
 *
 * The declaration lives in the description because the board offers no other
 * slot that survives `reassign` refusing a blocked task.
 * @param task - board row to read.
 * @returns the declared member name, or undefined when the row declares none.
 */
export function declaredOwner(task: TeamTaskView): string | undefined {
  const line = task.description
    .split('\n')
    .find(candidate => candidate.startsWith(OWNER_MARKER_PREFIX))
  const owner = line?.slice(OWNER_MARKER_PREFIX.length).trim()
  return owner === undefined || owner.length === 0 ? undefined : owner
}

/**
 * Collect the handoffs one completion owes.
 *
 * A handoff is owed exactly when the completed task is one of an unowned
 * pending task's blockers, every remaining blocker is completed, and the task
 * declares a member the roster actually carries — an unknown or absent name
 * leaves the row unowned rather than assigning it to a member that cannot act.
 *
 * @param tasks - complete current board, including the completed task.
 * @param releasedTaskId - the task that just transitioned to completed.
 * @param memberNames - names the current roster carries.
 * @returns one handoff per released task that declares an owner, in board order.
 */
export function ownershipHandoffs(
  tasks: readonly TeamTaskView[],
  releasedTaskId: string,
  memberNames: readonly string[],
): OwnershipHandoff[] {
  const completed = new Set(
    tasks.filter(task => task.status === 'completed').map(task => String(task.id)),
  )
  if (!completed.has(releasedTaskId)) return []

  const handoffs: OwnershipHandoff[] = []
  for (const task of tasks) {
    if (task.status !== 'pending') continue
    if (task.ownerName !== undefined) continue
    const blockers = task.blockedBy.map(String)
    if (!blockers.includes(releasedTaskId)) continue
    if (!blockers.every(blocker => completed.has(blocker))) continue
    const ownerName = declaredOwner(task)
    if (ownerName === undefined || !memberNames.includes(ownerName)) continue
    handoffs.push({
      taskId: String(task.id),
      revision: task.revision,
      subject: task.subject,
      ownerName,
    })
  }
  return handoffs
}

/**
 * Render the notice a handoff delivers once the assignment has landed.
 * @param handoff - the computed handoff.
 * @returns the message text delivered to the newly assigned owner.
 */
export function handoffMessage(handoff: OwnershipHandoff): string {
  return [
    `[TASK READY] ${handoff.taskId} "${handoff.subject}" is unblocked and now assigned to you.`,
    `Call team_task_get ${handoff.taskId} for the current revision, then`,
    `team_task_update ${handoff.taskId} with action "claim" using that revision,`,
    'and report the outcome to the Lead.',
  ].join(' ')
}
