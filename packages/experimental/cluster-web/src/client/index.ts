/** Browser entry binding the generated cluster Remote artifact to its panel. */

import clusterWebRemote from '@deepseek-ai/dsh-experimental-cluster-web/remote'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { mountClusterUi } from './mount.ts'

export { inject } from './mount.ts'
export type { ClusterPanelInjected, ClusterPanelProps } from './ClusterPanel.tsx'
export type { ClusterKey } from './locales.ts'

/**
 * Mount the generated cluster Remote contribution and its browser panel.
 * @param ctx - Client Context carrying locale, slot, and Remote services.
 * @returns disposer for the UI registration and the Remote namespace.
 */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  return await mountClusterUi(ctx, clusterWebRemote)
}
