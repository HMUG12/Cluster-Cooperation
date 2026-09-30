/** Cluster overview derivation: what a Web panel is handed, and in which order. */

import { describe, expect, it } from 'vitest'
import type { TeamMemberView, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import { TeamTaskId } from '@deepseek-ai/dsh-experimental-agent-team'
import { clusterOverview } from '../src/overview.ts'

function member(name: string, role: TeamMemberView['role'], status: TeamMemberView['status'] = 'idle'): TeamMemberView {
  return { id: name as TeamMemberView['id'], name, role, status, diagnostics: [] }
}

function task(id: string, subject: string, extra: Partial<TeamTaskView> = {}): TeamTaskView {
  return {
    id: TeamTaskId(id),
    revision: 1,
    subject,
    description: '',
    status: 'pending',
    blockedBy: [],
    writeScopes: [],
    ready: true,
    writeScopeWarnings: [],
    ...extra,
  }
}

describe('clusterOverview', () => {
  it('leads with the Lead, breaks ties by name, and orders tasks by identity', () => {
    const overview = clusterOverview({
      view: {
        members: [member('tester', 'teammate'), member('lead', 'lead', 'running'), member('coder', 'teammate')],
        tasks: [task('task-2', 'second'), task('task-1', 'first')],
      },
    })
    expect(overview.members.map(row => row.name)).toEqual(['lead', 'coder', 'tester'])
    expect(overview.members[0]?.status).toBe('running')
    expect(overview.tasks.map(row => row.id)).toEqual(['task-1', 'task-2'])
  })

  it('counts rows, ready rows, and rows that are still waiting on a blocker', () => {
    const overview = clusterOverview({
      view: {
        members: [member('lead', 'lead')],
        tasks: [
          task('task-1', 'Ballot: adopt the schema'),
          task('task-2', 'Tally: adopt the schema', { status: 'in_progress', ownerName: 'reviewer' }),
          task('task-3', 'wire the endpoint', { ready: false, blockedBy: [TeamTaskId('task-2')] }),
        ],
      },
    })
    expect(overview.counts).toEqual({ members: 1, tasks: 3, ready: 2, blocked: 1 })
    expect(overview.tasks[1]).toMatchObject({ id: 'task-2', owner: 'reviewer', status: 'in_progress' })
    expect(overview.tasks[2]?.blockedBy).toEqual(['task-2'])
    expect(overview.tasks[2]).not.toHaveProperty('owner')
  })

  it('carries the declared name and the folded spend through, and defaults spend to empty', () => {
    const spend = [{ name: 'coder', calls: 3, billable: 1050, budget: 1000, overBudget: true }]
    const overview = clusterOverview({
      clusterName: 'demo',
      view: { members: [], tasks: [] },
      spend,
    })
    expect(overview.clusterName).toBe('demo')
    expect(overview.spend).toEqual(spend)
    expect(clusterOverview({ view: { members: [], tasks: [] } }).spend).toEqual([])
  })

  it('omits the declared name when no composition declares one', () => {
    expect('clusterName' in clusterOverview({ view: { members: [], tasks: [] } })).toBe(false)
  })

  it('carries a member route through when the roster reports one', () => {
    const withModel = clusterOverview({
      view: { members: [{ ...member('coder', 'teammate'), model: 'mock-b/coder-model' }], tasks: [] },
    })
    expect(withModel.members[0]).toMatchObject({ name: 'coder', model: 'mock-b/coder-model' })
  })
})
