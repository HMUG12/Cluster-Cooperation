/**
 * Cluster configuration document types.
 *
 * @module @deepseek-ai/dsh-cluster-config
 */

/** Supported document version. The only accepted value today. */
export const CLUSTER_DOCUMENT_VERSION = 1

/** Message routing rules between cluster members. */
export type ClusterTopology = 'star' | 'mesh' | 'pipeline' | 'debate'

/** One registered provider route plus its model id. */
export interface RouteSpec {
  /** Provider route registered on `ctx.llm`. */
  readonly provider: string
  /** Provider-owned model id. */
  readonly model: string
  /** Optional adapter-owned reasoning effort. */
  readonly reasoningEffort?: string
}

/** One reusable route entry under `models`. */
export interface ModelSpec extends RouteSpec {
  /** Whether this route is a member's fallback after its own route. */
  readonly description?: string
}

/** One delegated worker inside a cluster. */
export interface MemberSpec {
  /** Stable model-facing member name. Must match the spawned teammate name. */
  readonly name: string
  /** Short description of the delegated responsibility. */
  readonly description?: string
  /** Context mode requested when the member is spawned. */
  readonly context?: 'fresh' | 'fork'
  /** Advisory workspace-relative write prefixes owned by this member. */
  readonly writeScopes?: string[]
  /** Soft token budget for one member run. */
  readonly tokenBudget?: number
  /** What this member is accountable for, stated once for every delegation. */
  readonly mission?: string
  /** Concrete artifacts the member must produce. */
  readonly deliverables?: string[]
  /** Conditions that make the member's work acceptable to the Lead. */
  readonly definitionOfDone?: string[]
  /** The bar the Lead will review against, beyond mere completion. */
  readonly qualityBar?: string[]
  /** Primary route for this member. */
  readonly route?: RouteSpec
  /** Ordered routes tried after {@link route}. */
  readonly fallback?: RouteSpec[]
}

/** The coordinating Lead of one cluster. */
export interface LeadSpec {
  /** Primary route for the Lead. */
  readonly route?: RouteSpec
  /** Ordered routes tried after {@link route}. */
  readonly fallback?: RouteSpec[]
}

/** One named cluster declaration. */
export interface ClusterSpec {
  /** Free-form cluster name, unique inside one document. */
  readonly name: string
  /** Message routing rules used by this cluster. */
  readonly topology: ClusterTopology
  /** Maximum members running concurrently. Unbounded when absent. */
  readonly maxConcurrency?: number
  /** Lead coordination settings. */
  readonly lead: LeadSpec
  /** Delegated workers. */
  readonly members: MemberSpec[]
}

/** Complete parsed `cluster.yml`. */
export interface ClusterDocument {
  /** Document format version. */
  readonly version: number
  /** Reusable route aliases referenced by `model` fields. */
  readonly models: Readonly<Record<string, ModelSpec>>
  /** Cluster name used when none is supplied by the caller. */
  readonly defaultCluster?: string
  /** Every declared cluster, keyed by name. */
  readonly clusters: Readonly<Record<string, ClusterSpec>>
}
