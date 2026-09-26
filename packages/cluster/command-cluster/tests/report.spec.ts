/** Cluster reporting: what the command shows, and what it refuses to guess. */

import { describe, expect, it } from 'vitest'
import type { TeamMemberView, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import {
  clusterAgents,
  clusterGraph,
  clusterStatus,
  clusterTasks,
  parseClusterCommand,
} from '../src/report.ts'

/** Build one roster row with only the fields the report reads. */
function member(
  name: string,
  role: TeamMemberView['role'],
  status: TeamMemberView['status'] = 'idle',
  extra: Partial<TeamMemberView> = {},
): TeamMemberView {
  return { id: name as TeamMemberView['id'], name, role, status, diagnostics: [], ...extra } as TeamMemberView
}

/** Build one board row with only the fields the report reads. */
function task(
  id: string,
  status: TeamTaskView['status'],
  options: { ready?: boolean; blockedBy?: string[]; ownerName?: string; subject?: string } = {},
): TeamTaskView {
  return {
    id: id as TeamTaskView['id'],
    revision: 1,
    subject: options.subject ?? `subject-${id}`,
    description: '',
    status,
    blockedBy: (options.blockedBy ?? []) as TeamTaskView['blockedBy'],
    writeScopes: [],
    ...options.ownerName === undefined ? {} : { ownerName: options.ownerName },
    ready: options.ready ?? false,
    writeScopeWarnings: [],
  } as TeamTaskView
}

const ROSTER = [
  member('lead', 'lead', 'running'),
  member('coder', 'teammate', 'idle'),
  member('tester', 'teammate', 'running'),
  member('broken', 'teammate', 'failed'),
]

describe('parseClusterCommand', () => {
  it('defaults to the status report', () => {
    expect(parseClusterCommand('')).toEqual({ kind: 'run', subcommand: 'status' })
    expect(parseClusterCommand('  ')).toEqual({ kind: 'run', subcommand: 'status' })
  })

  it('reads one sub-command, case-insensitively', () => {
    for (const subcommand of ['status', 'tasks', 'agents', 'graph'] as const) {
      expect(parseClusterCommand(` ${subcommand.toUpperCase()} `)).toEqual({ kind: 'run', subcommand })
    }
  })

  it('refuses anything else with the usage line instead of guessing', () => {
    const refused = parseClusterCommand('cost')
    expect(refused.kind).toBe('refused')
    if (refused.kind !== 'refused') return
    expect(refused.reason).toContain('/cluster cost')
    expect(refused.reason).toContain('Usage: /cluster [status|tasks|agents|graph]')
  })
})

describe('clusterStatus', () => {
  it('counts the roster, the reachable teammates, and the board by status', () => {
    const report = clusterStatus('main', ROSTER, [
      task('task-1', 'completed'),
      task('task-2', 'in_progress', { ownerName: 'coder' }),
      task('task-3', 'pending', { ready: true }),
      task('task-4', 'pending', { blockedBy: ['task-3'] }),
    ])
    expect(report).toContain('Cluster: main')
    // The Lead is on the roster but is not one of the teammates counted here.
    expect(report).toContain('Members: 4 (lead + 3 teammates) — running 1, idle 1, failed 1')
    // A failed teammate is on the roster but cannot be reached.
    expect(report).toContain('Reachable: 2 of 3 teammates')
    expect(report).toContain('Tasks: 4 — in_progress 1, pending 2, completed 1')
    expect(report).toContain('Pending: 1 ready, 1 waiting on a blocker')
  })

  it('says nothing rather than zero when the board is empty', () => {
    const report = clusterStatus('solo', [member('lead', 'lead', 'running')], [])
    expect(report).toContain('Members: 1 (lead + 0 teammates)')
    expect(report).toContain('Tasks: 0 — ')
    expect(report).toContain('Pending: 0 ready, 0 waiting on a blocker')
  })
})

describe('clusterTasks', () => {
  it('names the owner, the readiness, and every blocker of one row', () => {
    const report = clusterTasks([
      task('task-1', 'completed', { subject: 'Ballot: Adopt X', ownerName: 'coder' }),
      task('task-2', 'pending', { subject: 'Tally: Adopt X', ownerName: 'reviewer', blockedBy: ['task-1'] }),
      task('task-3', 'pending', { subject: 'free work', ready: true }),
    ])
    expect(report).toContain('task-1 [completed] Ballot: Adopt X — owner coder')
    expect(report).toContain('task-2 [pending] Tally: Adopt X — owner reviewer (waiting, blocked by task-1)')
    expect(report).toContain('task-3 [pending] free work — unowned (ready)')
  })

  it('says the board is empty instead of printing nothing', () => {
    expect(clusterTasks([])).toBe('The shared board holds no task.')
  })
})

describe('clusterAgents', () => {
  it('lists the Lead first with each member status and model', () => {
    const report = clusterAgents([
      member('lead', 'lead', 'running'),
      member('coder', 'teammate', 'idle', { model: 'coder-model' }),
      member('broken', 'teammate', 'failed', { diagnostics: ['provisioning failed'] }),
    ])
    expect(report.split('\n')).toEqual([
      'lead [running] lead',
      'coder [idle] teammate, coder-model',
      'broken [failed] teammate — provisioning failed',
    ])
  })
})

describe('clusterGraph', () => {
  it('renders one edge per blocker', () => {
    const report = clusterGraph([
      task('task-1', 'completed'),
      task('task-2', 'pending', { subject: 'Tally', blockedBy: ['task-1', 'task-9'] }),
    ])
    expect(report).toBe('task-2 Tally ← task-1, task-9')
  })

  it('says the board holds no edge when nothing waits', () => {
    expect(clusterGraph([task('task-1', 'completed')])).toBe('No shared task waits on another.')
  })
})
