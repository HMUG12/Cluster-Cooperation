/** The cluster document reader and the route lookups built on it. */

import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import ClusterConfig from '../src/index.ts'
import { ClusterConfigError, readClusterDocument } from '../src/document.ts'

const example = fileURLToPath(new URL('../../cluster.example.yml', import.meta.url))

/** Write one document into a throwaway directory and mount the service on it. */
function mount(document: string): ClusterConfig {
  const directory = mkdtempSync(join(tmpdir(), 'cluster-config-'))
  const file = join(directory, 'cluster.yml')
  writeFileSync(file, document)
  return new ClusterConfig(new Context(), { file })
}

describe('cluster document reader', () => {
  it('resolves alias routes and inline routes', () => {
    const document = readClusterDocument({
      version: 1,
      models: { planner: { provider: 'deepseek-official', model: 'deepseek-chat' } },
      clusters: {
        alpha: {
          topology: 'star',
          lead: { route: 'planner' },
          members: [{ name: 'coder', route: { provider: 'gateway', model: 'qwen3-coder' } }],
        },
      },
    }, 'inline')
    expect(document.clusters['alpha']?.lead.route).toEqual({ provider: 'deepseek-official', model: 'deepseek-chat' })
    expect(document.clusters['alpha']?.members[0]?.route).toEqual({ provider: 'gateway', model: 'qwen3-coder' })
  })

  it('rejects every unknown key, unknown alias, and unknown default cluster at once', () => {
    expect(() => readClusterDocument({
      version: 1,
      models: { planner: { provider: 'p', model: 'm' } },
      defaultCluster: 'missing',
      clusters: {
        alpha: {
          topology: 'star',
          typos: true,
          lead: { route: 'nowhere' },
          members: [{ name: 'coder', context: 'warm' }],
        },
      },
    }, 'bad.yml')).toThrow(ClusterConfigError)

    try {
      readClusterDocument({ version: 2, clusters: {} }, 'bad.yml')
      expect.unreachable('a wrong version must be rejected')
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ClusterConfigError)
      const paths = (error as ClusterConfigError).issues.map(issue => issue.path)
      expect(paths).toContain('version')
    }
  })

  it('reports the file path and every offending field', () => {
    try {
      readClusterDocument({ version: 1, clusters: { alpha: { unknown: 1 } } }, example)
      expect.unreachable('an unknown cluster field must be rejected')
    } catch (error: unknown) {
      const failure = error as ClusterConfigError
      expect(failure.message).toContain(example)
      expect(failure.issues.map(issue => issue.path)).toEqual(['clusters.alpha.unknown'])
    }
  })
})

describe('cluster configuration service', () => {
  it('serves the shipped example: lead, member, and fallback routes', () => {
    const config = new ClusterConfig(new Context(), { file: example })
    expect(config.defaultClusterName()).toBe('default')
    expect(config.routeFor('default', 'lead')).toEqual({ provider: 'deepseek-official', model: 'deepseek-chat' })
    expect(config.routeFor('default', 'coder-backend')).toEqual({ provider: 'deepseek-official', model: 'deepseek-chat' })
    expect(config.fallbacksFor('default', 'lead')).toEqual([{ provider: 'deepseek-official', model: 'deepseek-chat' }])
    expect(config.routeFor('default', 'nobody')).toBeUndefined()
    expect(config.member('default', 'lead')).toBeUndefined()
    expect(config.member('default', 'reviewer')?.writeScopes).toEqual([])
  })

  it('carries reasoning effort from an alias into the selection', () => {
    const config = mount(`
version: 1
models:
  deep:
    provider: gateway
    model: reasoner
    reasoningEffort: high
clusters:
  solo:
    topology: star
    lead:
      route: deep
`)
    expect(config.routeFor('solo', 'lead')).toEqual({ provider: 'gateway', model: 'reasoner', reasoningEffort: 'high' })
  })

  it('prefers the composition default over the document default', () => {
    const config = mount(`
version: 1
defaultCluster: alpha
models:
  base: { provider: p, model: m }
clusters:
  alpha:
    topology: star
    lead: { route: base }
  beta:
    topology: star
    lead: { route: base }
`)
    expect(config.defaultClusterName()).toBe('alpha')
    expect(new ClusterConfig(new Context(), { file: config.filePath, defaultCluster: 'beta' }).defaultClusterName()).toBe('beta')
    expect(() => new ClusterConfig(new Context(), { file: config.filePath, defaultCluster: 'gamma' }).defaultClusterName())
      .toThrow('unknown cluster "gamma"')
  })

  it('fails loud when the document declares no cluster to select', () => {
    const config = mount('version: 1\nclusters: {}\n')
    expect(() => config.defaultClusterName()).toThrow('declares no clusters')
  })

  it('reports a missing document with the path it tried', () => {
    const config = new ClusterConfig(new Context(), { file: resolve(tmpdir(), 'cluster-does-not-exist.yml') })
    expect(() => config.cluster()).toThrow()
    expect(config.filePath).toContain('cluster-does-not-exist.yml')
  })
})

