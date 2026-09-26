/** Broadcast target selection: who receives one Lead message, and who does not. */

import { describe, expect, it } from 'vitest'
import type { TeamMemberView } from '@deepseek-ai/dsh-experimental-agent-team'
import { broadcastTargets } from '../src/broadcast.ts'

/** Build one roster row with only the fields target selection reads. */
function member(
  name: string,
  role: TeamMemberView['role'],
  status: TeamMemberView['status'] = 'idle',
): TeamMemberView {
  return {
    id: name as TeamMemberView['id'],
    name,
    role,
    status,
    diagnostics: [],
  } as TeamMemberView
}

/** A Lead plus three teammates, one of which failed at provisioning. */
const ROSTER = [
  member('lead', 'lead', 'running'),
  member('coder-api', 'teammate'),
  member('coder-web', 'teammate', 'inactive'),
  member('broken', 'teammate', 'failed'),
]

describe('broadcastTargets', () => {
  it('addresses every teammate when the caller names none', () => {
    const plan = broadcastTargets(undefined, ROSTER)
    expect(plan.send).toEqual(['coder-api', 'coder-web'])
  })

  it('reports a failed member as skipped instead of delivering into a dead mailbox', () => {
    const plan = broadcastTargets(undefined, ROSTER)
    expect(plan.send).not.toContain('broken')
    expect(plan.skipped.map(skip => skip.target)).toEqual(['broken'])
    expect(plan.skipped[0]?.reason).toContain('failed at provisioning')
  })

  it('reaches an inactive teammate, which the mailbox cold-resumes', () => {
    expect(broadcastTargets(['coder-web'], ROSTER).send).toEqual(['coder-web'])
  })

  it('skips a teammate that is still provisioning, which neither the mailbox nor the board reaches', () => {
    const planning = [...ROSTER, member('newbie', 'teammate', 'provisioning')]
    const plan = broadcastTargets(undefined, planning)
    expect(plan.send).toEqual(['coder-api', 'coder-web'])
    expect(plan.skipped.map(skip => skip.target)).toEqual(['broken', 'newbie'])
    expect(plan.skipped[1]?.reason).toContain('still provisioning')
  })

  it('refuses a named target that is still provisioning', () => {
    const planning = [...ROSTER, member('newbie', 'teammate', 'provisioning')]
    const plan = broadcastTargets(['newbie'], planning)
    expect(plan.send).toEqual([])
    expect(plan.skipped[0]?.reason).toContain('still provisioning')
  })

  it('treats an empty request as the whole team', () => {
    expect(broadcastTargets([], ROSTER).send).toEqual(['coder-api', 'coder-web'])
  })

  it('narrows to the named targets and keeps the caller order', () => {
    const plan = broadcastTargets(['coder-web', 'coder-api'], ROSTER)
    expect(plan.send).toEqual(['coder-web', 'coder-api'])
  })

  it('reports every refusal with a reason instead of dropping it', () => {
    const plan = broadcastTargets(['lead', 'nobody', '', 'broken'], ROSTER)
    expect(plan.send).toEqual([])
    expect(plan.skipped.map(skip => skip.target)).toEqual(['lead', 'nobody', '', 'broken'])
    expect(plan.skipped[0]?.reason).toContain('cannot message itself')
    expect(plan.skipped[1]?.reason).toContain('not a member')
    expect(plan.skipped[2]?.reason).toContain('cannot be empty')
    expect(plan.skipped[3]?.reason).toContain('failed at provisioning')
  })

  it('delivers to the valid targets even when others are refused', () => {
    const plan = broadcastTargets(['coder-api', 'nobody'], ROSTER)
    expect(plan.send).toEqual(['coder-api'])
    expect(plan.skipped.map(skip => skip.target)).toEqual(['nobody'])
  })

  it('delivers once per name when the caller repeats one', () => {
    expect(broadcastTargets(['coder-api', 'coder-api'], ROSTER).send).toEqual(['coder-api'])
  })

  it('trims whitespace so a padded name still resolves', () => {
    expect(broadcastTargets([' coder-api '], ROSTER).send).toEqual(['coder-api'])
  })

  it('reports a self-addressed roster as empty rather than attempting it', () => {
    const plan = broadcastTargets(undefined, [member('lead', 'lead')])
    expect(plan.send).toEqual([])
    expect(plan.skipped).toEqual([])
  })
})
