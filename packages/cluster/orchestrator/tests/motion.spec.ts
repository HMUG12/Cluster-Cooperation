/** Motion planning and counting: who votes, and what the board counts. */

import { describe, expect, it } from 'vitest'
import type { TeamMemberView, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import {
  ballotDescription,
  ballotMessage,
  ballotSubject,
  isTallyTask,
  motionPlan,
  readTally,
  tallyDescription,
  tallySubject,
  tallySummary,
  votePosition,
} from '../src/motion.ts'

/** Build one roster row with only the fields a motion reads. */
function member(
  name: string,
  role: TeamMemberView['role'],
  status: TeamMemberView['status'] = 'idle',
): TeamMemberView {
  return { id: name as TeamMemberView['id'], name, role, status, diagnostics: [] } as TeamMemberView
}

/** Build one board row with only the fields a count reads. */
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
  member('broken', 'teammate', 'failed'),
]

describe('motionPlan', () => {
  it('asks every teammate by default, and keeps the counter out of it', () => {
    const decision = motionPlan(undefined, ROSTER, 'tester')
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.plan.ask).toEqual(['coder'])
    expect(decision.plan.counter).toBe('tester')
  })

  it('refuses the Lead as counter, because no notice can wake the Lead', () => {
    const decision = motionPlan(undefined, ROSTER, 'lead')
    expect(decision.ok).toBe(false)
    if (decision.ok) return
    expect(decision.reason).toContain('no notice can wake the Lead')
  })

  it('refuses a counter the roster does not carry, or one that failed', () => {
    expect(motionPlan(undefined, ROSTER, 'ghost').ok).toBe(false)
    expect(motionPlan(undefined, ROSTER, 'broken').ok).toBe(false)
  })

  it('refuses a motion nobody can vote in', () => {
    const alone = [member('lead', 'lead'), member('tester', 'teammate')]
    const decision = motionPlan(undefined, alone, 'tester')
    expect(decision.ok).toBe(false)
    if (decision.ok) return
    expect(decision.reason).toContain('no teammate can cast a ballot')
  })

  it('reports the voters it refused instead of dropping them', () => {
    const decision = motionPlan(['coder', 'nobody'], ROSTER, 'tester')
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.plan.skipped.map(skip => skip.target)).toEqual(['nobody'])
  })
})

describe('votePosition', () => {
  it('reads a recorded position, whatever its case', () => {
    expect(votePosition(task('task-1', 'completed', 'motion\nvote: for'))).toBe('for')
    expect(votePosition(task('task-1', 'completed', 'vote: AGAINST'))).toBe('against')
    expect(votePosition(task('task-1', 'completed', 'vote: abstain'))).toBe('abstain')
  })

  it('reports a ballot with no readable line as unrecorded', () => {
    expect(votePosition(task('task-1', 'completed', 'no line'))).toBe('unrecorded')
    expect(votePosition(task('task-1', 'completed', 'vote: maybe'))).toBe('unrecorded')
  })
})

describe('readTally', () => {
  const tallyTask = task('tally', 'completed', '', ['b1', 'b2', 'b3'], 'Tally: motion')
  const board = [
    tallyTask,
    task('b1', 'completed', 'vote: for'),
    task('b2', 'completed', 'vote: against'),
    task('b3', 'completed', 'vote: abstain'),
  ]

  it('counts each settled ballot by the position it recorded', () => {
    expect(readTally(tallyTask, board)).toEqual({
      for: 1, against: 1, abstain: 1, unrecorded: 0, outstanding: 0, total: 3,
    })
  })

  it('counts a completed ballot with no readable line as unrecorded, not as silence', () => {
    const amended = [...board.slice(0, 3), task('b3', 'completed', 'nothing recorded')]
    expect(readTally(tallyTask, amended).unrecorded).toBe(1)
  })

  it('counts an unsettled or missing ballot as outstanding', () => {
    const amended = [tallyTask, task('b1', 'completed', 'vote: for'), task('b2', 'in_progress', 'vote: against')]
    const counted = readTally(tallyTask, amended)
    expect(counted.for).toBe(1)
    expect(counted.outstanding).toBe(2)
    expect(counted.total).toBe(3)
  })

  it('counts nothing when the roll is empty', () => {
    const empty = task('tally', 'pending', '', [], 'Tally: motion')
    expect(readTally(empty, [empty]).total).toBe(0)
  })
})

describe('tallySummary', () => {
  it('states the count and the roll size', () => {
    expect(tallySummary({ for: 2, against: 1, abstain: 0, unrecorded: 0, outstanding: 0, total: 3 }))
      .toBe('2 for, 1 against, 0 abstain of 3 ballots.')
  })

  it('names every caveat the count carries', () => {
    const summary = tallySummary({ for: 1, against: 0, abstain: 0, unrecorded: 1, outstanding: 2, total: 4 })
    expect(summary).toContain('1 with no readable "vote:" line')
    expect(summary).toContain('2 still unsettled')
  })
})

describe('texts', () => {
  it('carries only the first line of a multi-line motion into a subject', () => {
    expect(ballotSubject('Ship on Friday?\nOr Monday?')).toBe('Ballot: Ship on Friday?')
    expect(tallySubject('Ship on Friday?\nOr Monday?')).toBe('Tally: Ship on Friday?')
  })

  it('spells out the three positions a ballot can record', () => {
    const description = ballotDescription('Ship now?', 'tester')
    expect(description).toContain('"vote: for", "vote: against", or "vote: abstain"')
    expect(description).toContain('counts as unrecorded')
    expect(description).toContain('readable by every member')
  })

  it('tells the counter that the notice carries the count', () => {
    const description = tallyDescription('Ship now?', 'tester', ['task-7', 'task-8'])
    expect(description).toContain('task-7, task-8')
    expect(description).toContain('carries the count the board already agrees on')
    expect(description).toContain('report it to the Lead')
    expect(description).toContain('cluster-owner: tester')
  })

  it('points a voter at the ballot that carries the motion', () => {
    const message = ballotMessage('task-7', 'Ship now?\nOr later?')
    expect(message).toContain('[MOTION] task-7 is your ballot on: Ship now?')
    expect(message).toContain('"vote: abstain"')
  })

  it('recognises its own tally rows and nothing else', () => {
    expect(isTallyTask(task('task-1', 'pending', '', [], 'Tally: ship it'))).toBe(true)
    expect(isTallyTask(task('task-1', 'pending', '', [], 'Roundtable: ship it'))).toBe(false)
  })
})
