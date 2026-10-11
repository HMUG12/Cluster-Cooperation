// @vitest-environment jsdom
/** The cluster header action, rendered: when it reads, what it shows, and how it fails. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import { ClusterPanel, type ClusterConfiguration, type ClusterSaveResult, type ClusterSpawnResult } from '../src/client/ClusterPanel.tsx'
import { zh, type ClusterKey } from '../src/client/locales.ts'
import type { ClusterOverview } from '../src/types.ts'

const SESSION = 'cluster-session' as SessionId

const t = (key: ClusterKey): string => zh[key]

function read(): ClusterOverview {
  return {
    configured: true,
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

/** A call the case did not supply, so an unexpected one fails loudly. */
function absent(code: string): never {
  throw new Error(`unexpected remote call: ${code}`)
}

/** The framework supplies `sessionId` and the translator; only the calls are ours. */
function panel(
  load: (sessionId: SessionId) => Promise<RemoteResult<ClusterOverview>>,
  document: {
    read?: () => Promise<RemoteResult<ClusterConfiguration>>
    save?: (text: string) => Promise<RemoteResult<ClusterSaveResult>>
  } = {},
  members: {
    spawn?: () => Promise<RemoteResult<ClusterSpawnResult>>
  } = {},
) {
  const readConfiguration = () => document.read?.() ?? absent('readConfiguration')
  const saveConfiguration = (_sessionId: SessionId, text: string) => document.save?.(text) ?? absent('saveConfiguration')
  const spawnDeclared = () => members.spawn?.() ?? absent('spawnDeclared')
  const props = {
    sessionId: SESSION,
    load,
    readConfiguration,
    saveConfiguration,
    spawnDeclared,
    t,
  } as unknown as Parameters<typeof ClusterPanel>[0]
  return render(<ClusterPanel {...props} />)
}

/** Open the panel, which is the only thing that triggers a read. */
async function openPanel(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: '集群' }))
  await screen.findByText('成员')
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

  it('says a cluster without a document is not started yet', async () => {
    const load = vi.fn(() => Promise.resolve({ ok: true as const, value: { ...read(), configured: false } }))
    panel(load)
    await openPanel()
    expect(screen.getByText(zh.unconfigured)).toBeDefined()
  })

  it('reads no document until the settings are opened', async () => {
    const readDocument = vi.fn(() => Promise.resolve({ ok: true as const, value: { configured: true, text: 'version: 1\n' } }))
    panel(() => Promise.resolve({ ok: true as const, value: read() }), { read: readDocument })
    await openPanel()
    expect(readDocument).not.toHaveBeenCalled()
  })

  it('shows the text the host formatted, and says a first document is not saved yet', async () => {
    const text = 'version: 1\nclusters: {}\n'
    panel(() => Promise.resolve({ ok: true as const, value: read() }), {
      read: () => Promise.resolve({ ok: true as const, value: { configured: false, text } }),
    })
    await openPanel()
    fireEvent.click(screen.getByRole('button', { name: '设置集群' }))
    const area = await screen.findByLabelText('新集群文档（尚未保存）')
    expect((area as HTMLTextAreaElement).value).toBe(text)
  })

  it('sends the edited text and reports the host reason when a save is refused', async () => {
    const send = vi.fn((_text: string) => Promise.resolve({ ok: true as const, value: { saved: false, reason: 'clusters.crew.topology: unknown value' } as ClusterSaveResult }))
    panel(() => Promise.resolve({ ok: true as const, value: read() }), {
      read: () => Promise.resolve({ ok: true as const, value: { configured: true, text: 'version: 1\n' } }),
      save: send,
    })
    await openPanel()
    fireEvent.click(screen.getByRole('button', { name: '设置集群' }))
    const area = await screen.findByLabelText('集群文档')
    fireEvent.change(area, { target: { value: 'version: 2\n' } })
    fireEvent.click(screen.getByRole('button', { name: '保存文档' }))
    expect(await screen.findByText('clusters.crew.topology: unknown value')).toBeDefined()
    expect(send).toHaveBeenCalledWith('version: 2\n')
  })

  it('confirms a save that lands, and then treats the document as one that exists', async () => {
    const send = vi.fn(() => Promise.resolve({ ok: true as const, value: { saved: true } as ClusterSaveResult }))
    panel(() => Promise.resolve({ ok: true as const, value: read() }), {
      read: () => Promise.resolve({ ok: true as const, value: { configured: false, text: 'version: 1\n' } }),
      save: send,
    })
    await openPanel()
    fireEvent.click(screen.getByRole('button', { name: '设置集群' }))
    await screen.findByLabelText('新集群文档（尚未保存）')
    fireEvent.click(screen.getByRole('button', { name: '保存文档' }))
    expect(await screen.findByText('已保存')).toBeDefined()
    expect(screen.getByLabelText('集群文档')).toBeDefined()
  })

  it('brings the declared members up, reports each outcome, and reads the roster again', async () => {
    const bring = vi.fn(() => Promise.resolve({
      ok: true as const,
      value: {
        spawned: ['coder'],
        skipped: [{ name: 'reviewer', reason: 'already on the roster' }],
      } as ClusterSpawnResult,
    }))
    const load = vi.fn(() => Promise.resolve({ ok: true as const, value: read() }))
    panel(load, {}, { spawn: bring })
    await openPanel()
    fireEvent.click(screen.getByRole('button', { name: '拉起声明成员' }))
    const line = await screen.findByText(/已拉起：coder/u)
    expect(line.textContent).toContain('未拉起：reviewer (already on the roster)')
    expect(bring).toHaveBeenCalledTimes(1)
    // A spawn changes the roster, so the view is re-read before the line settles.
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('says there was nobody left to bring up', async () => {
    const bring = vi.fn(() => Promise.resolve({
      ok: true as const,
      value: { spawned: [], skipped: [] } as ClusterSpawnResult,
    }))
    panel(() => Promise.resolve({ ok: true as const, value: read() }), {}, { spawn: bring })
    await openPanel()
    fireEvent.click(screen.getByRole('button', { name: '拉起声明成员' }))
    expect(await screen.findByText('没有新成员可拉起')).toBeDefined()
  })
})
