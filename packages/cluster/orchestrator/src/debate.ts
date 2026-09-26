/**
 * Pure planning and reading for one debate.
 *
 * A debate is the one conversation protocol whose shape is not a single
 * fan-out but a layered one: each round's speeches are blocked by every speech
 * of the round before. That needs no new board state, because the round *is*
 * the blocker list, and the board's own readiness arithmetic then opens a round
 * only once the previous one is fully argued. What this module adds is the
 * vocabulary — a subject that names the round, a description that tells one
 * speaker exactly which calls to make, and a reading of the arguments the
 * verdict has to weigh.
 *
 * @module @deepseek-ai/dsh-cluster-orchestrator
 */

import type { TeamMemberView, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'
import { broadcastTargets, collectorRefusal, type BroadcastSkip } from './broadcast.ts'

/** Subject prefix that marks one round's speech. */
export const SPEECH_SUBJECT_PREFIX = 'Debate '

/** Subject prefix that marks the task which weighs the final round. */
export const VERDICT_SUBJECT_PREFIX = 'Verdict: '

/** The line a speaker appends so the verdict can read the argument. */
export const STATEMENT_MARKER = 'statement: '

/** Rounds one debate may run. Each round spends every speaker a full turn. */
export const MAX_DEBATE_ROUNDS = 5

/** Speech rows one debate may open, counted over every round. */
export const MAX_DEBATE_SPEECHES = 32

/** Who one debate seats, and how long it runs. */
export interface DebatePlan {
  /** Speakers that receive one speech per round, in delivery order. */
  readonly speakers: readonly string[]
  /** Requested speakers that are refused, with the reason. */
  readonly skipped: readonly BroadcastSkip[]
  /** Rounds the debate runs. */
  readonly rounds: number
  /** Teammate the verdict task declares as its owner. */
  readonly judge: string
}

/** Whether one debate can run, and either the plan or the reason it cannot. */
export type DebateDecision =
  | { readonly ok: true; readonly plan: DebatePlan }
  | { readonly ok: false; readonly reason: string }

/** What one verdict's final round holds. */
export interface DebateReading {
  /** Completed speeches whose argument could be read. */
  readonly readable: number
  /** Completed speeches whose argument could not be read. */
  readonly unreadable: number
  /** Speeches of the final round that are not settled. */
  readonly outstanding: number
  /** Speeches of the final round. */
  readonly total: number
}

/**
 * Decide whether one debate can run, and who it seats.
 *
 * The judge is validated first, because a debate whose verdict cannot be woken
 * would spend every speaker's turn in every round and then stall — the same
 * reason a roundtable validates its collector before it fans out. A judge that
 * is also named as a speaker is refused rather than quietly removed: arguing
 * and judging are the two roles a debate keeps apart.
 *
 * @param requested - speaker names the caller listed, or undefined for the default.
 * @param members - current roster.
 * @param rounds - rounds the debate should run.
 * @param judge - teammate name the caller named to weigh the final round.
 * @returns the plan, or the reason no debate is possible.
 */
export function debatePlan(
  requested: readonly string[] | undefined,
  members: readonly TeamMemberView[],
  rounds: number,
  judge: string,
): DebateDecision {
  if (!Number.isInteger(rounds) || rounds < 2) {
    return { ok: false, reason: 'a debate needs at least two rounds; one round of answers is a roundtable' }
  }
  if (rounds > MAX_DEBATE_ROUNDS) {
    return { ok: false, reason: `a debate of ${rounds} rounds spends every speaker's turn ${rounds} times; ${MAX_DEBATE_ROUNDS} is the cap` }
  }
  const seated = judge.trim()
  const refusal = collectorRefusal(members, seated)
  if (refusal !== undefined) return { ok: false, reason: refusal }

  const targets = broadcastTargets(requested, members)
  const speakers = targets.send.filter(name => name !== seated)
  const skipped = [...targets.skipped]
  // An explicitly named judge is a contradiction worth reporting; the default
  // roster simply seats everyone else, which is what the caller asked for.
  if (requested !== undefined && targets.send.includes(seated)) {
    skipped.push({
      target: seated,
      reason: `"${seated}" is the judge; a debate needs a judge who did not argue`,
    })
  }
  if (speakers.length < 2) {
    return { ok: false, reason: 'a debate needs at least two speakers; spawn a teammate, or name speakers other than the judge' }
  }
  if (speakers.length * rounds > MAX_DEBATE_SPEECHES) {
    return {
      ok: false,
      reason: `${speakers.length} speakers over ${rounds} rounds would open ${speakers.length * rounds} speech tasks; ${MAX_DEBATE_SPEECHES} is the cap`,
    }
  }
  return { ok: true, plan: { speakers, skipped, rounds, judge: seated } }
}

/** Whether one board row is a speech this module planned. */
export function isSpeechTask(task: TeamTaskView): boolean {
  return task.subject.startsWith(SPEECH_SUBJECT_PREFIX)
}

/** Whether one board row is the verdict this module planned. */
export function isVerdictTask(task: TeamTaskView): boolean {
  return task.subject.startsWith(VERDICT_SUBJECT_PREFIX)
}

/**
 * Read the argument one speech records.
 * @param speech - a completed speech row.
 * @returns the recorded argument, or undefined when the line is absent.
 */
export function statementOf(speech: TeamTaskView): string | undefined {
  const lines = speech.description.split('\n').map(line => line.trim())
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]
    if (line !== undefined && line.startsWith(STATEMENT_MARKER)) {
      return line.slice(STATEMENT_MARKER.length).trim()
    }
  }
  return undefined
}

