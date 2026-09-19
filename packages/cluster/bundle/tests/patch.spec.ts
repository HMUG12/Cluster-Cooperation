/** The cluster bundle must carry one parseable layer that replaces direct delegation. */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'
import * as yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'

describe('cluster bundle', () => {
  it('declares one bundle patch and the plugin rows it needs', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      dsh?: { bundle?: { patch?: string } }
      dependencies?: Record<string, string>
    }
    expect(manifest.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    expect(manifest.dependencies).toMatchObject({
      '@deepseek-ai/dsh-cluster-config': 'workspace:^',
      '@deepseek-ai/dsh-cluster-orchestrator': 'workspace:^',
      '@deepseek-ai/dsh-cluster-router': 'workspace:^',
      '@deepseek-ai/dsh-experimental-agent-team': 'workspace:^',
      '@deepseek-ai/dsh-experimental-tool-agent-team': 'workspace:^',
    })
  })

  it('disables legacy delegation and inserts the Team domain plus cluster plugins', () => {
    const root = fileURLToPath(new URL('..', import.meta.url))
    const parsed = yaml.load(readFileSync(resolve(root, 'cordis.patch.yml'), 'utf8'), { schema: entryListSchema })
    expect(Array.isArray(parsed)).toBe(true)
    const patches = parsed as {
      id?: string
      disabled?: boolean
      insert?: { id?: string; name?: string }[]
    }[]
    for (const id of ['tool-subagent-control', 'tool-subagent-list-agents', 'tool-subagent', 'tool-subagent-fork']) {
      expect(patches.find(patch => patch.id === id)).toMatchObject({ disabled: true })
    }
    const inserted = patches.flatMap(patch => patch.insert ?? [])
    expect(inserted.map(entry => entry.id)).toEqual([
      'agent-team',
      'tool-agent-team',
      'cluster-config',
      'cluster-router',
      'cluster-orchestrator',
    ])
    expect(inserted.find(entry => entry.id === 'cluster-router')?.name).toBe('@deepseek-ai/dsh-cluster-router')
    expect(inserted.find(entry => entry.id === 'cluster-orchestrator')?.name)
      .toBe('@deepseek-ai/dsh-cluster-orchestrator')
  })
})
