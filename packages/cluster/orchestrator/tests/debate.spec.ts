/** Debate planning and reading: who argues in which round, and what a verdict weighs. */

import { describe, expect, it } from 'vitest'
import type { TeamMemberView, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import {
  debatePlan,
  debateSummary,
  isSpeechTask,
  isVerdictTask,
  MAX_DEBATE_ROUNDS,
  MAX_DEBATE_SPEECHES,
  readStatements,
  speechDescription,
  speechMessage,
  speechSubject,
  statementOf,
  verdictDescription,
  verdictSubject,
} from '../src/debate.ts'

/** Build one roster row with only the fields a debate reads. */
function member(
  name: string,
  role: TeamMemberView['role'],
  status: TeamMemberView['status'] = 'idle',
): TeamMemberView {
  return { id: name as TeamMemberView['id'], name, role, status, diagnostics: [] } as TeamMemberView
}

/** Build one board row with only the fields a debate reads. */
function task(
  id: string,
  status: TeamTaskView['status'],
  description = '',
  blockedBy: string[] = [],
  subject = `subject-${id}`,
): TeamTaskView {
  return {
    id: id as TeamTaskView['id'],
    revision: 1,
    subject,
    description,
    status,
    blockedBy: blockedBy as TeamTaskView['blockedBy'],
    writeScopes: [],
    ready: false,
    writeScopeWarnings: [],
  } as TeamTaskView
}

const ROSTER = [
  member('lead', 'lead', 'running'),
  member('coder', 'teammate'),
  member('tester', 'teammate'),
  member('reviewer', 'teammate'),
  member('broken', 'teammate', 'failed'),
  member('newbie', 'teammate', 'provisioning'),
]

/** Eight teammates, the widest roster the row cap can still be exceeded on. */
const WIDE = [
  member('lead', 'lead', 'running'),
  ...Array.from({ length: 8 }, (_unused, index) => member(`seat-${index + 1}`, 'teammate')),
]

describe('debatePlan', () => {
  it('seats the whole roster except the judge when the caller names no speakers', () => {
    const decision = debatePlan(undefined, ROSTER, 2, 'reviewer')
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.plan.speakers).toEqual(['coder', 'tester'])
    expect(decision.plan.rounds).toBe(2)
    expect(decision.plan.judge).toBe('reviewer')
    // A debate with a broken or starting teammate still runs on the rest.
    expect(decision.plan.skipped.map(skip => skip.target)).toEqual(['broken', 'newbie'])
  })

  it('refuses one round, which is a roundtable rather than a debate', () => {
    const decision = debatePlan(undefined, ROSTER, 1, 'reviewer')
    expect(decision.ok).toBe(false)
    if (decision.ok) return
    expect(decision.reason).toContain('at least two rounds')
  })

  it('refuses a debate longer than the round cap', () => {
    const decision = debatePlan(undefined, ROSTER, MAX_DEBATE_ROUNDS + 1, 'reviewer')
    expect(decision.ok).toBe(false)
    if (decision.ok) return
    expect(decision.reason).toContain(`${MAX_DEBATE_ROUNDS} is the cap`)
  })

  it('refuses a judge the board could not assign, exactly as a roundtable refuses a collector', () => {
    expect(debatePlan(undefined, ROSTER, 2, 'ghost').ok).toBe(false)
    expect(debatePlan(undefined, ROSTER, 2, 'broken').ok).toBe(false)
    const starting = debatePlan(undefined, ROSTER, 2, 'newbie')
    expect(starting.ok).toBe(false)
    if (!starting.ok) expect(starting.reason).toContain('still provisioning')
  })

  it('refuses a judge that was also named as a speaker, the one role a debate keeps apart', () => {
    const decision = debatePlan(['coder', 'tester', 'reviewer'], ROSTER, 2, 'reviewer')
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.plan.speakers).toEqual(['coder', 'tester'])
    expect(decision.plan.skipped).toHaveLength(1)
    expect(decision.plan.skipped[0]?.target).toBe('reviewer')
    expect(decision.plan.skipped[0]?.reason).toContain('a judge who did not argue')
  })

  it('refuses a debate with fewer than two speakers', () => {
    const decision = debatePlan(['coder'], ROSTER, 2, 'reviewer')
    expect(decision.ok).toBe(false)
    if (decision.ok) return
    expect(decision.reason).toContain('at least two speakers')
  })

  it('refuses a debate whose rounds would open more speeches than the cap allows', () => {
    const decision = debatePlan(undefined, WIDE, MAX_DEBATE_ROUNDS, 'seat-8')
    expect(decision.ok).toBe(false)
    if (decision.ok) return
    expect(decision.reason).toContain(`${MAX_DEBATE_SPEECHES} is the cap`)
  })
})

