/** `/cluster` wiring: the registration a UI sees, and the report it dispatches. */

import { describe, expect, it } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import CommandRuntime from '@deepseek-ai/dsh-commands'
import type { CommandResult } from '@deepseek-ai/dsh-commands'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import type { TeamMemberView, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import * as commandCluster from '@deepseek-ai/dsh-command-cluster'

/**
 * The narrow Team surface this command reads.
 *
 * The command only lists, so a two-field service is the whole contract, and the
 * rows a test wants are set directly rather than grown through a real Team.
 */
class TeamStub extends Service {
  /** Rows the next read returns. */
  members: TeamMemberView[] = []
  /** Rows the next read returns. */
  tasks: TeamTaskView[] = []
  /** Rows the next read refuses with. */
  failure: Error | undefined

  constructor(ctx: Context) {
    super(ctx, 'agentTeams')
  }

  listMembers(): TeamMemberView[] {
    if (this.failure !== undefined) throw this.failure
    return this.members
  }

  listTasks(): TeamTaskView[] {
    if (this.failure !== undefined) throw this.failure
    return this.tasks
  }
}

/** Build one roster row with only the fields the command reads. */
function member(name: string, role: TeamMemberView['role'], status: TeamMemberView['status']): TeamMemberView {
  return { id: name as TeamMemberView['id'], name, role, status, diagnostics: [] } as TeamMemberView
}

/** Build one board row with only the fields the command reads. */
function task(id: string, status: TeamTaskView['status'], subject: string): TeamTaskView {
  return {
    id: id as TeamTaskView['id'],
    revision: 1,
    subject,
    description: '',
    status,
    blockedBy: [] as TeamTaskView['blockedBy'],
    writeScopes: [],
    ready: false,
    writeScopeWarnings: [],
  } as TeamTaskView
}

/** Build a live agent the command registry accepts as the caller. */
function stubAgent(ctx: Context): Agent {
  const session = ctx.sessions.create(SessionId(`cluster-command-${Math.random()}`))
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

interface Harness {
  readonly ctx: Context
  readonly agent: Agent
  readonly team: TeamStub
  readonly plugin: Awaited<ReturnType<Context['plugin']>>
}

/** Mount the real command registry over a Team the test controls. */
async function harness(): Promise<Harness> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(CommandRuntime)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(TeamStub)
  const plugin = await ctx.plugin(commandCluster)
  const agent = stubAgent(ctx)
  await ctx.agents.register(agent)
  const team = ctx.get('agentTeams') as unknown as TeamStub
  return { ctx, agent, team, plugin }
}

/** Execute `/cluster` through the same registry boundary a UI adapter uses. */
async function run(test: Harness, suffix = ''): Promise<CommandResult> {
  const execution = await test.ctx.commands.execute(
    test.agent,
    `/cluster${suffix}`,
    [],
    new AbortController().signal,
  )
  if (execution === undefined) throw new Error('cluster command was not registered')
  return execution.result
}

describe('@deepseek-ai/dsh-command-cluster registration', () => {
  it('registers one global command and disposes it again', async () => {
    const test = await harness()
    expect(commandCluster.name).toBe('command-cluster')
    expect(commandCluster.inject).toEqual(['commands', 'agentTeams'])
    // Loader-safe exports: a plugin namespace, never a default export.
    expect('default' in commandCluster).toBe(false)
    // The registry lists only the attachment flag when it is set, so a command
    // that takes no attachments reports the hint alone.
    expect(test.ctx.commands.list(test.agent)).toContainEqual({
      definitionId: '@deepseek-ai/dsh-command-cluster',
      name: 'cluster',
      description: 'Show the cluster roster, the shared task board, and its dependency edges',
      input: { hint: '[status|tasks|agents|graph]' },
    })
    expect(test.ctx.commands.find(test.agent, 'cluster')).toBeDefined()

    await test.plugin.dispose()
    expect(test.ctx.commands.find(test.agent, 'cluster')).toBeUndefined()
  })
})

describe('/cluster human command', () => {
  it('reads the roster and the board the Team service holds', async () => {
    const test = await harness()
    test.team.members = [member('lead', 'lead', 'running'), member('coder', 'teammate', 'idle')]
    test.team.tasks = [task('task-1', 'completed', 'Ballot: Adopt X')]
    const result = await run(test)
    expect(result.kind).toBe('success')
    // Without cluster.yml the report names the session rather than inventing a cluster.
    expect(result.text).toContain('Cluster: this session')
    expect(result.text).toContain('Members: 2 (lead + 1 teammates) — idle 1')
    expect(result.text).toContain('Tasks: 1 — completed 1')
  })

  it('dispatches each sub-command to its own report', async () => {
    const test = await harness()
    test.team.members = [member('lead', 'lead', 'running')]
    test.team.tasks = [task('task-1', 'completed', 'Ballot: Adopt X')]
    expect(await run(test, ' tasks')).toEqual({ kind: 'success', text: 'task-1 [completed] Ballot: Adopt X — unowned' })
    expect(await run(test, ' graph')).toEqual({ kind: 'success', text: 'No shared task waits on another.' })
    expect((await run(test, ' agents')).text).toBe('lead [running] lead')
  })

  it('refuses a sub-command it does not own instead of treating it as free text', async () => {
    const test = await harness()
    const result = await run(test, ' cost')
    expect(result.kind).toBe('error')
    expect(result.text).toContain('Usage: /cluster [status|tasks|agents|graph]')
  })

  it('hands a refusal back as an error result rather than failing dispatch', async () => {
    const test = await harness()
    test.team.failure = new Error('no Team membership')
    const result = await run(test, ' tasks')
    expect(result.kind).toBe('error')
    expect(result.text).toContain('could not read this Team: no Team membership')
  })
})
