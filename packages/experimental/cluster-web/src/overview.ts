/**
 * The derivation behind the cluster view: classification, ordering, and counts.
 *
 * The derivation lives on the host on purpose: a browser bundle may not import
 * another plugin's values, so the panel can only lay out a payload that already
 * says what it means. Every rule here is a pure function of the roster, the
 * board, the spend, and the classifier the composition publishes — which is why
 * the tests need no live Team.
 *
 * @module @deepseek-ai/dsh-experimental-cluster-web
 */

import type {
  ClusterMemberRow,
  ClusterOverview,
  ClusterOverviewInput,
  ClusterTaskKind,
  ClusterTaskRow,
} from './types.ts'

/** Every kind, so a zero stays a zero instead of a missing key. */
const KINDS: readonly ClusterTaskKind[] = ['ballot', 'tally', 'speech', 'verdict', 'task']

/**
 * Build the read-only view a panel renders.
 *
 * Ordering is fixed rather than incidental — the Lead leads the roster, members
 * break ties by name, and tasks sort by identity — so two reads of the same
 * board print the same rows, which is what a person comparing two views needs.
 * @param input - the roster, the board, whatever spend is published, and the classifier when one is.
 * @returns the rows plus the counts over them.
 */
export function clusterOverview(input: ClusterOverviewInput): ClusterOverview {
  const { classify } = input
  const members = [...input.view.members]
    .sort((left, right) => (left.role === right.role ? left.name.localeCompare(right.name) : left.role === 'lead' ? -1 : 1))
    .map((member): ClusterMemberRow => ({
      name: member.name,
      role: member.role,
      status: member.status,
      ...member.model === undefined ? {} : { model: member.model },
    }))
  const tasks = [...input.view.tasks]
    .sort((left, right) => String(left.id).localeCompare(String(right.id)))
    .map((task): ClusterTaskRow => ({
      id: String(task.id),
      subject: task.subject,
      status: task.status,
      ...task.ownerName === undefined ? {} : { owner: task.ownerName },
      ready: task.ready,
      blockedBy: task.blockedBy.map(String),
      ...classify === undefined ? {} : { kind: classify(task.subject) },
    }))
  return {
    ...input.clusterName === undefined ? {} : { clusterName: input.clusterName },
    members,
    tasks,
    spend: input.spend ?? [],
    counts: {
      members: members.length,
      tasks: tasks.length,
      ready: tasks.filter(task => task.ready).length,
      blocked: tasks.filter(task => task.blockedBy.length > 0 && !task.ready).length,
      ...classify === undefined ? {} : {
        byKind: Object.fromEntries(
          KINDS.map(kind => [kind, tasks.filter(task => task.kind === kind).length]),
        ) as Record<ClusterTaskKind, number>,
      },
    },
  }
}
