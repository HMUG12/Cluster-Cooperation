/**
 * The cluster overview service a Web panel reads.
 *
 * It is the only cluster surface that crosses to the browser, and it crosses as
 * one generated Remote method returning the finished view: a client bundle may
 * not import another plugin's values, so the panel cannot derive anything
 * itself. The declarations and the folded spend are read structurally, exactly
 * as the `/cluster` command reads them, so this service needs no dependency on
 * the packages that own them and keeps loading when neither is mounted.
 *
 * @module @deepseek-ai/dsh-experimental-cluster-web
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { ClusterProtocols, ClusterTaskKind } from '@deepseek-ai/dsh-experimental-tool-cluster'
import { clusterOverview } from './overview.ts'
import type { ClusterOverview, ClusterSpendRow } from './types.ts'

/** Structural view of the optional cluster declaration service. */
interface ClusterConfigSource {
  defaultClusterName(): string
  /** Whether a document exists. Present on services that report it. */
  readonly configured?: boolean
  /** Read the document as the text a surface edits. */
  editableText?(): string
  /** Parse, validate and write candidate document text. */
  saveText?(text: string): unknown
}

/** Structural view of the optional folded-spend view. */
interface ClusterSpendSource {
  members(): readonly ClusterSpendRow[]
}

/** Cluster overview service consumed by the Web panel. */
export class ClusterWeb extends TypertRemoteService {
  static inject = ['agentTeams']

  /**
   * Register the service under the name the browser calls.
   * @param ctx - owning context.
   */
  constructor(ctx: Context) {
    super(ctx, 'clusterWeb')
  }

  /**
   * Read the cluster's roster, board, and spend through the generated Remote API.
   * @param agent - exact live Team member used as the authority credential.
   * @returns the read-only view a panel renders, already ordered and counted.
   */
  @Remote('overview')
  remoteOverview(agent: Agent): ClusterOverview {
    const clusterName = this.clusterName()
    const classify = this.classify()
    const configured = this.lookup<ClusterConfigSource>('clusterConfig')?.configured
    return clusterOverview({
      ...clusterName === undefined ? {} : { clusterName },
      // Absent means the service predates the flag or is not mounted; a panel
      // must not block a cluster it cannot get an answer about.
      ...configured === undefined ? {} : { configured },
      view: {
        members: this.ctx.agentTeams.listMembers(agent),
        tasks: this.ctx.agentTeams.listTasks(agent),
      },
      spend: this.spend() ?? [],
      ...classify === undefined ? {} : { classify },
    })
  }

  /**
   * Write edited document text through the generated Remote API.
   *
   * The text is parsed and validated by the service that owns the schema, so a
   * rejected field never reaches the disk and the reason travels back as a value
   * rather than as a transport failure: a rejected field is an ordinary outcome
   * of editing, not an exception a panel has to catch to stay usable. Authority
   * is the same as for reading, and a service that cannot accept text says so.
   * @param agent - exact live Team member used as the authority credential.
   * @param text - candidate document text, parsed and validated before it is written.
   * @returns whether it was written, and the reason when it was not.
   */
  @Remote('saveConfiguration')
  remoteSaveConfiguration(agent: Agent, text: string): { saved: true } | { saved: false; reason: string } {
    this.requireMember(agent)
    const source = this.lookup<ClusterConfigSource>('clusterConfig')
    if (source?.saveText === undefined) {
      return { saved: false, reason: 'this cluster configuration service cannot accept text, so a panel cannot write it' }
    }
    try {
      source.saveText(text)
      return { saved: true }
    } catch (error) {
      return { saved: false, reason: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Read the document a settings surface edits.
   *
   * The text is produced by the service that owns the document, for the same
   * reason the write is parsed there: a client that formatted or parsed on its own
   * would hold a second opinion about the same file. An unconfigured cluster
   * reads as the starter rather than as nothing, because the panel's job in that
   * state is to hand the user something to edit; whether a file already exists
   * travels alongside it, so the surface can say so instead of implying an empty
   * document was loaded from disk.
   * @param agent - exact live Team member used as the authority credential.
   * @returns whether a document exists, and the text to edit.
   * @throws Error when the caller is not a cluster member or no service is mounted.
   */
  @Remote('readConfiguration')
  remoteReadConfiguration(agent: Agent): { configured: boolean; text: string } {
    this.requireMember(agent)
    const source = this.lookup<ClusterConfigSource>('clusterConfig')
    if (source === undefined) {
      throw new Error('no cluster configuration service is mounted, so there is nothing to read or write')
    }
    // A service that predates this reader still answers the declaration questions
    // this package depends on, so it reports that it cannot edit rather than
    // refusing the panel outright.
    if (source.editableText === undefined) {
      throw new Error('this cluster configuration service cannot produce document text, so a panel cannot edit it')
    }
    return { configured: source.configured ?? false, text: source.editableText.call(source) }
  }

  /**
   * Refuse a caller that belongs to no cluster.
   *
   * Reading and writing both go through this, so a session that is not part of a
   * cluster gets the same answer whichever one it asks for.
   * @param agent - exact live Team member used as the authority credential.
   * @throws Error when the member is in no cluster.
   */
  private requireMember(agent: Agent): void {
    if (this.ctx.agentTeams.listMembers(agent).length === 0) {
      throw new Error(`session ${agent.id} belongs to no cluster, so it cannot configure one`)
    }
  }

  /** Read the declared cluster name, when a composition mounts the declarations. */
  private clusterName(): string | undefined {
    const source = this.lookup<ClusterConfigSource>('clusterConfig')
    return source === undefined ? undefined : source.defaultClusterName()
  }

  /**
   * Read the protocol vocabulary the tool package publishes.
   *
   * The vocabulary is read across the service boundary rather than imported: a
   * value import of another workspace package does not resolve in this
   * repository's test resolution, while a structural read — the same shape used
   * for the declarations and the spend — does. Without it the view reports no
   * kinds instead of guessing one.
   */
  private classify(): ((subject: string) => ClusterTaskKind) | undefined {
    const source = this.lookup<ClusterProtocols>('clusterProtocols')
    return source === undefined ? undefined : subject => source.kindOf(subject)
  }

  /** Read the folded spend rows, when a composition folds any. */
  private spend(): readonly ClusterSpendRow[] | undefined {
    const source = this.lookup<ClusterSpendSource>('clusterSpend')
    return source === undefined ? undefined : source.members()
  }

  /**
   * Read one optional service without requiring it.
   * @param name - service name to look up.
   * @returns the service, or undefined when the composition mounts none.
   */
  private lookup<T>(name: string): T | undefined {
    return (this.ctx as unknown as { get(key: string): unknown }).get(name) as T | undefined
  }
}

export default ClusterWeb
