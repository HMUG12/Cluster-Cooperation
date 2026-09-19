/**
 * Bind every Agent Team member to the provider and model its role declares.
 *
 * `spawn_teammate` threads no model through `ctx.agentTeams`, so an ordinary
 * teammate inherits the Lead's route. This plugin restores role-based routing
 * by installing a per-Agent model selection as each member is published.
 *
 * @module @deepseek-ai/dsh-cluster-router
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { installModelSelection, type Agent, type ModelSelectionRef } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-cluster-config'
import type {} from '@deepseek-ai/dsh-experimental-agent-team'

/** Cordis plugin name. */
export const name = 'cluster-router'

/** Services required by the cluster router. */
export const inject = ['agents', 'agentTeams', 'clusterConfig']

/** Cluster routing configuration. */
export interface Config {
  /** Cluster whose routes apply. Defaults to the document's `defaultCluster`. */
  readonly cluster?: string
}

/** Loader schema for the cluster router. */
export const Config: z<Config> = z.object({
  cluster: z.string(),
})

/**
 * Couple each published Team member to its configured route.
 * @param ctx - plugin context owning the registrations.
 * @param config - resolved router configuration.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const installed = new Map<Agent, () => void>()
  const maybeInstall = (agent: Agent): void => {
    if (installed.has(agent)) return
    const membership = ctx.agentTeams.tryMembership(agent)
    if (membership === undefined) return
    const cluster = config.cluster ?? ctx.clusterConfig.defaultClusterName()
    const route = ctx.clusterConfig.routeFor(cluster, membership.name)
    if (route === undefined) {
      ctx.logger.warn(
        'cluster-router: member "%s" has no route in cluster "%s"; keeping the inherited model',
        membership.name,
        cluster,
      )
      return
    }
    const selection: ModelSelectionRef = { current: route, assembled: undefined }
    installed.set(agent, installModelSelection(agent.ctx, selection))
  }
  for (const agent of ctx.agents.list()) maybeInstall(agent)
  ctx.on('agent/created', ({ agent }) => { maybeInstall(agent) })
  ctx.on('agent/disposed', ({ agent }) => {
    installed.get(agent)?.()
    installed.delete(agent)
  })
  ctx.effect(() => () => {
    for (const dispose of installed.values()) dispose()
    installed.clear()
  }, 'cluster-router.modelSelection()')
}
