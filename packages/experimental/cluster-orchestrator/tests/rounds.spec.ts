/** The round counts, folded without a live Team. */

import { describe, expect, it } from 'vitest'
import { countTurn, roundsSummary, type MemberRounds } from '../src/rounds.ts'

describe('countTurn', () => {
  it('adds a member at the turn it reported', () => {
    expect(countTurn([], 'coder', 3)).toEqual([{ name: 'coder', turns: 3 }])
  })

  it('keeps the highest turn seen, so a replayed or stale observation cannot lower it', () => {
    const once = countTurn([], 'coder', 3)
    expect(countTurn(once, 'coder', 3)).toBe(once)
    expect(countTurn(once, 'coder', 2)).toBe(once)
    expect(countTurn(once, 'coder', 4)).toEqual([{ name: 'coder', turns: 4 }])
  })

  it('keeps the rows name-sorted whatever order the members are seen in', () => {
    const rows = countTurn(countTurn(countTurn([], 'tester', 1), 'lead', 2), 'coder', 1)
    expect(rows.map(row => row.name)).toEqual(['coder', 'lead', 'tester'])
  })
})

describe('roundsSummary', () => {
  it('states nothing when no member has taken a turn', () => {
    expect(roundsSummary([])).toBeUndefined()
  })

  it('states how many members turned and how many turns they took together', () => {
    const rows: readonly MemberRounds[] = [{ name: 'coder', turns: 3 }, { name: 'lead', turns: 4 }]
    expect(roundsSummary(rows)).toEqual({ members: 2, turns: 7 })
  })
})
