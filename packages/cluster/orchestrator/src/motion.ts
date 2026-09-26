/**
 * Pure planning and counting for one motion.
 *
 * The board offers no value slot, so a vote cannot be stored the way a record
 * field would store it. Instead each voter owns exactly one ballot row and
 * records the position in its description, the same way a roundtable records an
 * answer; `complete` casts the ballot. One row per voter is what makes the
 * board's own readiness arithmetic close the poll, and it makes the tally
 * task's `blockedBy` list the whole voter roll — so counting needs no state
 * beyond the board that already exists.
 *
 * @module @deepseek-ai/dsh-cluster-orchestrator
 */

import type { TeamMemberView, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import { broadcastTargets, collectorRefusal, type BroadcastSkip } from './broadcast.ts'

/** Subject prefix that marks one voter's ballot. */
export const BALLOT_SUBJECT_PREFIX = 'Ballot: '

/** Subject prefix that marks the task which carries the roll. */
export const TALLY_SUBJECT_PREFIX = 'Tally: '

/** The line a voter appends so the tally can read the position. */
export const VOTE_MARKER = 'vote: '

/** Positions a ballot can be counted as. */
export type VotePosition = 'for' | 'against' | 'abstain' | 'unrecorded'

/** Who a motion puts the question to, and who counts the result. */
export interface MotionPlan {
  /** Teammates that receive a ballot, in delivery order. */
  readonly ask: readonly string[]
  /** Requested voters that are refused, with the reason. */
  readonly skipped: readonly BroadcastSkip[]
  /** Teammate the tally task declares as its owner. */
  readonly counter: string
}

/** Whether one motion can run, and either the plan or the reason it cannot. */
export type MotionDecision =
  | { readonly ok: true; readonly plan: MotionPlan }
  | { readonly ok: false; readonly reason: string }

/** The counted result of one motion. */
export interface VoteTally {
  /** Ballots that recorded `for`. */
  readonly for: number
  /** Ballots that recorded `against`. */
  readonly against: number
  /** Ballots that recorded `abstain`. */
  readonly abstain: number
  /** Completed ballots whose position could not be read. */
  readonly unrecorded: number
  /** Ballots on the roll that are not settled. */
  readonly outstanding: number
  /** Ballots on the roll. */
  readonly total: number
}

/**
 * Decide whether one motion can run, and who votes in it.
 *
 * The counter is validated before anything is created, for the same reason a
 * roundtable validates its collector: a poll nobody can close spends every
 * voter's turn and then stalls.
 *
 * @param requested - voter names the caller named, or undefined for every teammate.
 * @param members - the roster as `listMembers` reports it, including the Lead.
 * @param count - teammate name the caller named as the counter.
 * @returns the plan, or the reason no motion is possible.
 */
export function motionPlan(
  requested: readonly string[] | undefined,
  members: readonly TeamMemberView[],
  count: string,
): MotionDecision {
  const counter = count.trim()
  const refusal = collectorRefusal(members, counter)
  if (refusal !== undefined) return { ok: false, reason: refusal }

  const targets = broadcastTargets(requested, members)
  const ask = targets.send.filter(name => name !== counter)
  if (ask.length === 0) {
    return { ok: false, reason: 'no teammate can cast a ballot; spawn a teammate, or name voters other than the counter' }
  }
  return { ok: true, plan: { ask, skipped: targets.skipped, counter } }
}

/** Whether one board row is the tally this module counts. */
export function isTallyTask(task: TeamTaskView): boolean {
  return task.subject.startsWith(TALLY_SUBJECT_PREFIX)
}

/**
 * Read the position one ballot records.
 * @param ballot - a ballot row.
 * @returns the recorded position, or `unrecorded` when the line is absent or unknown.
 */
export function votePosition(ballot: TeamTaskView): VotePosition {
  const line = ballot.description
    .split('\n')
    .find(candidate => candidate.startsWith(VOTE_MARKER))
  const recorded = line?.slice(VOTE_MARKER.length).trim().toLowerCase()
  return recorded === 'for' || recorded === 'against' || recorded === 'abstain'
    ? recorded
    : 'unrecorded'
}

/**
 * Count the roll one tally task carries.
 *
 * The roll is the tally's own `blockedBy` list, so a ballot that is missing
 * from the board or still unsettled is reported rather than ignored: a count
 * that silently drops a voter is worse than a count with a caveat.
 * @param tallyTask - the tally row, whose blockers are the ballots.
 * @param tasks - complete current board.
 * @returns the counted result.
 */
export function readTally(tallyTask: TeamTaskView, tasks: readonly TeamTaskView[]): VoteTally {
  const roll = tallyTask.blockedBy.map(String)
  let forCount = 0
  let againstCount = 0
  let abstainCount = 0
  let unrecorded = 0
  let outstanding = 0
  for (const id of roll) {
    const ballot = tasks.find(task => String(task.id) === id)
    if (ballot === undefined || ballot.status !== 'completed') {
      outstanding += 1
      continue
    }
    switch (votePosition(ballot)) {
      case 'for':
        forCount += 1
        break
      case 'against':
        againstCount += 1
        break
      case 'abstain':
        abstainCount += 1
        break
      default:
        unrecorded += 1
        break
    }
  }
  return {
    for: forCount,
    against: againstCount,
    abstain: abstainCount,
    unrecorded,
    outstanding,
    total: roll.length,
  }
}

/**
 * Render the counted result for a notice.
 * @param tally - the counted result.
 * @returns one sentence, naming every caveat the count carries.
 */
export function tallySummary(tally: VoteTally): string {
  const head = `${tally.for} for, ${tally.against} against, ${tally.abstain} abstain of ${tally.total} ballots`
  const caveats: string[] = []
  if (tally.unrecorded > 0) caveats.push(`${tally.unrecorded} with no readable "${VOTE_MARKER.trim()}" line`)
  if (tally.outstanding > 0) caveats.push(`${tally.outstanding} still unsettled`)
  return caveats.length === 0 ? `${head}.` : `${head}; ${caveats.join('; ')}.`
}

/**
 * One-line subject for a ballot.
 * @param motion - the motion being voted on.
 * @returns the subject, carrying the motion's first line only.
 */
export function ballotSubject(motion: string): string {
  return `${BALLOT_SUBJECT_PREFIX}${firstLine(motion)}`
}

/**
 * One-line subject for the tally.
 * @param motion - the motion being voted on.
 * @returns the subject, carrying the motion's first line only.
 */
export function tallySubject(motion: string): string {
  return `${TALLY_SUBJECT_PREFIX}${firstLine(motion)}`
}

/**
 * Body of one ballot: the motion plus the exact calls that cast a position.
 * @param motion - the motion being voted on.
 * @param counter - teammate that counts the result.
 * @returns the task description.
 */
export function ballotDescription(motion: string, counter: string): string {
  return [
    motion,
    '',
    'Cast your vote on this shared task:',
    '1. Call team_task_get for the current revision, then team_task_update with action "claim".',
    '2. Call team_task_get again, then team_task_update with action "edit" and a description that keeps',
    '   this text and ends with a final line "vote: for", "vote: against", or "vote: abstain".',
    '3. Call team_task_update with action "complete" to cast it.',
    'Without that line your ballot counts as unrecorded, so state the position explicitly.',
    `Teammate "${counter}" has the tally, and every ballot is readable by every member.`,
  ].join('\n')
}

/**
 * Body of the tally: the motion, the roll, and the marker that lets this plugin
 * assign the counter the moment the last ballot is cast.
 * @param motion - the motion being voted on.
 * @param counter - teammate that counts the result.
 * @param ballotIds - ballot tasks in creation order.
 * @returns the task description, marker line included.
 */
export function tallyDescription(motion: string, counter: string, ballotIds: readonly string[]): string {
  return [
    `Count the votes on: ${motion}`,
    '',
    `Ballots: ${ballotIds.length === 0 ? 'none yet' : ballotIds.join(', ')}`,
    `Each position is the final line beginning "${VOTE_MARKER}" on one of those tasks.`,
    'This task is blocked until every ballot is cast, and it is assigned to you at that moment;',
    'the notice that assigns it carries the count the board already agrees on.',
    'Check that count against the ballots, then complete this task with the outcome and report it to the Lead.',
    '',
    `cluster-owner: ${counter}`,
  ].join('\n')
}

/**
 * The notice one voter receives.
 * @param taskId - the ballot task that carries the motion.
 * @param motion - the motion being voted on.
 * @returns the message text.
 */
export function ballotMessage(taskId: string, motion: string): string {
  return [
    `[MOTION] ${taskId} is your ballot on: ${firstLine(motion)}`,
    'Read it with team_task_get, then record "vote: for", "vote: against" or "vote: abstain"',
    'on that task and complete it to cast the ballot.',
  ].join(' ')
}

/** The first non-empty line of a possibly multi-line text. */
function firstLine(text: string): string {
  return text.split('\n').map(line => line.trim()).find(line => line.length > 0) ?? ''
}
