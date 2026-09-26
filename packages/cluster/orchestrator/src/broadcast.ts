/**
 * Pure target selection for one Lead broadcast.
 *
 * A Lead that must tell its whole team one thing has only `send_message`, which
 * addresses a single member, so briefing five teammates means five calls that
 * can partially fail. This module decides who a broadcast reaches, which keeps
 * the rule testable without a live Team and keeps every refusal explicit: a
 * Lead that believes it briefed five members must not be wrong about it.
 *
 * @module @deepseek-ai/dsh-cluster-orchestrator
 */

import type { TeamMemberView } from '@deepseek-ai/dsh-experimental-agent-team'

/** One requested target that will not receive the broadcast. */
export interface BroadcastSkip {
  /** Name the caller asked for, verbatim. */
  readonly target: string
  /** Why it will not receive the message, phrased for the model. */
  readonly reason: string
}

/** The targets one broadcast reaches, and the ones it does not. */
export interface BroadcastPlan {
  /** Member names that receive the message, in delivery order. */
  readonly send: readonly string[]
  /** Requested targets that are refused, each with its reason. */
  readonly skipped: readonly BroadcastSkip[]
}

/** Refusal reasons. Each one names the next action the Lead can take. */
const EMPTY = 'a target name cannot be empty; omit targets to address every teammate'
const SELF = 'the Lead cannot message itself; name teammates, or omit targets to address all of them'
const UNKNOWN = 'not a member of this Team; call list_agents for the current roster'
const FAILED = 'this member failed at provisioning; spawn a replacement or finish its work yourself'

/**
 * Why one member cannot collect a fan-out, or undefined when it can.
 *
 * A fan-out whose collector can never be woken spends every participant's turn
 * and then stalls, so each protocol that collects something validates the
 * collector before it creates anything.
 * @param members - the roster as `listMembers` reports it, including the Lead.
 * @param name - the collector name the caller supplied, already trimmed.
 * @returns the refusal, or undefined when that member can collect.
 */
export function collectorRefusal(members: readonly TeamMemberView[], name: string): string | undefined {
  const leadName = members.find(member => member.role === 'lead')?.name
  if (name === leadName) {
    return 'the Lead cannot collect this round, because no notice can wake the Lead; name a teammate'
  }
  const member = members.find(candidate => candidate.name === name)
  if (member === undefined) {
    return `"${name}" is not a member of this Team; call list_agents for the current roster`
  }
  if (member.status === 'failed') {
    return `"${name}" failed at provisioning; spawn a replacement or name another collector`
  }
  return undefined
}

/**
 * Decide who one broadcast reaches.
 *
 * Omitting the request addresses the whole team: every teammate, minus the ones
 * this layer already knows the mailbox cannot reach. Naming targets narrows it,
 * and every named target is either delivered or refused with a reason — never
 * silently dropped.
 *
 * @param requested - member names the caller named, or undefined for the whole team.
 * @param members - the roster as `listMembers` reports it, including the Lead.
 * @returns the delivery order and every refusal.
 */
export function broadcastTargets(
  requested: readonly string[] | undefined,
  members: readonly TeamMemberView[],
): BroadcastPlan {
  const leadName = members.find(member => member.role === 'lead')?.name
  const send: string[] = []
  const skipped: BroadcastSkip[] = []
  const seen = new Set<string>()

  const consider = (raw: string): void => {
    const target = raw.trim()
    if (seen.has(target)) return
    seen.add(target)
    if (target.length === 0) {
      skipped.push({ target: raw, reason: EMPTY })
      return
    }
    if (target === leadName) {
      skipped.push({ target, reason: SELF })
      return
    }
    const member = members.find(candidate => candidate.name === target)
    if (member === undefined) {
      skipped.push({ target, reason: UNKNOWN })
      return
    }
    if (member.status === 'failed') {
      skipped.push({ target, reason: FAILED })
      return
    }
    send.push(target)
  }

  if (requested === undefined || requested.length === 0) {
    for (const member of members) {
      if (member.role === 'teammate') consider(member.name)
    }
  } else {
    for (const name of requested) consider(name)
  }
  return { send, skipped }
}
