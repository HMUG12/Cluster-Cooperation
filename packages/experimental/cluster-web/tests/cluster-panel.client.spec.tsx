// @vitest-environment jsdom
/** The cluster header action, rendered: when it reads, what it shows, and how it fails. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import { ClusterPanel } from '../src/client/ClusterPanel.tsx'
import { zh, type ClusterKey } from '../src/client/locales.ts'
import type { ClusterOverview } from '../src/types.ts'

const SESSION = 'cluster-session' as SessionId

const t = (key: ClusterKey): string => zh[key]

function read(): ClusterOverview {
  return {
    clusterName: 'demo',
    members: [{ name: 'lead', role: 'lead', status: 'running' }],
    tasks: [{
      id: 'task-1',
      subject: 'Ballot: adopt the schema',
      status: 'pending',
      ready: true,
      blockedBy: [],
      kind: 'ballot',
    }],
    spend: [{ name: 'coder', calls: 3, billable: 1050, budget: 1000, overBudget: true }],
    counts: {
      members: 1,
      tasks: 1,
      ready: 1,
      blocked: 0,
      byKind: { ballot: 1, tally: 0, speech: 0, verdict: 0, task: 0 },
    },
  }
}

/** The framework supplies `sessionId` and the translator; only the reader is ours. */
function panel(load: (sessionId: SessionId) => Promise<RemoteResult<ClusterOverview>>) {
  const props = { sessionId: SESSION, load, t } as unknown as Parameters<typeof ClusterPanel>[0]
  return render(<ClusterPanel {...props} />)
}

// This workspace imports vitest explicitly, so Testing Library's automatic
// cleanup is never registered: each case has to unmount the previous render.
afterEach(cleanup)

describe('ClusterPanel', () => {
  it('reads nothing until the action is opened', () => {
    const load = vi.fn(() => Promise.resolve({ ok: true as const, value: read() }))
    panel(load)
    expect(load).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { expanded: false })).toBeDefined()
  })

  it('reads on demand and lays out the roster, the board, and the spend', async () => {
    const load = vi.fn(() => Promise.resolve({ ok: true as const, value: read() }))
    panel(load)
    fireEvent.click(screen.getByRole('button', { name: '集群' }))
    expect(await screen.findByText('成员')).toBeDefined()
    expect(load).toHaveBeenCalledTimes(1)
    expect(screen.getByText('lead')).toBeDefined()
    expect(screen.getByText('Ballot: adopt the schema')).toBeDefined()
    expect(screen.getByText('选票 · 未分配')).toBeDefined()
    expect(screen.getByText('1050 可计费 token · 3 次调用 · 预算 1000')).toBeDefined()
    expect(screen.getByText('已超预算')).toBeDefined()
    expect(screen.getByText('集群 · demo')).toBeDefined()
  })

  it('states the counts and the protocol line the view carries', async () => {
    const load = vi.fn(() => Promise.resolve({ ok: true as const, value: read() }))
    panel(load)
    fireEvent.click(screen.getByRole('button', { name: '集群' }))
    expect(await screen.findByText('成员 1 · 任务 1 · 可开始 1 · 被阻塞 0 · 选票 1 · 计票 0 · 发言 0 · 裁决 0 · 普通任务 0')).toBeDefined()
  })

  it('shows the failure line and no counts when the read fails', async () => {
    const failure = { ok: false as const, error: { code: 'gateway/internal', message: 'offline' } }
    const load = vi.fn(async () => failure as unknown as RemoteResult<ClusterOverview>)
    panel(load)
    fireEvent.click(screen.getByRole('button', { name: '集群' }))
    expect(await screen.findByText('offline (gateway/internal)')).toBeDefined()
    expect(screen.queryByText('成员')).toBeNull()
  })

  it('reads again when the action asks for a refresh', async () => {
    const load = vi.fn(() => Promise.resolve({ ok: true as const, value: read() }))
    panel(load)
    fireEvent.click(screen.getByRole('button', { name: '集群' }))
    await screen.findByText('成员')
    fireEvent.click(screen.getByRole('button', { name: '刷新集群' }))
    expect(load).toHaveBeenCalledTimes(2)
  })
})
