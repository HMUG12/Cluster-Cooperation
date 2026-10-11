/**
 * Declarative Agent Cluster configuration.
 *
 * Reads one `cluster.yml` document and exposes model routes per cluster
 * member so a runtime plugin can bind each Agent to its configured provider
 * and model.
 *
 * @module @deepseek-ai/dsh-cluster-config
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'
import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { ModelSelection } from '@deepseek-ai/dsh-agent'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { parse, stringify } from 'yaml'
import { renderBriefing } from './briefing.ts'
import { readClusterDocument } from './document.ts'
import { CLUSTER_DOCUMENT_VERSION } from './types.ts'
import type { ClusterDocument, ClusterSpec, MemberSpec, ReviewSpec, RouteSpec, RoundsSpec } from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Declarative Agent Cluster configuration and per-member model routes. */
    clusterConfig: ClusterConfig
  }
}

/** Composition entry for the cluster configuration service. */
export interface Config {
  /** Absolute or cwd-relative path to `cluster.yml`. Defaults to `cluster.yml` under the Harness home, then the process cwd. */
  readonly file?: string
  /** Cluster used when a caller supplies none. Overrides the document's `defaultCluster`. */
  readonly defaultCluster?: string
}

/** Loader schema for the cluster configuration service. */
export const Config: z<Config> = z.object({
  file: z.string(),
  defaultCluster: z.string(),
})

/**
 * Resolve the document location from an explicit path, the Harness home, or
 * the process working directory.
 * @param file - configured absolute or relative path.
 * @returns the first candidate that exists.
 */
function resolveSource(file: string | undefined): string {
  if (file !== undefined && file.length > 0) return resolvePath(file)
  const home = process.env['DSH_HOME']
  const candidates = [
    ...home === undefined || home.length === 0 ? [] : [resolvePath(home, 'cluster.yml')],
    resolvePath(process.cwd(), 'cluster.yml'),
  ]
  for (const candidate of candidates) {
    try {
      readFileSync(candidate)
      return candidate
    } catch {
      continue
    }
  }
  return candidates[candidates.length - 1] ?? resolvePath(process.cwd(), 'cluster.yml')
}

/** Convert one configured route into an Agent model selection. */
function selection(route: RouteSpec): ModelSelection {
  return {
    provider: route.provider,
    model: route.model,
    ...route.reasoningEffort === undefined
      ? {}
      : { reasoningEffort: ReasoningEffortId(route.reasoningEffort) },
  }
}

/**
 * Owns one cluster document and answers per-member model routes.
 *
 * The document is read lazily on first access and cached for the service
 * lifetime, so a misconfiguration surfaces as a loud failure at the first
 * consumer instead of at boot time.
 */
export class ClusterConfig extends Service {
  static Config: z<Config> = z.object({
    file: z.string(),
    defaultCluster: z.string(),
  })

  private document: ClusterDocument | undefined
  private readonly source: string
  private readonly forced: string | undefined

  /** True once a read found no document file, so every lookup answers "nothing declared". */
  private absent = false

  /**
   * Whether a document file was found at {@link filePath}.
   *
   * This is the gate a caller checks before offering cluster behaviour: the layer
   * is opt-in, so an absent document is a state a caller can report, not a
   * failure that ends its caller's session.
   * @returns true when the document file exists.
   */
  get configured(): boolean {
    if (this.document !== undefined) return !this.absent
    // Before any read, the answer is the file's existence: a caller asking "is
    // this layer configured" must not be told yes by a service that has not
    // looked yet.
    return existsSync(this.source)
  }

  constructor(ctx: Context, config: Config) {
    super(ctx, 'clusterConfig')
    this.source = resolveSource(config.file)
    this.forced = config.defaultCluster
  }

  /** Location the next read targets. Exposed so operators can diagnose a wrong file. */
  get filePath(): string {
    return this.source
  }

