/** The panel's content, decided without a browser. */

import { describe, expect, it } from 'vitest'
import { clusterPanel } from '../src/client/panel.ts'
import { zh, type ClusterKey } from '../src/client/locales.ts'
import { clusterOverview } from '../src/overview.ts'
import type { ClusterTaskKind, ClusterOverview } from '../src/types.ts'
import type { TeamMemberView, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import { TeamTaskId } from '@deepseek-ai/dsh-experimental-agent-team'

const t = (key: ClusterKey): string => zh[key]

function member(name: string, role: TeamMemberView['role'], extra: Partial<TeamMemberView> = {}): TeamMemberView {
  return { id: name as TeamMemberView['id'], name, role, status: 'idle', diagnostics: [], ...extra }
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

function classify(subject: string): ClusterTaskKind {
  if (subject.startsWith('Ballot: ')) return 'ballot'
  if (subject.startsWith('Tally: ')) return 'tally'
  return 'task'
}

function view(overrides: Partial<Parameters<typeof clusterOverview>[0]> = {}): ClusterOverview {
  return clusterOverview({
    view: {
      members: [member('coder', 'teammate'), member('lead', 'lead', { status: 'running' })],
      tasks: [
        task('task-1', 'Ballot: adopt the schema', { ownerName: 'coder' }),
        task('task-2', 'wire the endpoint', { ready: false, blockedBy: [TeamTaskId('task-1')] }),
      ],
    },
    ...overrides,
  })
}

describe('clusterPanel', () => {
  it('renders the roster, the board, and the spend, in that order', () => {
    const panel = clusterPanel(view(), t)
    expect(panel.title).toBe('集群')
    expect(panel.sections.map(section => section.key)).toEqual(['roster', 'board', 'spend'])
    expect(panel.sections.map(section => section.title)).toEqual(['成员', '任务', '花费'])
  })

  it('keeps the view ordering and states each row through the dictionary', () => {
    const panel = clusterPanel(view(), t)
    const roster = panel.sections[0]
    expect(roster?.rows.map(row => row.label)).toEqual(['lead', 'coder'])
    expect(roster?.rows[0]?.status).toBe('运行中')
    expect(roster?.rows[0]?.detail).toBe('Lead')
  })

  it('labels a task by the kind the host decided, and marks waiting rows', () => {
    const panel = clusterPanel(view({ classify }), t)
    const board = panel.sections[1]
    expect(board?.rows.map(row => row.detail)).toEqual([
      '选票 · coder',
      '普通任务 · 未分配 · 被阻塞',
    ])
    expect(board?.rows.map(row => row.status)).toEqual(['待处理', '待处理'])
  })

  it('says a section is empty instead of rendering nothing', () => {
    const panel = clusterPanel(clusterOverview({ view: { members: [], tasks: [] } }), t)
    for (const section of panel.sections) expect(section.rows).toEqual([])
    expect(panel.sections.map(section => section.empty)).toEqual([
      '还没有成员',
      '还没有任务',
      '还没有成员花过模型调用',
    ])
  })

  it('states spend with its budget and flags the rows past it', () => {
    const panel = clusterPanel(view({
      spend: [
        { name: 'coder', calls: 3, billable: 1050, budget: 1000, overBudget: true },
        { name: 'tester', calls: 1, billable: 12 },
      ],
    }), t)
    const spend = panel.sections[2]
    expect(spend?.rows.map(row => row.detail)).toEqual([
      '1050 可计费 token · 3 次调用 · 预算 1000',
      '12 可计费 token · 1 次调用',
    ])
    expect(spend?.rows.map(row => row.status)).toEqual(['已超预算', ''])
  })

  it('adds the protocol line only when the view carries kinds', () => {
    const withKinds = clusterPanel(view({ classify }), t)
    expect(withKinds.summary).toEqual([
      '成员 2 · 任务 2 · 可开始 1 · 被阻塞 1',
      ' · 选票 1 · 计票 0 · 发言 0 · 裁决 0 · 普通任务 1',
    ])
    expect(clusterPanel(view(), t).summary).toHaveLength(1)
  })

  it('names the declared cluster beside the title when one is declared', () => {
    expect(clusterPanel(view({ clusterName: 'demo' }), t).title).toBe('集群 · demo')
  })

  it('spells no copy of its own: the copy it renders is all dictionary keys', () => {
    const keys = new Set(Object.keys(zh))
    // Echoing each key back means a literal that skipped the dictionary would
    // show up as itself. Counts, group titles, empty notices, and row states are
    // pure copy; row details also carry roster and board content, where the key
    // type already makes a missing dictionary entry a compile error.
    const panel = clusterPanel(
      view({ classify, spend: [{ name: 'coder', calls: 1, billable: 2, budget: 3 }] }),
      key => key,
    )
    const copy = [
      ...panel.summary,
      ...panel.sections.flatMap(section => [
        section.title,
        section.empty,
        ...section.rows.map(row => row.status),
      ]),
    ]
    for (const text of copy) {
      for (const token of text.split(' · ').flatMap(part => part.split(' '))) {
        if (token === '' || /^\d+$/u.test(token)) continue
        expect(keys.has(token), `${token} is not a dictionary key`).toBe(true)
      }
    }
  })
})
