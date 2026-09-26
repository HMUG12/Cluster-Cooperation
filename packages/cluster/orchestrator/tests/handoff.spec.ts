/** Ownership handoff: assigning a released task to the owner it declares. */

import { describe, expect, it } from 'vitest'
import type { TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import { declaredOwner, handoffMessage, ownershipHandoffs } from '../src/handoff.ts'

/** Build one board row with only the fields a handoff reads. */
function task(
  id: string,
  status: TeamTaskView['status'],
  description: string,
  blockedBy: string[] = [],
  ownerName?: string,
  revision = 1,
): TeamTaskView {
  return {
    id: id as TeamTaskView['id'],
    revision,
    subject: `subject-${id}`,
    description,
    status,
    blockedBy: blockedBy as TeamTaskView['blockedBy'],
    writeScopes: [],
    ready: status === 'pending' && blockedBy.length === 0,
    writeScopeWarnings: [],
    ...ownerName === undefined ? {} : { ownerName },
  } as TeamTaskView
}

const MEMBERS = ['lead', 'coder', 'tester']

describe('declaredOwner', () => {
  it('reads the member a description declares', () => {
    expect(declaredOwner(task('task-2', 'pending', 'Synthesis.\ncluster-owner: tester\nMore.'))).toBe('tester')
  })

  it('tolerates surrounding whitespace', () => {
    expect(declaredOwner(task('task-2', 'pending', 'cluster-owner:   tester  '))).toBe('tester')
  })

  it('reports no owner for a row without the marker, or with an empty one', () => {
    expect(declaredOwner(task('task-2', 'pending', 'no declaration here'))).toBeUndefined()
    expect(declaredOwner(task('task-2', 'pending', 'cluster-owner:   '))).toBeUndefined()
  })
})

describe('ownershipHandoffs', () => {
  it('assigns a released task to the owner it declares', () => {
    const board = [
      task('task-1', 'completed', 'Question.'),
      task('task-2', 'pending', 'Synthesis.\ncluster-owner: tester', ['task-1'], undefined, 4),
    ]
    expect(ownershipHandoffs(board, 'task-1', MEMBERS)).toEqual([{
      taskId: 'task-2',
      revision: 4,
      subject: 'subject-task-2',
      ownerName: 'tester',
    }])
  })

  it('leaves an already-owned row to the ordinary readiness rule', () => {
    const board = [task('task-1', 'completed', ''), task('task-2', 'pending', 'x', ['task-1'], 'coder')]
    expect(ownershipHandoffs(board, 'task-1', MEMBERS)).toEqual([])
  })

  it('waits while another blocker is still open', () => {
    const board = [
      task('task-1', 'completed', ''),
      task('task-3', 'in_progress', ''),
      task('task-2', 'pending', 'cluster-owner: tester', ['task-1', 'task-3']),
    ]
    expect(ownershipHandoffs(board, 'task-1', MEMBERS)).toEqual([])
  })

  it('refuses a declaration the roster does not carry', () => {
    const board = [task('task-1', 'completed', ''), task('task-2', 'pending', 'cluster-owner: ghost', ['task-1'])]
    expect(ownershipHandoffs(board, 'task-1', MEMBERS)).toEqual([])
  })

  it('ignores a task the completed one does not block, and a non-completed release', () => {
    const board = [task('task-1', 'completed', ''), task('task-2', 'pending', 'cluster-owner: tester', ['task-9'])]
    expect(ownershipHandoffs(board, 'task-1', MEMBERS)).toEqual([])
    expect(ownershipHandoffs([task('task-1', 'in_progress', '')], 'task-1', MEMBERS)).toEqual([])
  })

  it('collects every released declaration in board order', () => {
    const board = [
      task('task-1', 'completed', ''),
      task('task-2', 'pending', 'cluster-owner: tester', ['task-1']),
      task('task-3', 'pending', 'cluster-owner: coder', ['task-1']),
      task('task-4', 'pending', 'cluster-owner: tester', ['task-1', 'task-3']),
    ]
    expect(ownershipHandoffs(board, 'task-1', MEMBERS).map(handoff => handoff.taskId)).toEqual(['task-2', 'task-3'])
  })
})

describe('handoffMessage', () => {
  it('names the task, the assignment, and the exact board calls', () => {
    const message = handoffMessage({
      taskId: 'task-2',
      revision: 1,
      subject: 'synthesize the answers',
      ownerName: 'tester',
    })
    expect(message).toContain('[TASK READY] task-2 "synthesize the answers" is unblocked and now assigned to you')
    expect(message).toContain('team_task_get task-2')
    expect(message).toContain('team_task_update task-2')
    expect(message).toContain('report the outcome to the Lead')
  })
})
