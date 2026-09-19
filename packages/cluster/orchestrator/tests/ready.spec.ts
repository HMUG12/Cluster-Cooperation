/** Readiness arithmetic: which owners a single completion must wake. */

import { describe, expect, it } from 'vitest'
import type { TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import { readyMessage, readyNotices } from '../src/ready.ts'

/** Build one board row with only the fields readiness reads. */
function task(
  id: string,
  status: TeamTaskView['status'],
  blockedBy: string[] = [],
  ownerName?: string,
): TeamTaskView {
  return {
    id: id as TeamTaskView['id'],
    revision: 1,
    subject: `subject-${id}`,
    description: `description-${id}`,
    status,
    blockedBy: blockedBy as TeamTaskView['blockedBy'],
    writeScopes: [],
    ready: status === 'pending' && blockedBy.length === 0,
    writeScopeWarnings: [],
    ...ownerName === undefined ? {} : { ownerName },
  } as TeamTaskView
}

describe('readyNotices', () => {
  it('wakes the owner of a task whose only blocker just completed', () => {
    const board = [task('task-1', 'completed', [], 'tester'), task('task-2', 'pending', ['task-1'], 'coder')]
    expect(readyNotices(board, 'task-1')).toEqual([{
      taskId: 'task-2',
      subject: 'subject-task-2',
      ownerName: 'coder',
      completedTaskId: 'task-1',
      satisfiedBy: ['task-1'],
    }])
  })

  it('stays silent while another blocker is still open', () => {
    const board = [
      task('task-1', 'completed'),
      task('task-2', 'in_progress', [], 'tester'),
      task('task-3', 'pending', ['task-1', 'task-2'], 'coder'),
    ]
    expect(readyNotices(board, 'task-1')).toEqual([])
  })

  it('reports every satisfied blocker once the last one lands', () => {
    const board = [
      task('task-1', 'completed'),
      task('task-2', 'completed'),
      task('task-3', 'pending', ['task-1', 'task-2'], 'coder'),
    ]
    expect(readyNotices(board, 'task-2')).toEqual([{
      taskId: 'task-3',
      subject: 'subject-task-3',
      ownerName: 'coder',
      completedTaskId: 'task-2',
      satisfiedBy: ['task-1', 'task-2'],
    }])
  })

  it('ignores a completion that blocks nothing, an owned-less task, and a non-completed event', () => {
    const board = [
      task('task-1', 'completed'),
      task('task-2', 'pending', ['task-1'], 'coder'),
      task('task-3', 'pending', ['task-1']),
    ]
    // A different completion releases nobody, and a task without an owner has
    // no mailbox to wake.
    expect(readyNotices([...board, task('task-4', 'completed')], 'task-4')).toEqual([])
    expect(readyNotices(board, 'task-1').map(notice => notice.taskId)).toEqual(['task-2'])
  })

  it('is idempotent for a replayed completion of an already-completed task', () => {
    const board = [task('task-1', 'completed'), task('task-2', 'in_progress', ['task-1'], 'coder')]
    // Claiming task-2 closes the window: replaying task-1 changes nothing.
    expect(readyNotices(board, 'task-1')).toEqual([])
  })

  it('rejects a completion the board does not carry', () => {
    expect(readyNotices([task('task-1', 'pending', [], 'coder')], 'task-9')).toEqual([])
  })
})

describe('readyMessage', () => {
  it('names the task, the releasing completion, and the exact board calls', () => {
    const message = readyMessage({
      taskId: 'task-2',
      subject: 'wire the endpoint',
      ownerName: 'coder',
      completedTaskId: 'task-1',
      satisfiedBy: ['task-1'],
    })
    expect(message).toContain('[TASK READY] task-2 "wire the endpoint" is unblocked')
    expect(message).toContain('task-1 completed')
    expect(message).toContain('team_task_get task-2')
    expect(message).toContain('team_task_update task-2')
  })
})
