/** Roundtable planning: who is asked, who collects, and what every text says. */

import { describe, expect, it } from 'vitest'
import type { TeamMemberView } from '@deepseek-ai/dsh-experimental-agent-team'
import {
  ANSWER_MARKER,
  answerDescription,
  answerSubject,
  questionMessage,
  roundtablePlan,
  synthesisDescription,
  synthesisSubject,
} from '../src/roundtable.ts'

/** Build one roster row with only the fields a roundtable reads. */
function member(
  name: string,
  role: TeamMemberView['role'],
  status: TeamMemberView['status'] = 'idle',
): TeamMemberView {
  return { id: name as TeamMemberView['id'], name, role, status, diagnostics: [] } as TeamMemberView
}

const ROSTER = [
  member('lead', 'lead', 'running'),
  member('coder', 'teammate'),
  member('tester', 'teammate'),
  member('broken', 'teammate', 'failed'),
]

describe('roundtablePlan', () => {
  it('asks every teammate by default, and keeps the collector out of it', () => {
    const decision = roundtablePlan(undefined, ROSTER, 'tester')
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.plan.ask).toEqual(['coder'])
    expect(decision.plan.synthesizer).toBe('tester')
  })

  it('narrows to the participants the caller named', () => {
    const decision = roundtablePlan(['coder', 'tester'], ROSTER, 'tester')
    expect(decision.ok && decision.plan.ask).toEqual(['coder'])
  })

  it('refuses the Lead as collector, because no notice can wake the Lead', () => {
    const decision = roundtablePlan(undefined, ROSTER, 'lead')
    expect(decision.ok).toBe(false)
    if (decision.ok) return
    expect(decision.reason).toContain('no notice can wake the Lead')
  })

  it('refuses a collector the roster does not carry', () => {
    const decision = roundtablePlan(undefined, ROSTER, 'ghost')
    expect(decision.ok).toBe(false)
    if (decision.ok) return
    expect(decision.reason).toContain('not a member')
  })

  it('refuses a collector that failed at provisioning', () => {
    const decision = roundtablePlan(undefined, ROSTER, 'broken')
    expect(decision.ok).toBe(false)
    if (decision.ok) return
    expect(decision.reason).toContain('failed at provisioning')
  })

  it('refuses a collector the board could not assign yet, and skips such a participant', () => {
    const planning = [...ROSTER, member('newbie', 'teammate', 'provisioning')]
    const refused = roundtablePlan(undefined, planning, 'newbie')
    expect(refused.ok).toBe(false)
    if (!refused.ok) expect(refused.reason).toContain('still provisioning')

    const decision = roundtablePlan(['coder', 'newbie'], planning, 'tester')
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.plan.ask).toEqual(['coder'])
    expect(decision.plan.skipped.map(skip => skip.target)).toEqual(['newbie'])
  })

  it('refuses a roundtable nobody can be asked in', () => {
    const alone = [member('lead', 'lead'), member('tester', 'teammate')]
    const decision = roundtablePlan(undefined, alone, 'tester')
    expect(decision.ok).toBe(false)
    if (decision.ok) return
    expect(decision.reason).toContain('no teammate can receive the question')
  })

  it('reports the participants it refused instead of dropping them', () => {
    const decision = roundtablePlan(['coder', 'nobody'], ROSTER, 'tester')
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.plan.skipped.map(skip => skip.target)).toEqual(['nobody'])
  })
})

describe('texts', () => {
  it('carries only the first line of a multi-line question into a subject', () => {
    expect(answerSubject('Which cache?\nConsider cost.')).toBe('Roundtable: Which cache?')
    expect(synthesisSubject('Which cache?\nConsider cost.')).toBe('Synthesis: Which cache?')
  })

  it('spells out the board calls that answer a task', () => {
    const description = answerDescription('Which cache?', 'tester')
    expect(description).toContain('Which cache?')
    // The orchestrator assigns the row before delivering the notice, and the
    // board refuses a claim on a row that is already in progress.
    expect(description).not.toContain('action "claim"')
    expect(description).toContain(`"${ANSWER_MARKER}<your answer>"`)
    expect(description).toContain('"complete"')
    expect(description).toContain('"tester" collects every answer')
  })

  it('names the answers and declares the collector the release will assign', () => {
    const description = synthesisDescription('Which cache?', 'tester', ['task-7', 'task-8'])
    expect(description).toContain('task-7, task-8')
    expect(description).toContain('blocked until every answer lands')
    expect(description).toContain('cluster-owner: tester')
  })

  it('says so when the synthesis task is created before any answer exists', () => {
    expect(synthesisDescription('Which cache?', 'tester', [])).toContain('Answers: none yet')
  })

  it('points a participant at the task that carries the question', () => {
    const message = questionMessage('task-7', 'Which cache?\nConsider cost.')
    expect(message).toContain('[ROUNDTABLE] task-7 is yours: Which cache?')
    expect(message).toContain('team_task_get')
    expect(message).toContain('complete it')
  })
})
