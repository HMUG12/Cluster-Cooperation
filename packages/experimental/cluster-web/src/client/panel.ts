/**
 * What the panel shows, as data rather than as markup.
 *
 * The component that draws this is a thin mapper on purpose: ordering, grouping,
 * and every label decision are decided here, where a test can read them without
 * a browser. Nothing here decides *what happened* — that is the host's view —
 * and nothing here spells copy of its own, because every string a reader sees
 * arrives through the translator.
 *
 * @module @deepseek-ai/dsh-experimental-cluster-web/client
 */

import type { ClusterOverview, ClusterSpendRow, ClusterTaskKind } from '../types.ts'
import type { ClusterKey } from './locales.ts'

/** One line the panel renders. */
export interface PanelRow {
  /** Stable identity, used as the render key. */
  readonly key: string
  /** Leading text. */
  readonly label: string
  /** Supporting text, already translated. */
  readonly detail: string
  /** Trailing state, already translated; empty when the row has no state. */
  readonly status: string
}

/** One titled group of rows. */
export interface PanelSection {
  /** Stable identity, used as the render key. */
  readonly key: string
  /** Group title. */
  readonly title: string
  /** Rows in render order. */
  readonly rows: readonly PanelRow[]
  /** What to show instead, when there are no rows. */
  readonly empty: string
}

/** Everything a panel renders, with every string already translated. */
export interface ClusterPanel {
  /** Panel title. */
  readonly title: string
  /** Counts line, then the protocol line when the view carries kinds. */
  readonly summary: readonly string[]
  /** Roster, board, and spend, in that order. */
  readonly sections: readonly PanelSection[]
}

/** Substitute `{name}` placeholders in a translated template. */
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/gu, (match, name: string) =>
    (name in values ? String(values[name]) : match))
}

/** Join the parts that carry text, so an absent part leaves no separator behind. */
function join(parts: readonly (string | undefined)[], separator = ' · '): string {
  return parts.filter((part): part is string => part !== undefined && part !== '').join(separator)
}

/**
 * Build the panel's content from the host's view.
 *
 * Rows keep the order the view already fixed, so two reads of the same board
 * render the same lines — and the kind labels come from the view's classifier
 * rather than from a prefix test repeated here.
 * @param overview - the view the host derived, already ordered and counted.
 * @param t - translator for this panel's namespace.
 * @returns the title, the counts lines, and the three sections.
 */
export function clusterPanel(overview: ClusterOverview, t: (key: ClusterKey) => string): ClusterPanel {
  const kinds: readonly ClusterTaskKind[] = ['ballot', 'tally', 'speech', 'verdict', 'task']
  const kindLabel: Record<ClusterTaskKind, string> = {
    ballot: t('kindBallot'),
    tally: t('kindTally'),
    speech: t('kindSpeech'),
    verdict: t('kindVerdict'),
    task: t('kindTask'),
  }
  const counts = overview.counts
  const summary = [
    fill(t('summary'), {
      members: counts.members,
      tasks: counts.tasks,
      ready: counts.ready,
      blocked: counts.blocked,
    }),
  ]
  const byKind = counts.byKind
  if (byKind !== undefined) {
    summary.push(fill(t('summaryKinds'), Object.fromEntries(kinds.map(kind => [kind, byKind[kind]]))))
  }
  const spend: readonly ClusterSpendRow[] = overview.spend
  return {
    title: overview.clusterName === undefined ? t('title') : `${t('title')} · ${overview.clusterName}`,
    summary,
    sections: [
      {
        key: 'roster',
        title: t('roster'),
        empty: t('emptyRoster'),
        rows: overview.members.map(member => ({
          key: `member:${member.name}`,
          label: member.name,
          detail: join([
            member.role === 'lead' ? t('roleLead') : t('roleTeammate'),
            member.model,
          ]),
          status: t(`memberStatus.${member.status}`),
        })),
      },
      {
        key: 'board',
        title: t('board'),
        empty: t('emptyBoard'),
        rows: overview.tasks.map(task => ({
          key: `task:${task.id}`,
          label: task.subject,
          detail: join([
            task.kind === undefined ? undefined : kindLabel[task.kind],
            task.owner ?? t('unowned'),
            task.ready ? undefined : t('blocked'),
          ]),
          status: t(`status.${task.status}`),
        })),
      },
      {
        key: 'spend',
        title: t('spend'),
        empty: t('emptySpend'),
        rows: spend.map(row => ({
          key: `spend:${row.name}`,
          label: row.name,
          detail: join([
            `${String(row.billable)} ${t('billable')}`,
            `${String(row.calls)} ${t('calls')}`,
            row.budget === undefined ? undefined : fill(t('budgetOf'), { budget: row.budget }),
          ]),
          status: row.overBudget === true ? t('overBudget') : '',
        })),
      },
    ],
  }
}
