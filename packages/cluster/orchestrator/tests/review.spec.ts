/** Review-loop arithmetic: when a completion owes a review, and what a rejection owes back. */

import { describe, expect, it } from 'vitest'
import type { TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import {
  REVIEW_SUBJECT_PREFIX,
  isReviewTask,
  retryMessage,
  retryNotice,
  reviewMessage,
  reviewedTaskOf,
  reviewRequest,
} from '../src/review.ts'

/** Build one board row; `description` carries the review marker when supplied. */
function task(
  id: string,
  status: TeamTaskView['status'],
  subject: string,
  ownerName?: string,
  description = '',
  writeScopes: string[] = [],
): TeamTaskView {
  return {
    id: id as TeamTaskView['id'],
    revision: 1,
    subject,
    description,
    status,
    blockedBy: [],
    writeScopes,
    ready: false,
    writeScopeWarnings: [],
    ...ownerName === undefined ? {} : { ownerName },
  } as TeamTaskView
}

/** Build the review row this loop would have opened for one task. */
function reviewOf(id: string, reviewedId: string): TeamTaskView {
  return task(id, 'in_progress', `${REVIEW_SUBJECT_PREFIX}work`, 'reviewer', `cluster-review-of: ${reviewedId}`)
}

describe('markers', () => {
  it('recognises a review row and recovers the task it reviews', () => {
    const review = reviewOf('task-9', 'task-3')
    expect(isReviewTask(review)).toBe(true)
    expect(reviewedTaskOf(review)).toBe('task-3')
    expect(reviewedTaskOf(task('task-1', 'completed', 'work', 'coder'))).toBeUndefined()
  })
})

describe('reviewRequest', () => {
  it('opens a review owned by the declared reviewer and inherits the write scopes', () => {
    const board = [task('task-1', 'completed', 'wire the endpoint', 'coder', '', ['src/server/'])]
    const request = reviewRequest(board, 'task-1', 'reviewer')
    expect(request).toMatchObject({
      subject: `${REVIEW_SUBJECT_PREFIX}wire the endpoint`,
      ownerName: 'reviewer',
      writeScopes: ['src/server/'],
    })
    expect(request?.description).toContain('cluster-review-of: task-1')
    expect(request?.description).toContain('Original owner: coder')
    expect(request?.description).toContain('action "reopen"')
  })

  it('never reviews a review, its own reviewer, or an unreviewed state', () => {
    const board = [
      reviewOf('task-2', 'task-1'),
      task('task-1', 'completed', 'work', 'coder'),
      task('task-3', 'completed', 'self', 'reviewer'),
      task('task-4', 'in_progress', 'unfinished', 'coder'),
    ]
    expect(reviewRequest(board, 'task-2', 'reviewer')).toBeUndefined()
    expect(reviewRequest(board, 'task-3', 'reviewer')).toBeUndefined()
    expect(reviewRequest(board, 'task-4', 'reviewer')).toBeUndefined()
  })

  it('stays silent when that completion was already reviewed', () => {
    const board = [task('task-1', 'completed', 'work', 'coder'), reviewOf('task-2', 'task-1')]
    expect(reviewRequest(board, 'task-1', 'reviewer')).toBeUndefined()
  })
})

describe('retryNotice', () => {
  it('counts each opened review as one rejection', () => {
    const board = [
      task('task-1', 'pending', 'work', 'coder'),
      reviewOf('task-2', 'task-1'),
      reviewOf('task-3', 'task-1'),
    ]
    expect(retryNotice(board, 'task-1', 2)).toEqual({
      ownerName: 'coder',
      attempt: 2,
      exhausted: false,
      maxRetries: 2,
    })
  })

  it('escalates once the budget is spent', () => {
    const board = [
      task('task-1', 'in_progress', 'work', 'coder'),
      reviewOf('task-2', 'task-1'),
      reviewOf('task-3', 'task-1'),
      reviewOf('task-4', 'task-1'),
    ]
    expect(retryNotice(board, 'task-1', 2)?.exhausted).toBe(true)
  })

  it('ignores a task that was never reviewed, is completed, or vanished', () => {
    const board = [task('task-1', 'in_progress', 'work', 'coder'), task('task-2', 'completed', 'done', 'coder')]
    expect(retryNotice(board, 'task-1', 2)).toBeUndefined()
    expect(retryNotice([...board, reviewOf('task-3', 'task-2')], 'task-2', 2)).toBeUndefined()
    expect(retryNotice(board, 'task-9', 2)).toBeUndefined()
  })
})

describe('messages', () => {
  it('names the review task and both verdict paths', () => {
    const request = { subject: 'Review: work', description: '', ownerName: 'reviewer', writeScopes: [] }
    const message = reviewMessage(request, 'task-7')
    expect(message).toContain('[REVIEW] task-7')
    expect(message).toContain('"claim"')
    expect(message).toContain('reopen the reviewed task')
  })

  it('states the attempt against the budget, and escalates when spent', () => {
    expect(retryMessage({ ownerName: 'coder', attempt: 1, exhausted: false, maxRetries: 2 }, 'task-1'))
      .toContain('[RETRY 1/2]')
    const escalation = retryMessage({ ownerName: 'coder', attempt: 3, exhausted: true, maxRetries: 2 }, 'task-1')
    expect(escalation).toContain('[ESCALATE]')
    // The Lead cannot be addressed by the Lead, so the owner carries the report.
    expect(escalation).toContain('send_message target "lead"')
  })
})
