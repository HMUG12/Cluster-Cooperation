/**
 * Strict reader for the `cluster.yml` document. Unknown keys and wrong-typed
 * values are rejected eagerly so a typo fails at load instead of silently
 * routing an agent to the wrong model.
 *
 * @module @deepseek-ai/dsh-cluster-config
 */

import {
  CLUSTER_DOCUMENT_VERSION,
  type ClusterDocument,
  type ClusterSpec,
  type ClusterTopology,
  type LeadSpec,
  type MemberSpec,
  type ModelSpec,
  type RouteSpec,
} from './types.ts'

const TOPOLOGIES: readonly string[] = ['star', 'mesh', 'pipeline', 'debate']
const CONTEXTS: readonly string[] = ['fresh', 'fork']

/** One invalid field in a cluster document. */
export interface ClusterFieldIssue {
  /** Dot-separated path to the rejected field. */
  readonly path: string
  /** Why the value was rejected. */
  readonly reason: string
}

/** Rejected cluster document. */
export class ClusterConfigError extends Error {
  /** Every field rejected while validating the document. */
  readonly issues: readonly ClusterFieldIssue[]

  constructor(source: string, issues: readonly ClusterFieldIssue[]) {
    const rendered = issues.map(issue => `  - ${issue.path || '<root>'}: ${issue.reason}`).join('\n')
    super(`invalid cluster configuration (${source}):\n${rendered}`)
    this.name = 'ClusterConfigError'
    this.issues = issues
  }
}

/** Accumulates field issues while walking one document. */
class IssueBuilder {
  private readonly issues: ClusterFieldIssue[] = []

  add(path: string, reason: string): void {
    this.issues.push({ path, reason })
  }

  /** @returns true when nothing has been rejected yet. */
  get empty(): boolean {
    return this.issues.length === 0
  }

  /** @returns every issue recorded so far. */
  snapshot(): readonly ClusterFieldIssue[] {
    return this.issues
  }
}

/**
 * Reject a document whose fields were already collected.
 * @param source - human-readable origin used in the message.
 * @param issues - every field rejected while walking the document.
 * @throws ClusterConfigError always.
 */
function fail(source: string, issues: readonly ClusterFieldIssue[]): never {
  throw new ClusterConfigError(source, issues)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireObject(value: unknown, path: string, issues: IssueBuilder): Record<string, unknown> | undefined {
  if (isRecord(value)) return value
  issues.add(path, `expected an object, received ${value === null ? 'null' : typeof value}`)
  return undefined
}

function optionalString(record: Record<string, unknown>, key: string, path: string, issues: IssueBuilder): string | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (typeof value === 'string' && value.length > 0) return value
  issues.add(`${path}.${key}`, 'expected a non-empty string')
  return undefined
}

function optionalNumber(record: Record<string, unknown>, key: string, path: string, issues: IssueBuilder): number | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (typeof value === 'number' && Number.isFinite(value)) return value
  issues.add(`${path}.${key}`, 'expected a finite number')
  return undefined
}

function optionalStringList(record: Record<string, unknown>, key: string, path: string, issues: IssueBuilder): string[] | undefined {
  const value = record[key]
  if (value === undefined) return undefined
  if (Array.isArray(value) && value.every(entry => typeof entry === 'string')) return value as string[]
  issues.add(`${path}.${key}`, 'expected an array of strings')
  return undefined
}

function rejectUnknown(record: Record<string, unknown>, allowed: readonly string[], path: string, issues: IssueBuilder): void {
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) issues.add(`${path}.${key}`, 'unknown field')
  }
}

/**
 * Read one route entry. `model` alone resolves through the document's
 * `models` alias map; `provider` plus `model` names a route inline.
 * @param value - raw entry.
 * @param path - field path used in diagnostics.
 * @param models - reusable route aliases.
 * @param issues - issue accumulator.
 * @returns the resolved route, or undefined when it is invalid.
 */
