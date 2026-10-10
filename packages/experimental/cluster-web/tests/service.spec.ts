/** The cluster view service: what it answers, and which document writes it refuses. */

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import ClusterConfig from '@deepseek-ai/dsh-cluster-config'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import type { TeamMemberView, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import ClusterWeb from '../src/index.ts'

/**
 * The narrow Team surface this service reads.
 *
 * The service only lists, so the rows a test wants are set directly rather than
 * grown through a real Team.
 */
class TeamStub extends Service {
  /** Roster the next read returns. */
  members: TeamMemberView[] = []
  /** Board the next read returns. */
  tasks: TeamTaskView[] = []

  constructor(ctx: Context) {
    super(ctx, 'agentTeams')
  }

  listMembers(): TeamMemberView[] {
    return this.members
  }

  listTasks(): TeamTaskView[] {
    return this.tasks
  }
}

/** Build one roster row with only the fields the service reads. */
function member(name: string): TeamMemberView {
  return { id: name as TeamMemberView['id'], name, role: 'teammate', status: 'idle', diagnostics: [] } as TeamMemberView
}

/** Build a live agent the service accepts as the caller. */
function stubAgent(ctx: Context): Agent {
  const session = ctx.sessions.create(SessionId(`cluster-web-service-${Math.random()}`))
  return {
    id: session.id,
    options: {},
    session,
    inbox: { append: () => {} },
    ctx: new Context(),
    status: 'idle',
    send: () => {},
    followup: () => {},
    steer: () => {},
    inject: () => {},
    cancel: () => {},
    runMaintenance: (work: (signal: AbortSignal) => unknown) => work(new AbortController().signal),
    whenIdle: () => Promise.resolve(),
  } as unknown as Agent
}

/** A document a test can write, and the cluster it declares. */
const DOCUMENT = [
  'version: 1',
  'defaultCluster: crew',
  'clusters:',
  '  crew:',
  '    topology: star',
  '    lead: {}',
  '    members:',
  '      - name: worker',
  '',
].join('\n')

interface Harness {
  readonly web: ClusterWeb
  readonly agent: Agent
  readonly team: TeamStub
  readonly file: string
  readonly ctx: Context
}

/**
 * Mount the real view service over a real configuration document.
 *
 * The configuration service is the real one because the write path is only as
 * good as the schema owner it delegates to: a stub would agree with whatever
 * this package assumed about it.
 * @param options - document text to write first, and whether to mount the declarations at all.
 * @returns the mounted service, its caller, the Team stub, and the document path.
 */
async function harness(options: { document?: string; config?: boolean } = {}): Promise<Harness> {
  const directory = mkdtempSync(join(tmpdir(), 'cluster-web-service-'))
  const file = join(directory, 'cluster.yml')
  if (options.document !== undefined) writeFileSync(file, options.document)
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(TeamStub)
  if (options.config !== false) await ctx.plugin(ClusterConfig, { file })
  await ctx.plugin(ClusterWeb)
  const agent = stubAgent(ctx)
  await ctx.agents.register(agent)
  const team = ctx.get('agentTeams') as unknown as TeamStub
  // Reading and writing the document are gated on belonging to a cluster, so the
  // mounted state is a cluster with one member; the state that belongs to none
  // sets its own empty roster.
  team.members = [member('lead')]
  return {
    ctx,
    web: ctx.get('clusterWeb') as unknown as ClusterWeb,
    agent,
    team,
    file,
  }
}

describe('the cluster view', () => {
  it('reports a cluster with no document yet without creating one', async () => {
    const test = await harness()
    expect(test.web.remoteOverview(test.agent).configured).toBe(false)
    expect(test.web.remoteReadConfiguration(test.agent)).toEqual({
      configured: false,
      text: expect.stringContaining('version: 1'),
    })
    // Handing out a starter is a read: the settings surface has something to
    // edit, and nothing exists on disk until it is saved.
    expect(existsSync(test.file)).toBe(false)
  })

  it('reports the document that exists as the file’s own text', async () => {
    const test = await harness({ document: DOCUMENT })
    expect(test.web.remoteReadConfiguration(test.agent)).toEqual({ configured: true, text: DOCUMENT })
    expect(test.web.remoteOverview(test.agent).clusterName).toBe('crew')
  })

  it('reports the roster a cluster still gets when no declarations are mounted', async () => {
    const test = await harness({ config: false })
    test.team.members = [member('lead')]
    const view = test.web.remoteOverview(test.agent)
    expect(view.members.map(row => row.name)).toEqual(['lead'])
    // Absent is not a reason to block a cluster the view cannot get an answer about.
    expect(view.configured).toBe(true)
  })
})

describe('the document write', () => {
  it('writes what a surface saved, and the next read serves it', async () => {
    const test = await harness()
    expect(test.web.remoteSaveConfiguration(test.agent, DOCUMENT)).toEqual({ saved: true })
    expect(readFileSync(test.file, 'utf8')).toContain('worker')
    expect(test.web.remoteOverview(test.agent).configured).toBe(true)
    expect(test.web.remoteReadConfiguration(test.agent)).toMatchObject({ configured: true })
  })

  it('answers a rejected field with the schema reason and leaves the file alone', async () => {
    const test = await harness({ document: DOCUMENT })
    const rejected = test.web.remoteSaveConfiguration(
      test.agent,
      'version: 1\nclusters:\n  crew:\n    topology: swarm\n',
    )
    if (rejected.saved) throw new Error('a rejected field was expected to refuse the write')
    expect(rejected.reason).toMatch(/topology/u)
    expect(readFileSync(test.file, 'utf8')).toBe(DOCUMENT)
  })

  it('answers unparseable text as a refusal rather than a failed call', async () => {
    const test = await harness({ document: DOCUMENT })
    const rejected = test.web.remoteSaveConfiguration(test.agent, 'version: 1\nclusters: [unterminated\n')
    expect(rejected.saved).toBe(false)
    expect(readFileSync(test.file, 'utf8')).toBe(DOCUMENT)
  })

  it('refuses a session that belongs to no cluster, on both the read and the write', async () => {
    const test = await harness({ document: DOCUMENT })
    test.team.members = []
    expect(() => test.web.remoteReadConfiguration(test.agent)).toThrow(/belongs to no cluster/u)
    expect(() => test.web.remoteSaveConfiguration(test.agent, DOCUMENT)).toThrow(/belongs to no cluster/u)
  })

  it('says which half is missing when the composition mounts no declarations', async () => {
    const test = await harness({ config: false })
    expect(() => test.web.remoteReadConfiguration(test.agent)).toThrow(/no cluster configuration service is mounted/u)
    const rejected = test.web.remoteSaveConfiguration(test.agent, DOCUMENT)
    if (rejected.saved) throw new Error('a composition without declarations was expected to refuse the write')
    expect(rejected.reason).toMatch(/cannot accept text/u)
  })
})
