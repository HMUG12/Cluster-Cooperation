/**
 * Pure planning for one Lead roundtable.
 *
 * A roundtable is a fan-out that collects: every participant gets the same
 * question as a task they own, and one synthesis task waits on all of those
 * answers. The board supplies both halves — owned tasks and `blockedBy` edges —
 * and this module decides who is asked, who collects, and what every text says.
 *
 * The synthesizer is always a teammate, never the Lead: the Team mailbox
 * refuses a message a member sends to itself, so no notice can wake the Lead,
 * and a synthesis nobody is woken for would never happen.
 *
 * @module @deepseek-ai/dsh-cluster-orchestrator
 */

import type { TeamMemberView } from '@deepseek-ai/dsh-experimental-agent-team'
import { broadcastTargets, type BroadcastSkip } from './broadcast.ts'

/** Who a roundtable asks, and who collects the answers. */
export interface RoundtablePlan {
  /** Teammates that receive the question, in delivery order. */
  readonly ask: readonly string[]
  /** Requested participants that are refused, with the reason. */
  readonly skipped: readonly BroadcastSkip[]
  /** Teammate the synthesis task declares as its owner. */
  readonly synthesizer: string
}

/** Whether one roundtable can run, and either the plan or the reason it cannot. */
export type RoundtableDecision =
  | { readonly ok: true; readonly plan: RoundtablePlan }
  | { readonly ok: false; readonly reason: string }

/** Subject prefix that marks an answer task this tool opened. */
export const ROUNDTABLE_SUBJECT_PREFIX = 'Roundtable: '

/** Subject prefix that marks the synthesis task this tool opened. */
export const SYNTHESIS_SUBJECT_PREFIX = 'Synthesis: '

/** The line an answerer appends so the synthesizer can find the answer. */
export const ANSWER_MARKER = 'answer: '

/**
 * Decide whether one roundtable can run, and who it reaches.
 *
 * The synthesizer is validated first: a fan-out whose collector cannot be woken
 * would spend every participant's turn and then stall, so the refusal has to
 * arrive before a single task is created.
 *
 * @param requested - participant names the caller named, or undefined for every teammate.
 * @param members - the roster as `listMembers` reports it, including the Lead.
 * @param synthesize - teammate name the caller named as the collector.
 * @returns the plan, or the reason no roundtable is possible.
 */
export function roundtablePlan(
  requested: readonly string[] | undefined,
  members: readonly TeamMemberView[],
  synthesize: string,
): RoundtableDecision {
  const synthesizer = synthesize.trim()
  const lead = members.find(member => member.role === 'lead')
  if (synthesizer === lead?.name) {
    return { ok: false, reason: 'the Lead cannot collect a roundtable, because no notice can wake the Lead; name a teammate' }
  }
  const collector = members.find(member => member.name === synthesizer)
  if (collector === undefined) {
    return { ok: false, reason: `"${synthesizer}" is not a member of this Team; call list_agents for the current roster` }
  }
  if (collector.status === 'failed') {
    return { ok: false, reason: `"${synthesizer}" failed at provisioning; spawn a replacement or name another collector` }
  }

  const targets = broadcastTargets(requested, members)
  const ask = targets.send.filter(name => name !== synthesizer)
  if (ask.length === 0) {
    return {
      ok: false,
      reason: 'no teammate can receive the question; spawn a teammate, or name participants other than the collector',
    }
  }
  return { ok: true, plan: { ask, skipped: targets.skipped, synthesizer } }
}

/**
 * One-line subject for an answer task.
 * @param question - the question every participant answers.
 * @returns the subject, carrying the question's first line only.
 */
export function answerSubject(question: string): string {
  return `${ROUNDTABLE_SUBJECT_PREFIX}${firstLine(question)}`
}

/**
 * One-line subject for the synthesis task.
 * @param question - the question every participant answers.
 * @returns the subject, carrying the question's first line only.
 */
export function synthesisSubject(question: string): string {
  return `${SYNTHESIS_SUBJECT_PREFIX}${firstLine(question)}`
}

/**
 * Body of one answer task: the question plus the exact board calls that answer it.
 * @param question - the question to answer.
 * @param synthesizer - teammate that collects the answers.
 * @returns the task description.
 */
export function answerDescription(question: string, synthesizer: string): string {
  return [
    question,
    '',
    'Answer it on this shared task:',
    '1. Call team_task_get for the current revision, then team_task_update with action "claim".',
    '2. Call team_task_get again, then team_task_update with action "edit" and a description that keeps',
    `   this text and ends with a final line beginning "${ANSWER_MARKER}<your answer>".`,
    '3. Call team_task_update with action "complete".',
    `Teammate "${synthesizer}" collects every answer once the last one lands.`,
  ].join('\n')
}

/**
 * Body of the synthesis task: the question, the answer tasks, and the marker
 * that lets this plugin assign the collector the moment the last answer lands.
 * @param question - the question the answers address.
 * @param synthesizer - teammate that collects the answers.
 * @param answerTaskIds - answer tasks in creation order.
 * @returns the task description, marker line included.
 */
export function synthesisDescription(
  question: string,
  synthesizer: string,
  answerTaskIds: readonly string[],
): string {
  return [
    `Synthesize the answers to: ${question}`,
    '',
    `Answers: ${answerTaskIds.length === 0 ? 'none yet' : answerTaskIds.join(', ')}`,
    `Each answer is the final line beginning "${ANSWER_MARKER}" on one of those tasks.`,
    'This task is blocked until every answer lands, and it is assigned to you at that moment.',
    'Claim it with the current revision, then complete it with your synthesis as the description.',
    '',
    `cluster-owner: ${synthesizer}`,
  ].join('\n')
}

/**
 * The notice one participant receives.
 * @param taskId - the answer task that carries the question.
 * @param question - the question to answer.
 * @returns the message text.
 */
export function questionMessage(taskId: string, question: string): string {
  return [
    `[ROUNDTABLE] ${taskId} is yours: ${firstLine(question)}`,
    'Read it with team_task_get, then answer on that task and complete it.',
    'Call list_agents if you need the rest of the roster.',
  ].join(' ')
}

/** The first non-empty line of a possibly multi-line question. */
function firstLine(text: string): string {
  return text.split('\n').map(line => line.trim()).find(line => line.length > 0) ?? ''
}
