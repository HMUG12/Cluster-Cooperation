import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execa } from 'execa'
import { describe, expect, it } from 'vitest'
import { resolveExampleLaunch } from '@deepseek-ai/dsh-loader-smoke'

const dshBinScript = fileURLToPath(new URL('../src/bin.ts', import.meta.url))
const tsconfigPath = fileURLToPath(new URL('../../../tsconfig.json', import.meta.url))
const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url))
// The cluster bundle is not a dependency of this app, so a profile cannot name
// it: layering its own patch keeps the bundle the single source of truth for
// what the cluster mounts, and resolves its plugins from the bundle's packages.
const clusterBundlePatch = fileURLToPath(new URL('../../../packages/cluster/bundle/cordis.patch.yml', import.meta.url))
const fixturePlugin = pathToFileURL(fileURLToPath(
  new URL('./profiles/headless/tests/fixtures/cluster-motion-llm.mjs', import.meta.url),
)).href

/** Two voters and a counter, all on the shipped provider route the fixture serves. */
const CLUSTER_YML = `version: 1
defaultCluster: main
models:
  shared: { provider: deepseek-official, model: deepseek-v4-flash }
clusters:
  main:
    topology: star
    members:
      - name: coder
        route: shared
        mission: Cast a ballot on every motion the Lead puts to the cluster.
      - name: tester
        route: shared
        mission: Cast a ballot on every motion the Lead puts to the cluster.
      - name: reviewer
        route: shared
        mission: Count the ballots once the last one is cast.
    orchestration:
      review:
        enabled: false
`

function records(content: string): Record<string, unknown>[] {
  return content.split('\n').filter(Boolean).map(line => JSON.parse(line) as Record<string, unknown>)
}

/** The latest snapshot of every shared task, in creation order. */
function tasks(log: readonly Record<string, unknown>[]): Record<string, unknown>[] {
  const latest = new Map<string, Record<string, unknown>>()
  for (const record of log) {
    if (record.type !== 'team/task') continue
    const task = (record.data as { task: Record<string, unknown> }).task
    latest.set(String(task.id), task)
  }
  return [...latest.values()]
}

describe('dsh run with the cluster bundle', () => {
  it('runs one motion from the Lead tool call to the counted tally', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'dsh-cluster-motion-'))
    try {
      const home = join(cwd, '.dsh')
      const sessions = join(home, 'sessions')
      const profileDir = join(home, 'profiles', 'headless')
      await mkdir(profileDir, { recursive: true })
      // cluster-config resolves DSH_HOME/cluster.yml before the process cwd.
      await writeFile(join(home, 'cluster.yml'), CLUSTER_YML)
      await writeFile(join(profileDir, 'package.json'), JSON.stringify({
        name: 'dsh-profile-headless',
        private: true,
        dependencies: {},
        dsh: {
          profile: {
            bundles: [
              '@deepseek-ai/dsh-base',
              '@deepseek-ai/dsh-headless',
            ],
          },
        },
      }, undefined, 2) + '\n')
      await writeFile(join(profileDir, 'cordis.patch.yml'), [
        '- id: llm-deepseek',
        '  disabled: true',
        '- id: session-persistence-jsonl',
        '  config:',
        `    root: '${sessions}'`,
        '    compression: none',
        '- insert:',
        '    - id: cluster-motion-fixture-llm',
        `      name: '${fixturePlugin}'`,
        '',
      ].join('\n'))
      const launch = resolveExampleLaunch({
        srcBin: dshBinScript,
        configArgs: [
          '--profile', 'headless',
          '--patch', clusterBundlePatch,
          'Put one motion to the cluster: spawn coder, tester and reviewer, call motion with voters '
          + 'coder and tester and count reviewer, wait for the tally, then report the board.',
        ],
        tsconfigPath,
        env: {
          DSH_HOME: home,
          DSH_AGENTS_HOME: join(cwd, '.agents'),
          DSH_TELEMETRY_DISABLED: '1',
          DEEPSEEK_API_KEY: '',
          NODE_OPTIONS: [
            process.env.NODE_OPTIONS,
            '--disable-warning=ExperimentalWarning',
            '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
          ].filter(Boolean).join(' '),
        },
      })
      const result = await execa(launch.command, launch.args, {
        // The layered patch resolves its plugin names from the repository, so
        // the run starts there; every durable artifact still lands in DSH_HOME.
        cwd: repositoryRoot,
        env: launch.env,
        input: '',
        timeout: 90_000,
        killSignal: 'SIGKILL',
        reject: false,
      })
      expect(
        result.exitCode,
        `dsh headless profile exited unexpectedly.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
      ).toBe(0)
      expect(result.stderr).toBe('')
      expect(result.stdout).toContain('CLUSTER_MOTION_OK')

      const files = (await readdir(sessions, { recursive: true }))
        .filter(file => file.endsWith('.jsonl'))
      expect(files).toHaveLength(4)
      const logs = await Promise.all(files.map(file => readFile(join(sessions, file), 'utf8')))
      const parsed = logs.map(records)
      const root = parsed.find((log) => {
        const header = log[0]
        return header?.type === 'session' && typeof header.parentSession !== 'string'
      })
      expect(root).toBeDefined()

      // The Lead put the question through the cluster tool, not through mail.
      const toolNames = root!.filter(record => record.type === 'tool/call')
        .map(record => (record.data as { name?: string } | undefined)?.name)
      expect(toolNames).toContain('motion')
      expect(toolNames).toContain('spawn_teammate')
      // One member event per lifecycle change, so read the roster by name.
      const roster = new Set(root!.filter(record => record.type === 'team/member')
        .map(record => String((record.data as { member: { name: string } }).member.name)))
      expect([...roster].sort()).toEqual(['coder', 'reviewer', 'tester'])

      // Two ballots and one tally, and the tally waited on both ballots.
      const board = tasks(root!)
      const ballots = board.filter(task => String(task.subject).startsWith('Ballot: '))
      expect(ballots).toHaveLength(2)
      expect(ballots.map(task => task.status)).toEqual(['completed', 'completed'])
      const tally = board.find(task => String(task.subject).startsWith('Tally: '))
      expect(tally).toBeDefined()
      expect(tally!.blockedBy).toEqual(ballots.map(task => task.id))
      expect(tally!.status).toBe('completed')
      expect(String(tally!.description)).toContain('cluster-owner: reviewer')

      // The notice the counter received carried the count and asked for no claim.
      const notices = root!.filter(record => record.type === 'team/message/queued')
        .map(record => JSON.stringify(record.data))
      const handoff = notices.find(notice => notice.includes('of 2 ballots'))
      expect(handoff, `queued messages:\n${notices.join('\n')}`).toBeDefined()
      expect(handoff).toContain('0 abstain of 2 ballots')
      expect(handoff).toContain('claim nothing')
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  }, 105_000)
})
