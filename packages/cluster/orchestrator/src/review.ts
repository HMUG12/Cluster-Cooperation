/**
 * Pure review-loop arithmetic over the shared Team task board.
 *
 * A completed task tells the Lead nothing about whether it was *good*. The
 * cluster declares one reviewer, so every completion can open a review the
 * reviewer owns, and a rejection can be counted back to the original owner
 * until the cluster stops retrying and escalates. Both decisions are pure
 * functions of the board, which is what keeps the loop idempotent under event
 * replay and testable without a live Team.
 *
 * @module @deepseek-ai/dsh-cluster-orchestrator
 */

import type { TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'

/** Subject prefix that marks a task this loop opened. */
export const REVIEW_SUBJECT_PREFIX = 'Review: '

/** Marker line that binds a review task to the task it reviews. */
const REVIEW_MARKER_PREFIX = 'cluster-review-of: '

/** One review task that must be opened and assigned to the reviewer. */
export interface ReviewRequest {
  /** Subject for the new review task. */
  readonly subject: string
  /** Body carrying the marker plus the reviewer's obligations. */
  readonly description: string
  /** Declared member that must own the review. */
  readonly ownerName: string
  /** Advisory scopes inherited from the reviewed task. */
  readonly writeScopes: readonly string[]
}

/** What one rejection owes: another retry, or an escalation to the Lead. */
export interface RetryNotice {
  /** Owner of the rejected task, when it still has one. */
  readonly ownerName: string
  /** 1-based rejection count. */
  readonly attempt: number
  /** Whether the retry budget is spent. */
  readonly exhausted: boolean
  /** Configured ceiling, echoed into the message. */
  readonly maxRetries: number
}

/** Read the reviewed task id out of one board row, when the row is a review. */
export function reviewedTaskOf(task: TeamTaskView): string | undefined {
  const line = task.description
    .split('\n')
    .find(candidate => candidate.startsWith(REVIEW_MARKER_PREFIX))
  return line?.slice(REVIEW_MARKER_PREFIX.length).trim()
}

/** Whether one board row was opened by this loop rather than delegated work. */
export function isReviewTask(task: TeamTaskView): boolean {
  return task.subject.startsWith(REVIEW_SUBJECT_PREFIX)
}

/**
 * Decide whether one completion owes a review.
 *
 * A review is skipped when the cluster declares no reviewer, when the completed
 * task is itself a review (reviews are never reviewed), when its owner is the
 * reviewer (self-review proves nothing), and when a review of it already
 * exists — that last guard is what makes replaying the same completion safe.
 *
 * @param tasks - complete current board.
 * @param completedTaskId - the task that just reached completed.
 * @param reviewer - declared reviewer member name.
 * @returns the review to open, or undefined when none is owed.
 */
export function reviewRequest(
  tasks: readonly TeamTaskView[],
  completedTaskId: string,
  reviewer: string,
): ReviewRequest | undefined {
  const completed = tasks.find(task => String(task.id) === completedTaskId)
  if (completed === undefined || completed.status !== 'completed') return undefined
  if (isReviewTask(completed)) return undefined
  if (completed.ownerName === reviewer) return undefined
  if (tasks.some(task => reviewedTaskOf(task) === completedTaskId)) return undefined
  return {
    subject: `${REVIEW_SUBJECT_PREFIX}${completed.subject}`,
    description: [
      `${REVIEW_MARKER_PREFIX}${completedTaskId}`,
      `Reviewed deliverable: ${completed.subject}`,
      `Original owner: ${completed.ownerName ?? 'unowned'}`,
      'Inspect the delivered work against the original task description.',
      'Approve by completing this review task with team_task_update action "complete".',
      `Reject by reopening ${completedTaskId} with team_task_update action "reopen" and stating the blocking defect.`,
    ].join('\n'),
    ownerName: reviewer,
    writeScopes: completed.writeScopes,
  }
}

/**
 * Decide what one non-completed task that already has a review owes.
 *
 * A task is in this state because its review rejected it. The rejection count is
 * the number of reviews opened for it, so the loop needs no hidden counter: the
 * board is the whole state.
 *
 * @param tasks - complete current board.
 * @param taskId - the task observed as no longer completed.
 * @param maxRetries - configured rejection ceiling.
 * @returns the retry owed, or undefined when the task was never reviewed.
 */
export function retryNotice(
  tasks: readonly TeamTaskView[],
  taskId: string,
  maxRetries: number,
): RetryNotice | undefined {
  const task = tasks.find(candidate => String(candidate.id) === taskId)
  if (task === undefined || task.status === 'completed' || task.status === 'deleted') return undefined
  const attempt = tasks.filter(candidate => reviewedTaskOf(candidate) === taskId).length
  if (attempt === 0) return undefined
  return {
    ownerName: task.ownerName ?? '',
    attempt,
    exhausted: attempt > maxRetries,
    maxRetries,
  }
}

/**
 * Render the model-facing review request.
 * @param request - the review to open, with its durable task id.
 * @param taskId - identity assigned by the board.
 * @returns the message delivered to the reviewer.
 */
export function reviewMessage(request: ReviewRequest, taskId: string): string {
  return [
    `[REVIEW] ${taskId} "${request.subject}" is yours.`,
    'Call team_task_get for its current revision, then team_task_update with action "claim".',
    'Complete it when you approve; reopen the reviewed task when you do not.',
  ].join(' ')
}

/**
 * Render the model-facing rejection outcome.
 * @param notice - the computed retry.
 * @param taskId - the rejected task identity.
 * @returns the message delivered to the owner, or to the Lead when exhausted.
 */
export function retryMessage(notice: RetryNotice, taskId: string): string {
  if (notice.exhausted) {
    return [
      `[ESCALATE] ${taskId} was rejected ${notice.attempt} times, past the retry budget of ${notice.maxRetries}.`,
      'Stop work on it and fix nothing further.',
      'The Lead owns the next decision, and the Team mailbox refuses a message a member',
      'addresses to itself, so report the blocking defect yourself with send_message target "lead".',
    ].join(' ')
  }
  return [
    `[RETRY ${notice.attempt}/${notice.maxRetries}] ${taskId} was rejected.`,
    'Call team_task_get for the reviewer\'s blocking defect, then team_task_update with action "claim",',
    'fix exactly that defect, and complete the task again.',
  ].join(' ')
}