function readRoute(
  value: unknown,
  path: string,
  models: Readonly<Record<string, ModelSpec>>,
  issues: IssueBuilder,
): RouteSpec | undefined {
  if (typeof value === 'string') {
    const alias = models[value]
    if (alias === undefined) {
      issues.add(path, `unknown model alias "${value}"; declare it under models or write { provider, model }`)
      return undefined
    }
    return {
      provider: alias.provider,
      model: alias.model,
      ...alias.reasoningEffort === undefined ? {} : { reasoningEffort: alias.reasoningEffort },
    }
  }
  const record = requireObject(value, path, issues)
  if (record === undefined) return undefined
  rejectUnknown(record, ['provider', 'model', 'reasoningEffort'], path, issues)
  const provider = optionalString(record, 'provider', path, issues)
  const model = optionalString(record, 'model', path, issues)
  const reasoningEffort = optionalString(record, 'reasoningEffort', path, issues)
  if (provider === undefined || model === undefined) return undefined
  return { provider, model, ...reasoningEffort === undefined ? {} : { reasoningEffort } }
}

function readRouteList(
  value: unknown,
  path: string,
  models: Readonly<Record<string, ModelSpec>>,
  issues: IssueBuilder,
): RouteSpec[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    issues.add(path, 'expected an array of routes')
    return undefined
  }
  const routes: RouteSpec[] = []
  for (const [index, entry] of value.entries()) {
    const route = readRoute(entry, `${path}[${index}]`, models, issues)
    if (route !== undefined) routes.push(route)
  }
  return routes
}

function readModelSpec(value: unknown, path: string, issues: IssueBuilder): ModelSpec | undefined {
  const record = requireObject(value, path, issues)
  if (record === undefined) return undefined
  rejectUnknown(record, ['provider', 'model', 'reasoningEffort', 'description'], path, issues)
  const provider = optionalString(record, 'provider', path, issues)
  const model = optionalString(record, 'model', path, issues)
  if (provider === undefined || model === undefined) return undefined
  const reasoningEffort = optionalString(record, 'reasoningEffort', path, issues)
  const description = optionalString(record, 'description', path, issues)
  return {
    provider,
    model,
    ...reasoningEffort === undefined ? {} : { reasoningEffort },
    ...description === undefined ? {} : { description },
  }
}

function readLeadSpec(
  value: unknown,
  path: string,
  models: Readonly<Record<string, ModelSpec>>,
  issues: IssueBuilder,
): LeadSpec {
  if (value === undefined) return {}
  const record = requireObject(value, path, issues)
  if (record === undefined) return {}
  rejectUnknown(record, ['route', 'model', 'fallback'], path, issues)
  const routeSource = record['route'] ?? record['model']
  const route = routeSource === undefined ? undefined : readRoute(routeSource, `${path}.route`, models, issues)
  const fallback = readRouteList(record['fallback'], `${path}.fallback`, models, issues)
  return { ...route === undefined ? {} : { route }, ...fallback === undefined ? {} : { fallback } }
}

function readMemberSpec(
  value: unknown,
  path: string,
  models: Readonly<Record<string, ModelSpec>>,
  issues: IssueBuilder,
): MemberSpec | undefined {
  const record = requireObject(value, path, issues)
  if (record === undefined) return undefined
  rejectUnknown(record, [
    'name', 'description', 'context', 'writeScopes', 'tokenBudget',
    'mission', 'deliverables', 'definitionOfDone', 'qualityBar',
    'route', 'model', 'fallback',
  ], path, issues)
  const name = optionalString(record, 'name', path, issues)
  if (name === undefined) return undefined
  const context = optionalString(record, 'context', path, issues)
  if (context !== undefined && !CONTEXTS.includes(context)) {
    issues.add(`${path}.context`, `expected one of ${CONTEXTS.join(', ')}`)
  }
  const routeSource = record['route'] ?? record['model']
  const route = routeSource === undefined ? undefined : readRoute(routeSource, `${path}.route`, models, issues)
  const fallback = readRouteList(record['fallback'], `${path}.fallback`, models, issues)
  const description = optionalString(record, 'description', path, issues)
  const mission = optionalString(record, 'mission', path, issues)
  const writeScopes = optionalStringList(record, 'writeScopes', path, issues)
  const tokenBudget = optionalNumber(record, 'tokenBudget', path, issues)
  const deliverables = optionalStringList(record, 'deliverables', path, issues)
  const definitionOfDone = optionalStringList(record, 'definitionOfDone', path, issues)
  const qualityBar = optionalStringList(record, 'qualityBar', path, issues)
  return {
    name,
    ...description === undefined ? {} : { description },
    ...mission === undefined ? {} : { mission },
    ...context === undefined || !CONTEXTS.includes(context) ? {} : { context: context as 'fresh' | 'fork' },
    ...writeScopes === undefined ? {} : { writeScopes },
    ...tokenBudget === undefined ? {} : { tokenBudget },
    ...deliverables === undefined ? {} : { deliverables },
    ...definitionOfDone === undefined ? {} : { definitionOfDone },
    ...qualityBar === undefined ? {} : { qualityBar },
    ...route === undefined ? {} : { route },
    ...fallback === undefined ? {} : { fallback },
  }
}

