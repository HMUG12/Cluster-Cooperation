/**
 * Source-safe cluster panel registration and Remote mount lifecycle.
 *
 * @module @deepseek-ai/dsh-experimental-cluster-web/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-experimental-cluster-web/remote'
import type { TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'
import { ClusterPanel, type ClusterPanelInjected } from './ClusterPanel.tsx'
import { en, NS, zh, type ClusterKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Cluster roster, board, counts, and spend copy. */
    'cluster': ClusterKey
  }
}

/** Required browser services for RPC, slots, and localized copy. */
export const inject = ['remote', 'slots', 'locale']

/** The session whose cluster a panel reads: the credential the view is scoped to. */
type ClusterSessionId = SessionId

function registerUi(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'cluster-web: dictionaries')
  const actions: ClusterPanelInjected = {
    async load(sessionId: ClusterSessionId) {
      return await ctx.remote.clusterWeb.overview(sessionId)
    },
  }
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'cluster',
    order: 30,
    locale: NS,
    inject: () => actions,
  }, ClusterPanel))
}

/**
 * Mount the generated cluster Remote contribution, then register its panel.
 * @param ctx - Client Context carrying locale, slot, and Remote services.
 * @param contribution - generated cluster descriptors selected by the browser entry.
 * @returns disposer for both the UI registration and the Remote namespace.
 */
export async function mountClusterUi(
  ctx: ClientContext,
  contribution: TypertRemoteContribution,
): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(contribution)
  const ui = ctx.inject(['remote.clusterWeb', 'slots', 'locale'], registerUi)
  try {
    await ui
  } catch (error) {
    await ui.dispose()
    await disposeRemote()
    throw error
  }
  return async () => {
    await ui.dispose()
    await disposeRemote()
  }
}
