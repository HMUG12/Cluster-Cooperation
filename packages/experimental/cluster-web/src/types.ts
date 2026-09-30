/**
 * The cluster view a Web panel renders, and the vocabulary it is built from.
 *
 * These types live on their own public subpath because the Remote boundary
 * crosses to the browser with them: a generated Remote may only name types a
 * consumer can import without reaching into the package's root.
 *
 * @module @deepseek-ai/dsh-experimental-cluster-web
 */

import type { TeamTaskView, TeamMemberView, TeamView } from '@deepseek-ai/dsh-experimental-agent-team'

/** One roster row, flattened for display. */
export interface ClusterMemberRow {
  /** Member name the board and the mailbox address. */
  readonly name: string
  /** Whether the row is the cluster's Lead. */
  readonly role: TeamMemberView['role']
  /** Runtime status, as the roster reports it. */
  readonly status: TeamMemberView['status']
  /** Model the member is bound to, when a route gave it one. */
  readonly model?: string
}

/** One board row with the protocol it belongs to. */
export interface ClusterTaskRow {
  /** Task identity. */
  readonly id: string
  /** Task subject, including the protocol's prefix when it has one. */
  readonly subject: string
  /** Durable task status. */
  readonly status: TeamTaskView['status']
  /** Name of the owning member, when the row is owned. */
  readonly owner?: string
  /** Whether every blocker has completed. */
  readonly ready: boolean
  /** Identities this row waits on. */
  readonly blockedBy: readonly string[]
}

/** One member's folded spend, as whatever publishes it reports. */
export interface ClusterSpendRow {
  /** Member the record belongs to. */
  readonly name: string
  /** Completed model calls counted so far. */
  readonly calls: number
  /** Billable tokens the member has spent. */
  readonly billable: number
  /** Declared token budget, when the cluster declares one. */
  readonly budget?: number
  /** Whether the member is past its budget. */
  readonly overBudget?: boolean
}

/** Counts a panel shows without re-deriving anything. */
export interface ClusterOverviewCounts {
  /** Rows in the roster. */
  readonly members: number
  /** Rows on the board. */
  readonly tasks: number
  /** Rows whose blockers have all completed. */
  readonly ready: number
  /** Rows that are still waiting on at least one blocker. */
  readonly blocked: number
}

/** The whole read-only cluster view. */
export interface ClusterOverview {
  /** Cluster the declarations name, when one is declared. */
  readonly clusterName?: string
  /** Roster, Lead first. */
  readonly members: readonly ClusterMemberRow[]
  /** Board, by identity. */
  readonly tasks: readonly ClusterTaskRow[]
  /** Spend rows, heaviest first as the publisher sorted them. */
  readonly spend: readonly ClusterSpendRow[]
  /** Counts over the rows above. */
  readonly counts: ClusterOverviewCounts
}

/** Everything the view is derived from. */
export interface ClusterOverviewInput {
  /** Cluster name the declarations resolve to, when there is a declaration. */
  readonly clusterName?: string
  /** Point-in-time roster and board. */
  readonly view: TeamView
  /** Folded spend rows, when the composition folds any. */
  readonly spend?: readonly ClusterSpendRow[]
}