describe('member briefing', () => {
  it('renders the declared accountability of a member as one block', () => {
    const briefing = new ClusterConfig(new Context(), { file: example })
      .briefingFor('default', 'coder-backend')
    expect(briefing).toBeDefined()
    expect(briefing).toContain('<cluster-briefing member="coder-backend" cluster="default">')
    expect(briefing).toContain('Mission: Turn the agreed interface into working server-side code.')
    expect(briefing).toContain('Deliverables:\n- Implementation under src/server/')
    expect(briefing).toContain('Definition of done:\n- ')
    expect(briefing).toContain('Quality bar:\n- ')
    expect(briefing).toContain('Advisory write scopes: src/server/')
    expect(briefing).toContain('Token budget: 400000')
    expect(briefing?.endsWith('</cluster-briefing>')).toBe(true)
  })

  it('stays silent for a member that declares only a route, and for the Lead', () => {
    const config = new ClusterConfig(new Context(), { file: example })
    expect(config.briefingFor('default', 'tester')).toBeUndefined()
    expect(config.briefingFor('default', 'lead')).toBeUndefined()
    expect(config.briefingFor('default', 'nobody')).toBeUndefined()
  })

  it('omits sections a member does not declare', () => {
    const config = mount(`
version: 1
models:
  base: { provider: p, model: m }
clusters:
  solo:
    topology: star
    lead: {}
    members:
      - name: minimal
        model: base
        mission: Keep one thing in mind.
`)
    const briefing = config.briefingFor('solo', 'minimal')
    expect(briefing).toContain('Mission: Keep one thing in mind.')
    expect(briefing).not.toContain('Deliverables:')
    expect(briefing).not.toContain('Token budget:')
  })

  it('rejects a briefing list that is not an array of strings', () => {
    expect(() => readClusterDocument({
      version: 1,
      models: { base: { provider: 'p', model: 'm' } },
      clusters: { solo: { topology: 'star', members: [{ name: 'x', model: 'base', deliverables: 'one thing' }] } },
    }, 'bad.yml')).toThrow(/deliverables/)
  })
})

describe('member budget', () => {
  it('reads the budget a member declares, and nothing for a member that declares none', () => {
    const config = new ClusterConfig(new Context(), { file: example })
    expect(config.budgetFor('default', 'coder-backend')).toBe(400000)
    expect(config.budgetFor('default', 'tester')).toBe(200000)
    expect(config.budgetFor('default', 'nobody')).toBeUndefined()
  })

  it('declares no Lead budget, because the Lead owns the plan rather than a slice of it', () => {
    const config = new ClusterConfig(new Context(), { file: example })
    expect(config.budgetFor('default', 'lead')).toBeUndefined()
  })
})

