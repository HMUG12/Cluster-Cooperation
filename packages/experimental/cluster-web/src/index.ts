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
interface ClusterNameSource {
  defaultClusterName(): string
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
    return clusterOverview({
      ...clusterName === undefined ? {} : { clusterName },
      view: {
        members: this.ctx.agentTeams.listMembers(agent),
        tasks: this.ctx.agentTeams.listTasks(agent),
      },
      spend: this.spend() ?? [],
      ...classify === undefined ? {} : { classify },
    })
  }

  /** Read the declared cluster name, when a composition mounts the declarations. */
  private clusterName(): string | undefined {
    const source = this.lookup<ClusterNameSource>('clusterConfig')
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
