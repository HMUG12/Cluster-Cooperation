/**
 * Per-member turn counts, folded from the stop boundary of each member's turns.
 *
 * The counts are a read-only projection for whoever reports them: nothing here
 * ends a turn, because a listener at that boundary cannot.
 *
 * @module @deepseek-ai/dsh-experimental-cluster-orchestrator
 */

/** One member's counted turns. */
export interface MemberRounds {
  /** Member name the roster and the board address. */
  readonly name: string
  /** Highest turn number seen for this member. */
  readonly turns: number
}

/**
 * Fold one observed turn number into the counted rows.
 *
 * The stop boundary reports the turn about to close, and a turn number only
 * grows, so the highest number seen is the count: replaying an observation, or
 * observing the same turn twice, cannot inflate it.
 * @param rows - counts so far, name-sorted.
 * @param name - member the observation belongs to.
 * @param turn - turn number the stop boundary reported.
 * @returns the updated rows, name-sorted.
 */
export function countTurn(rows: readonly MemberRounds[], name: string, turn: number): readonly MemberRounds[] {
  const known = rows.find(row => row.name === name)
  if (known !== undefined && known.turns >= turn) return rows
  const counted = known === undefined
    ? [...rows, { name, turns: turn }]
    : rows.map(row => row.name === name ? { name, turns: turn } : row)
  return [...counted].sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
}

/**
 * Summarize counted turns for a report.
 * @param rows - counted rows.
 * @returns how many members have taken a turn and the total they took, or undefined when none has.
 */
export function roundsSummary(
  rows: readonly MemberRounds[],
): { readonly members: number; readonly turns: number } | undefined {
  if (rows.length === 0) return undefined
  return {
    members: rows.length,
    turns: rows.reduce((total, row) => total + row.turns, 0),
  }
}