describe('debate vocabulary', () => {
  it('names the round in a speech and the topic in the verdict', () => {
    expect(speechSubject(2, 3, 'Ship on Friday?\nOr Monday?')).toBe('Debate 2/3: Ship on Friday?')
    expect(verdictSubject('Ship on Friday?')).toBe('Verdict: Ship on Friday?')
    expect(isSpeechTask(task('task-1', 'pending', '', [], speechSubject(1, 2, 'x')))).toBe(true)
    expect(isVerdictTask(task('task-2', 'pending', '', [], verdictSubject('x')))).toBe(true)
    expect(isSpeechTask(task('task-3', 'pending', '', [], verdictSubject('x')))).toBe(false)
    expect(isVerdictTask(task('task-4', 'pending', '', [], speechSubject(1, 2, 'x')))).toBe(false)
  })

  it('reads the argument a speech records, and nothing when the line is absent', () => {
    expect(statementOf(task('task-1', 'completed', 'Round 1\nstatement: ship it'))).toBe('ship it')
    expect(statementOf(task('task-2', 'completed', 'no marker here'))).toBeUndefined()
  })

  it('renders one speech with its round, its call shape, the round it answers, and its owner', () => {
    const description = speechDescription('Ship now?', 'coder', 2, 3, 'reviewer', ['task-1', 'task-2'])
    expect(description).toContain('Ship now?')
    expect(description).toContain('Round 2 of 3')
    expect(description).toContain('claim nothing')
    expect(description).toContain('"statement: <your argument>"')
    expect(description).toContain('Read task-1, task-2 first')
    expect(description).toContain('cluster-owner: coder')
  })

  it('opens the first round with no round to answer', () => {
    const description = speechDescription('Ship now?', 'coder', 1, 3, 'reviewer', [])
    expect(description).toContain('opening round')
    expect(description).not.toContain('Read ')
  })

  it('renders the verdict with the final round and the marker that assigns it', () => {
    const description = verdictDescription('Ship now?', 'reviewer', ['task-5', 'task-6'])
    expect(description).toContain('task-5, task-6')
    expect(description).toContain('cluster-owner: reviewer')
    expect(verdictDescription('Ship now?', 'reviewer', [])).toContain('Final round: none yet')
  })

  it('names the round in the opening notice', () => {
    const message = speechMessage('task-1', 1, 3)
    expect(message).toContain('[DEBATE] task-1 is your round 1 of 3 speech')
    expect(message).toContain('statement:')
  })
})

describe('readStatements', () => {
  const verdict = task('task-9', 'pending', '', ['task-5', 'task-6', 'task-7'], verdictSubject('Ship now?'))

  it('counts what a verdict can weigh, and names what it cannot', () => {
    const reading = readStatements(verdict, [
      verdict,
      task('task-5', 'completed', 'statement: ship it'),
      task('task-6', 'completed', 'statement: wait'),
      task('task-7', 'completed', 'no marker'),
    ])
    expect(reading).toEqual({ readable: 2, unreadable: 1, outstanding: 0, total: 3 })
    expect(debateSummary(reading)).toContain('2 of 3 arguments in the final round are readable')
    expect(debateSummary(reading)).toContain('1 closed without a "statement:" line')
  })

  it('reports a speech the board does not carry as outstanding rather than dropping it', () => {
    const reading = readStatements(verdict, [verdict, task('task-5', 'completed', 'statement: ship it')])
    expect(reading).toEqual({ readable: 1, unreadable: 0, outstanding: 2, total: 3 })
    expect(debateSummary(reading)).toContain('2 still unsettled')
  })

  it('says so plainly when every argument of the final round is readable', () => {
    const reading = readStatements(verdict, [
      verdict,
      task('task-5', 'completed', 'statement: x'),
      task('task-6', 'completed', 'statement: y'),
      task('task-7', 'completed', 'statement: z'),
    ])
    expect(debateSummary(reading)).toBe('3 of 3 arguments in the final round are readable.')
  })
})