/**
 * Read the final round one verdict task carries.
 *
 * The round is the verdict's own `blockedBy` list, so a speech that is missing
 * from the board or still unsettled is reported rather than ignored: a verdict
 * that silently weighs fewer arguments than the round held is worse than one
 * that says so.
 * @param verdictTask - the verdict row, whose blockers are the final round.
 * @param tasks - complete current board.
 * @returns what the final round holds.
 */
export function readStatements(verdictTask: TeamTaskView, tasks: readonly TeamTaskView[]): DebateReading {
  const round = verdictTask.blockedBy.map(String)
  let readable = 0
  let unreadable = 0
  let outstanding = 0
  for (const id of round) {
    const speech = tasks.find(task => String(task.id) === id)
    if (speech === undefined || speech.status !== 'completed') {
      outstanding += 1
      continue
    }
    if (statementOf(speech) === undefined) unreadable += 1
    else readable += 1
  }
  return { readable, unreadable, outstanding, total: round.length }
}

/**
 * Render the final round for a notice.
 * @param reading - what the final round holds.
 * @returns one sentence, naming every caveat the count carries.
 */
export function debateSummary(reading: DebateReading): string {
  const head = `${reading.readable} of ${reading.total} arguments in the final round are readable`
  const caveats: string[] = []
  if (reading.unreadable > 0) caveats.push(`${reading.unreadable} closed without a "${STATEMENT_MARKER.trim()}" line`)
  if (reading.outstanding > 0) caveats.push(`${reading.outstanding} still unsettled`)
  return caveats.length === 0 ? `${head}.` : `${head}; ${caveats.join('; ')}.`
}

/**
 * One-line subject for one round's speech.
 * @param round - one-based round number.
 * @param rounds - rounds the debate runs.
 * @param topic - the debate topic.
 * @returns the subject, carrying the round and the topic's first line.
 */
export function speechSubject(round: number, rounds: number, topic: string): string {
  return `${SPEECH_SUBJECT_PREFIX}${round}/${rounds}: ${firstLine(topic)}`
}

/**
 * One-line subject for the verdict.
 * @param topic - the debate topic.
 * @returns the subject, carrying the topic's first line.
 */
export function verdictSubject(topic: string): string {
  return `${VERDICT_SUBJECT_PREFIX}${firstLine(topic)}`
}

/**
 * Body of one speech: the topic, the round, and the exact board calls that
 * record it, plus the arguments this round answers.
 * @param topic - the debate topic.
 * @param speaker - teammate that owns this speech.
 * @param round - one-based round number.
 * @param rounds - rounds the debate runs.
 * @param judge - teammate that weighs the final round.
 * @param priorIds - speech tasks of the round this one answers, in creation order.
 * @returns the task description.
 */
export function speechDescription(
  topic: string,
  speaker: string,
  round: number,
  rounds: number,
  judge: string,
  priorIds: readonly string[],
): string {
  return [
    topic,
    '',
    `Round ${round} of ${rounds} in a debate. Record your argument on this shared task:`,
    '1. Call team_task_get for the current revision: this task is already assigned to you, so claim nothing.',
    '2. Call team_task_update with action "edit" using that revision and a description that keeps this text',
    `   and ends with a final line beginning "${STATEMENT_MARKER}<your argument>".`,
    '3. Call team_task_update with action "complete" to close your turn.',
    ...priorIds.length === 0
      ? ['This is the opening round: state the strongest case you can for the position you think is right.']
      : [`Read ${priorIds.join(', ')} first; they hold the round you answer, and every argument is readable by every member.`],
    `The judge "${judge}" weighs the final round, so carry anything you want weighed into your last speech.`,
    '',
    `cluster-owner: ${speaker}`,
  ].join('\n')
}

/**
 * Body of the verdict: the topic, the final round, and the marker that lets
 * this plugin assign the judge the moment the last speech lands.
 * @param topic - the debate topic.
 * @param judge - teammate that weighs the final round.
 * @param finalIds - speech tasks of the final round, in creation order.
 * @returns the task description, marker line included.
 */
export function verdictDescription(topic: string, judge: string, finalIds: readonly string[]): string {
  return [
    `Weigh the debate on: ${topic}`,
    '',
    `Final round: ${finalIds.length === 0 ? 'none yet' : finalIds.join(', ')}`,
    `Each argument is the final line beginning "${STATEMENT_MARKER}" on one of those tasks.`,
    'This task is blocked until the final round is complete, and it is assigned to you at that moment;',
    'the notice that assigns it carries how many arguments the board already holds.',
    'Weigh them against each other, then complete this task with the verdict and report it to the Lead.',
    '',
    `cluster-owner: ${judge}`,
  ].join('\n')
}

/**
 * The notice one speaker receives for the opening round.
 *
 * Later rounds need no notice of this shape: their speech tasks unblock on the
 * previous round, so the ordinary handoff assigns and announces them.
 * @param taskId - the speech task.
 * @param round - one-based round number.
 * @param rounds - rounds the debate runs.
 * @returns the message text.
 */
export function speechMessage(taskId: string, round: number, rounds: number): string {
  return [
    `[DEBATE] ${taskId} is your round ${round} of ${rounds} speech.`,
    'Read it with team_task_get, then record "statement: <your argument>" on that task',
    'and complete it to close your turn.',
  ].join(' ')
}

/** The first non-empty line of a possibly multi-line text. */
function firstLine(text: string): string {
  return text.split('\n').map(line => line.trim()).find(line => line.length > 0) ?? ''
}
