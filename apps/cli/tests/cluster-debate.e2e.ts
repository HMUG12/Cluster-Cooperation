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
  new URL('./profiles/headless/tests/fixtures/cluster-debate-llm.mjs', import.meta.url),
)).href

/** Two speakers and a judge, all on the shipped provider route the fixture serves. */
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
        mission: Argue every round of every debate the Lead puts to the cluster.
      - name: tester
        route: shared
        mission: Argue every round of every debate the Lead puts to the cluster.
      - name: reviewer
        route: shared
        mission: Weigh the final round once the debate closes.
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
  it('runs one debate from the Lead tool call to the verdict, one round at a time', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'dsh-cluster-debate-'))
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
        '    - id: cluster-debate-fixture-llm',
        `      name: '${fixturePlugin}'`,
        '',
      ].join('\n'))
      const launch = resolveExampleLaunch({
        srcBin: dshBinScript,
        configArgs: [
          '--profile', 'headless',
          '--patch', clusterBundlePatch,
          'Run a debate for the cluster: spawn coder, tester and reviewer, debate which cache the '
          + 'service should use over two rounds with coder and tester speaking and reviewer judging, '
          + 'wait for the verdict, then report the board.',
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
      // Read the durable logs before asserting: a stalled run has to explain
      // itself through the board it left behind, not only through stdout.
      const files = (await readdir(sessions, { recursive: true }))
        .filter(file => file.endsWith('.jsonl'))
      const logs = await Promise.all(files.map(file => readFile(join(sessions, file), 'utf8')))
      const parsed = logs.map(records)
      const root = parsed.find((log) => {
        const header = log[0]
        return header?.type === 'session' && typeof header.parentSession !== 'string'
      })
      const boardDump = root === undefined
        ? ''
        : tasks(root).map(task => `${String(task.id)} ${String(task.subject)} [${String(task.status)}] blockedBy=${JSON.stringify(task.blockedBy)}`).join('\n')
      const calls = root === undefined
        ? ''
        : root.filter(record => record.type === 'tool/call')
          .map(record => JSON.stringify(record.data).slice(0, 600)).join('\n')
      const diagnostics = `\nfiles: ${files.length}\nboard:\n${boardDump}\ntool calls:\n${calls}`

      expect(
        result.exitCode,
        `dsh headless profile exited unexpectedly.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}${diagnostics}`,
      ).toBe(0)
      expect(result.stderr).toBe('')
      expect(result.stdout, `stdout: ${result.stdout}${diagnostics}`).toContain('CLUSTER_DEBATE_OK')

      expect(files).toHaveLength(4)
      expect(root, `no root session${diagnostics}`).toBeDefined()

      const toolNames = root!.filter(record => record.type === 'tool/call')
        .map(record => (record.data as { name?: string } | undefined)?.name)
      expect(toolNames).toContain('debate')
      expect(toolNames).toContain('spawn_teammate')

      // Two rounds of two speeches plus the verdict, and every round waited on
      // the whole round before it.
      const board = tasks(root!)
      const opening = board.filter(task => String(task.subject).startsWith('Debate 1/2: '))
      const closing = board.filter(task => String(task.subject).startsWith('Debate 2/2: '))
      expect(opening).toHaveLength(2)
      expect(closing).toHaveLength(2)
      const openingIds = opening.map(task => String(task.id)).sort()
      for (const speech of closing) {
        expect([...speech.blockedBy as string[]].sort()).toEqual(openingIds)
      }
      expect(opening.map(task => task.status)).toEqual(['completed', 'completed'])
      expect(closing.map(task => task.status)).toEqual(['completed', 'completed'])
      // The closing arguments are what the verdict reads, so they carry the marker.
      expect(closing.filter(task => String(task.description).includes('statement: '))).toHaveLength(2)
      const verdict = board.find(task => String(task.subject).startsWith('Verdict: '))
      expect(verdict).toBeDefined()
      expect([...verdict!.blockedBy as string[]].sort()).toEqual(closing.map(task => String(task.id)).sort())
      expect(verdict!.status).toBe('completed')
      expect(String(verdict!.description)).toContain('cluster-owner: reviewer')

      // The judge was handed how much of the final round it could weigh.
      const notices = root!.filter(record => record.type === 'team/message/queued')
        .map(record => JSON.stringify(record.data))
      const handoff = notices.find(notice => notice.includes('arguments in the final round'))
      expect(handoff, `queued messages:\n${notices.join('\n')}`).toBeDefined()
      expect(handoff).toContain('2 of 2 arguments in the final round are readable')
      expect(handoff).toContain('claim nothing')
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  }, 105_000)
})
