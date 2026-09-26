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
  new URL('./profiles/headless/tests/fixtures/cluster-broadcast-llm.mjs', import.meta.url),
)).href

/** Three teammates, all on the shipped provider route the fixture serves. */
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
        mission: Answer anything the Lead broadcasts.
      - name: tester
        route: shared
        mission: Answer anything the Lead broadcasts.
      - name: reviewer
        route: shared
        mission: Answer anything the Lead broadcasts.
    orchestration:
      review:
        enabled: false
`

function records(content: string): Record<string, unknown>[] {
  return content.split('\n').filter(Boolean).map(line => JSON.parse(line) as Record<string, unknown>)
}

/**
 * Every tool result's own text, decoded.
 *
 * A tool result carries its payload as an escaped JSON string, so comparing a
 * rendered value against it would only ever match the escaping.
 */
function toolValues(log: readonly Record<string, unknown>[]): unknown[] {
  const values: unknown[] = []
  for (const record of log) {
    if (record.type !== 'tool/result') continue
    const message = (record.data as { message?: { content?: { content?: { text?: string }[] }[] } }).message
    for (const block of message?.content ?? []) {
      for (const item of block.content ?? []) {
        if (typeof item.text !== 'string') continue
        try {
          values.push(JSON.parse(item.text) as unknown)
        } catch {
          // A result that is not JSON is still readable to the model; skip it.
        }
      }
    }
  }
  return values
}

describe('dsh run with the cluster bundle', () => {
  it('reaches every teammate with one broadcast', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'dsh-cluster-broadcast-'))
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
        '    - id: cluster-broadcast-fixture-llm',
        `      name: '${fixturePlugin}'`,
        '',
      ].join('\n'))
      const launch = resolveExampleLaunch({
        srcBin: dshBinScript,
        configArgs: [
          '--profile', 'headless',
          '--patch', clusterBundlePatch,
          'Broadcast a ping to the cluster: spawn coder, tester and reviewer, send one '
          + 'broadcast_message to everyone, wait for their answers, then report the roster.',
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
      expect(result.stdout).toContain('CLUSTER_BROADCAST_OK')

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

      const toolNames = root!.filter(record => record.type === 'tool/call')
        .map(record => (record.data as { name?: string } | undefined)?.name)
      expect(toolNames).toContain('broadcast_message')
      expect(toolNames).toContain('spawn_teammate')

      // One tool result reported every recipient it reached, and skipped none.
      const values = toolValues(root!)
      const fanOut = values.find(value => (value as { delivered?: unknown }).delivered !== undefined) as
        | { delivered: { target: string; status: string }[]; skipped: unknown[] }
        | undefined
      expect(fanOut, `tool values:\n${JSON.stringify(values)}`).toBeDefined()
      expect(fanOut!.delivered.map(entry => entry.target).sort()).toEqual(['coder', 'reviewer', 'tester'])
      expect(fanOut!.delivered.every(entry => entry.status === 'accepted')).toBe(true)
      expect(fanOut!.skipped).toEqual([])

      // Three durable messages left the Lead, and each teammate answered its own.
      const queued = root!.filter(record => record.type === 'team/message/queued').length
      expect(queued).toBe(3)
      const others = parsed.filter(log => log !== root)
      for (const name of ['coder', 'tester', 'reviewer']) {
        expect(others.some(log => JSON.stringify(log).includes(`CLUSTER_BROADCAST_ACK ${name}`))).toBe(true)
      }
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  }, 105_000)
})