describe('review policy', () => {
  /** Build a one-reviewer cluster with the supplied review block. */
  function reviewDocument(review: unknown): unknown {
    return {
      version: 1,
      models: { base: { provider: 'p', model: 'm' } },
      clusters: {
        solo: {
          topology: 'star',
          members: [
            { name: 'coder', model: 'base' },
            { name: 'reviewer', model: 'base' },
          ],
          orchestration: { review },
        },
      },
    }
  }

  it('reads the shipped example, which reviews every completion twice at most', () => {
    const config = new ClusterConfig(new Context(), { file: example })
    expect(config.reviewFor()).toEqual({ enabled: true, reviewer: 'reviewer', maxRetries: 2 })
  })

  it('is absent when the cluster declares no orchestration, or switches it off', () => {
    const bare = mount(`
version: 1
models:
  base: { provider: p, model: m }
clusters:
  solo:
    topology: star
    members:
      - name: coder
        model: base
`)
    expect(bare.reviewFor('solo')).toBeUndefined()

    const off = mount(`
version: 1
models:
  base: { provider: p, model: m }
clusters:
  solo:
    topology: star
    members:
      - name: coder
        model: base
    orchestration:
      review:
        enabled: false
        reviewer: coder
        maxRetries: 1
`)
    expect(off.reviewFor('solo')).toBeUndefined()
  })

  it('rejects a reviewer that is not a declared member of the same cluster', () => {
    expect(() => readClusterDocument(reviewDocument({ reviewer: 'nobody' }), 'bad.yml'))
      .toThrow(/not a declared member/)
  })

  it('rejects a retry budget that is not a non-negative integer', () => {
    for (const maxRetries of [-1, 1.5, 'two']) {
      expect(() => readClusterDocument(reviewDocument({ reviewer: 'reviewer', maxRetries }), 'bad.yml'))
        .toThrow(/maxRetries/)
    }
  })

  it('rejects an unknown key under orchestration', () => {
    expect(() => readClusterDocument({
      version: 1,
      clusters: { solo: { topology: 'star', members: [], orchestration: { consensus: {} } } },
    }, 'bad.yml')).toThrow(/orchestration.consensus/)
  })
})

describe('declaration coherence', () => {
  /** Build a one-cluster document around the supplied member rows. */
  function membersDocument(members: unknown): unknown {
    return {
      version: 1,
      models: { base: { provider: 'p', model: 'm' } },
      clusters: { solo: { topology: 'star', members } },
    }
  }

  it('rejects a duplicate member name, which would otherwise resolve to the first row', () => {
    expect(() => readClusterDocument(membersDocument([
      { name: 'coder', model: 'base' },
      { name: 'coder', route: { provider: 'other', model: 'strong' } },
    ]), 'bad.yml')).toThrow(/duplicate member "coder"/)
  })

  it('rejects a token budget that is not a positive integer', () => {
    for (const tokenBudget of [0, -1, 1.5, 'many']) {
      expect(() => readClusterDocument(membersDocument([{ name: 'coder', tokenBudget }]), 'bad.yml'))
        .toThrow(/tokenBudget/)
    }
  })

  it('rejects a concurrency limit that is not a positive integer', () => {
    for (const maxConcurrency of [0, -2, 1.5]) {
      expect(() => readClusterDocument({
        version: 1,
        clusters: { solo: { topology: 'star', maxConcurrency, members: [{ name: 'coder' }] } },
      }, 'bad.yml')).toThrow(/maxConcurrency/)
    }
  })

  it('accepts a switched-off review block without naming a reviewer', () => {
    const config = mount(`
version: 1
models:
  base: { provider: p, model: m }
clusters:
  solo:
    topology: star
    members:
      - name: coder
        model: base
    orchestration:
      review:
        enabled: false
`)
    expect(config.reviewFor()).toBeUndefined()
  })
})