function readClusterSpec(
  value: unknown,
  name: string,
  path: string,
  models: Readonly<Record<string, ModelSpec>>,
  issues: IssueBuilder,
): ClusterSpec | undefined {
  const record = requireObject(value, path, issues)
  if (record === undefined) return undefined
  rejectUnknown(record, ['topology', 'maxConcurrency', 'lead', 'members'], path, issues)
  const rawTopology = record['topology'] ?? 'mesh'
  const topology = typeof rawTopology === 'string' && TOPOLOGIES.includes(rawTopology)
    ? rawTopology as ClusterTopology
    : undefined
  if (topology === undefined) issues.add(`${path}.topology`, `expected one of ${TOPOLOGIES.join(', ')}`)
  const maxConcurrency = optionalNumber(record, 'maxConcurrency', path, issues)
  const lead = readLeadSpec(record['lead'], `${path}.lead`, models, issues)
  const members: MemberSpec[] = []
  const rawMembers = record['members'] ?? []
  if (!Array.isArray(rawMembers)) {
    issues.add(`${path}.members`, 'expected an array')
  } else {
    for (const [index, entry] of rawMembers.entries()) {
      const member = readMemberSpec(entry, `${path}.members[${index}]`, models, issues)
      if (member !== undefined) members.push(member)
    }
  }
  return {
    name,
    topology: topology ?? 'mesh',
    ...maxConcurrency === undefined ? {} : { maxConcurrency },
    lead,
    members,
  }
}

/**
 * Parse and validate one cluster document.
 * @param input - decoded document value.
 * @param source - human-readable origin used in diagnostics.
 * @returns the validated document.
 * @throws ClusterConfigError when any field is unknown or mistyped.
 */
export function readClusterDocument(input: unknown, source: string): ClusterDocument {
  const issues = new IssueBuilder()
  const record = requireObject(input, '', issues)
  if (record === undefined) fail(source, issues.snapshot())
  rejectUnknown(record, ['version', 'models', 'defaultCluster', 'clusters'], '', issues)

  const version = record['version']
  if (version !== CLUSTER_DOCUMENT_VERSION) {
    issues.add('version', `expected ${CLUSTER_DOCUMENT_VERSION}, received ${String(version)}`)
  }

  const models: Record<string, ModelSpec> = {}
  const rawModels = record['models'] ?? {}
  if (!isRecord(rawModels)) {
    issues.add('models', 'expected an object keyed by alias')
  } else {
    for (const [alias, entry] of Object.entries(rawModels)) {
      const spec = readModelSpec(entry, `models.${alias}`, issues)
      if (spec !== undefined) models[alias] = spec
    }
  }

  const clusters: Record<string, ClusterSpec> = {}
  const rawClusters = record['clusters'] ?? {}
  if (!isRecord(rawClusters)) {
    issues.add('clusters', 'expected an object keyed by cluster name')
  } else {
    for (const [name, entry] of Object.entries(rawClusters)) {
      const spec = readClusterSpec(entry, name, `clusters.${name}`, models, issues)
      if (spec !== undefined) clusters[name] = spec
    }
  }

  const defaultCluster = optionalString(record, 'defaultCluster', '', issues)
  if (defaultCluster !== undefined && clusters[defaultCluster] === undefined) {
    issues.add('defaultCluster', `unknown cluster "${defaultCluster}"`)
  }
  if (!issues.empty) fail(source, issues.snapshot())
  return {
    version: CLUSTER_DOCUMENT_VERSION,
    models,
    ...defaultCluster === undefined ? {} : { defaultCluster },
    clusters,
  }
}