  /** Read and validate the document, caching it for the service lifetime. */
  private loaded(): ClusterDocument {
    if (this.document !== undefined) return this.document
    let raw: string
    try {
      raw = readFileSync(this.source, 'utf8')
    } catch (error) {
      if ((error as { code?: string }).code !== 'ENOENT') throw error
      // A missing document is the unconfigured state, not a failure. Routing and
      // briefing read this service while a session is being created, so throwing
      // here would end every session that has not been given a document yet.
      this.absent = true
      this.document = { version: 1, clusters: {} } as ClusterDocument
      return this.document
    }
    this.document = readClusterDocument(parse(raw), this.source)
    return this.document
  }

  /**
   * Cluster used when a caller supplies no name.
   * @returns the configured cluster.
   * @throws Error when no cluster can be selected unambiguously.
   */
  defaultClusterName(): string {
    const document = this.loaded()
    if (this.forced !== undefined) {
      if (document.clusters[this.forced] === undefined) throw new Error(`unknown cluster "${this.forced}"`)
      return this.forced
    }
    if (document.defaultCluster !== undefined) return document.defaultCluster
    const names = Object.keys(document.clusters)
    // Reachable when the service is unconfigured: an absent document declares no
    // clusters, and only a caller that asks for one by name reaches this line.
    if (names.length === 0) throw new Error('cluster document declares no clusters')
    return names[0] as string
  }

  /**
   * Read one declared cluster.
   * @param name - cluster name, defaulting to {@link defaultClusterName}.
   * @returns the complete cluster declaration.
   */
  cluster(name: string = this.defaultClusterName()): ClusterSpec {
    const found = this.loaded().clusters[name]
    if (found === undefined) throw new Error(`unknown cluster "${name}"`)
    return found
  }

  /**
   * Read one member declaration.
   * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
   * @param memberName - model-facing member name, or `lead`.
   * @returns the member row, or undefined when it is not declared.
   */
  member(clusterName: string, memberName: string): MemberSpec | undefined {
    if (memberName === 'lead') return undefined
    return this.cluster(clusterName).members.find(member => member.name === memberName)
  }

  /**
   * Resolve the primary route bound to one cluster member.
   * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
   * @param memberName - model-facing member name, or `lead` for the coordinator.
   * @returns the configured selection, or undefined when the member declares no route.
   */
  routeFor(clusterName: string, memberName: string): ModelSelection | undefined {
    // An unconfigured service routes nothing rather than refusing the session.
    if (!this.configured) return undefined
    const cluster = this.cluster(clusterName)
    if (memberName === 'lead') return cluster.lead.route === undefined ? undefined : selection(cluster.lead.route)
    const member = cluster.members.find(entry => entry.name === memberName)
    return member?.route === undefined ? undefined : selection(member.route)
  }

  /**
   * Ordered fallback routes for one cluster member, excluding its primary route.
   * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
   * @param memberName - model-facing member name, or `lead`.
   * @returns configured fallbacks, empty when none are declared.
   */
  fallbacksFor(clusterName: string, memberName: string): ModelSelection[] {
    if (!this.configured) return []
    const cluster = this.cluster(clusterName)
    const routes = memberName === 'lead' ? cluster.lead.fallback : cluster.members.find(entry => entry.name === memberName)?.fallback
    return (routes ?? []).map(selection)
  }

  /**
   * Render the accountability a spawned member starts with.
   * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
   * @param memberName - model-facing member name. The Lead declares no briefing.
   * @returns the briefing text, or undefined when the member declares none.
   */
  briefingFor(clusterName: string, memberName: string): string | undefined {
    if (!this.configured) return undefined
    const member = this.member(clusterName, memberName)
    if (member === undefined) return undefined
    return renderBriefing({ clusterName, member })
  }

  /**
   * Read the soft token budget declared for one member.
   * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
   * @param memberName - model-facing member name. A Lead declares no budget.
   * @returns the declared budget, or undefined when the member declares none.
   */
  budgetFor(clusterName: string, memberName: string): number | undefined {
    if (!this.configured) return undefined
    return this.member(clusterName, memberName)?.tokenBudget
  }

