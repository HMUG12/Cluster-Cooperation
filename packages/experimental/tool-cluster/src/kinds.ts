/**
 * Which protocol opened a board row.
 *
 * The classification belongs beside the protocols, because the subject prefixes
 * are theirs. It is published as a service rather than re-exported for import:
 * a value import across workspace packages does not survive this repository's
 * test resolution, while a service read structurally — the same way the cluster
 * command reads the declarations and the spend — does.
 *
 * @module @deepseek-ai/dsh-experimental-tool-cluster
 */

import { SPEECH_SUBJECT_PREFIX, VERDICT_SUBJECT_PREFIX } from './debate.ts'
import { BALLOT_SUBJECT_PREFIX, TALLY_SUBJECT_PREFIX } from './motion.ts'

/** What one board row is, as far as the cluster protocols are concerned. */
export type ClusterTaskKind = 'ballot' | 'tally' | 'speech' | 'verdict' | 'task'

/** The vocabulary a reader of the board needs, and nothing else. */
export interface ClusterProtocols {
  /**
   * Classify one board row by the subject prefix its protocol owns.
   * @param subject - the row's subject line.
   * @returns the protocol that opened the row, or `task` for an ordinary one.
   */
  kindOf(subject: string): ClusterTaskKind
}

/**
 * Classify one board row by the subject prefix its protocol owns.
 * @param subject - the row's subject line.
 * @returns the protocol that opened the row, or `task` for an ordinary one.
 */
export function clusterTaskKind(subject: string): ClusterTaskKind {
  if (subject.startsWith(BALLOT_SUBJECT_PREFIX)) return 'ballot'
  if (subject.startsWith(TALLY_SUBJECT_PREFIX)) return 'tally'
  if (subject.startsWith(SPEECH_SUBJECT_PREFIX)) return 'speech'
  if (subject.startsWith(VERDICT_SUBJECT_PREFIX)) return 'verdict'
  return 'task'
}
