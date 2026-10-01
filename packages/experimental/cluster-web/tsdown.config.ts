import { clientBundle } from '../../client/tsdown.client.ts'

export default clientBundle(
  '@deepseek-ai/dsh-experimental-cluster-web',
  ['lib/types/index.js'],
  { hostPhase: true },
)