  /**
   * Validate a document and write it, so a user can change the cluster at all.
   *
   * This is the only path that creates the file, so it goes through the same
   * reader every load uses: a document with a rejected field never reaches the
   * disk, and the caller learns which fields failed. The caller's own text is
   * written rather than the expanded reading, so a named route stays named.
   * @param document - candidate document, validated before anything is written.
   * @returns the validated document.
   * @throws ClusterConfigError when a field is rejected.
   */
  save(document: unknown): ClusterDocument {
    const validated = readClusterDocument(document, this.source)
    writeFileSync(this.source, stringify(document), 'utf8')
    this.document = validated
    this.absent = false
    return validated
  }

  /**
   * Read the document a settings surface edits.
   *
   * An absent document reads as the empty one rather than throwing, because a
   * panel asking what to edit is exactly the case where no file exists yet;
   * {@link configured} tells the two apart.
   * @returns the loaded document, empty when none has been written.
   */
  currentDocument(): ClusterDocument {
    return this.loaded()
  }

  /**
   * Read the document as the text a surface edits.
   *
   * A configured cluster reads as the file's own text rather than as a
   * re-serialisation of the reading, because the reading cannot be written back:
   * a cluster's name is carried by its key rather than spelled out, so a surface
   * that showed the reading would hand the user text this service rejects. An
   * unconfigured cluster reads as the starter, so a first-time user is handed
   * something to edit rather than an empty box.
   * @returns the file's text, or the starter's when no document exists.
   */
  editableText(): string {
    return this.configured ? readFileSync(this.source, 'utf8') : this.starterText()
  }

  /**
   * Render the starter as the text it is written as.
   * @returns YAML text naming the configured default cluster.
   */
  starterText(): string {
    return stringify(this.starterShape())
  }

  /**
   * Validate text and write it, so a surface can edit the document as text.
   *
   * The text is parsed here rather than in the client because this service owns
   * both the only parser and the only schema: a caller that parsed on its own
   * would either accept what this repository rejects or reject what it accepts,
   * and the two failures would look the same to a user.
   *
   * The file is rewritten in this service's own formatting, so comments and hand
   * layout do not survive a save; what does survive is every declared field, and
   * saving an unchanged document changes nothing at all.
   * @param text - candidate document text, in YAML or JSON.
   * @returns the validated document.
   * @throws ClusterConfigError when a field is rejected.
   * @throws Error when the text is not parseable at all.
   */
  saveText(text: string): ClusterDocument {
    return this.save(parse(text))
  }

  /**
   * Build the document a first-time user starts from.
   *
   * It carries structure only: the operator's own cluster name, a star topology,
   * and one worker. No route and no prose is invented here, because a model id is
   * an environment fact this repository does not know and a description is copy
   * that would have to be translated; both are the operator's to supply.
   * @returns a valid document naming the configured default cluster.
   */
  starter(): ClusterDocument {
    // Built through the reader so the result is a document this service accepts.
    return readClusterDocument(this.starterShape(), 'starter')
  }

  /**
   * The starter as a document is written, before any reading fills anything in.
   * @returns the file-shaped literal, without the names a reading supplies.
   */
  private starterShape(): unknown {
    // The operator's own name when they declared one, and a plain structural key
    // otherwise: an absent default is not a reason to refuse to hand out a
    // starting point, and the key is an identifier rather than copy.
    const name = this.forced ?? 'cluster'
    return {
      version: CLUSTER_DOCUMENT_VERSION,
      models: {},
      defaultCluster: name,
      clusters: { [name]: { topology: 'star', lead: {}, members: [{ name: 'worker', context: 'fresh' }] } },
    }
  }

  /**
   * Read the review policy that governs completed work.
   * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
   * @returns the enabled review policy, or undefined when review is off.
   */
  reviewFor(clusterName: string = this.defaultClusterName()): ReviewSpec | undefined {
    const review = this.cluster(clusterName).orchestration?.review
    if (review === undefined || !review.enabled || review.reviewer.length === 0) return undefined
    return review
  }

  /**
   * Read the declared round cap.
   * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
   * @returns the declared rounds policy, or undefined when none is declared.
   */
  roundsFor(clusterName: string = this.defaultClusterName()): RoundsSpec | undefined {
    return this.cluster(clusterName).orchestration?.rounds
  }
}

export default ClusterConfig
