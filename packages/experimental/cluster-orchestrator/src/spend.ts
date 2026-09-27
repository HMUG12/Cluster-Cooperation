/**
 * Pure spend arithmetic for one Team member.
 *
 * `cluster.yml` has declared a `tokenBudget` per member since the first
 * document format, and nothing read it. Turning it into a behaviour needs one
 * thing the event log already carries: every durable `assistant/message`
 * records a `TokenUsage`. This module folds those counts and decides what a
 * spent budget owes, so the rule is testable without a live Team and the plugin
 * layer stays a thin adapter.
 *
 * @module @deepseek-ai/dsh-experimental-cluster-orchestrator
 */

import type { TokenUsage } from '@deepseek-ai/dsh-llm/types'

/** Cumulative model spend of one Agent session. */
export interface MemberSpend {
  /** Session the spend belongs to. */
  readonly sessionId: string
  /** Completed model calls counted so far. */
  readonly calls: number
  /** Uncached input tokens. */
  readonly inputTokens: number
  /** Output tokens. */
  readonly outputTokens: number
  /** Input tokens served from the provider prompt cache. */
  readonly cacheReadTokens: number
  /** Input tokens written to the provider prompt cache. */
  readonly cacheWriteTokens: number
  /** Route that served the most recent counted call. */
  readonly provider?: string
  /** Model that served the most recent counted call. */
  readonly model?: string
}

/** Route attribution for one counted call. */
export interface SpendRoute {
  /** Provider that served the call. */
  readonly provider?: string
  /** Model that served the call. */
  readonly model?: string
}

/**
 * Start a spend record for one session.
 * @param sessionId - session the spend belongs to.
 * @returns a zeroed record.
 */
export function emptySpend(sessionId: string): MemberSpend {
  return {
    sessionId,
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  }
}

/**
 * Add one recorded call to a spend record.
 *
 * `TokenUsage` counts are disjoint — cached input is reported separately from
 * uncached input — so each field is summed on its own and a provider that
 * reports no cache keeps its previous zero.
 *
 * @param spend - the record so far.
 * @param usage - token accounting for the call.
 * @param route - provider and model that served the call, when the event names them.
 * @returns the next record; the argument is never mutated.
 */
export function addUsage(spend: MemberSpend, usage: TokenUsage, route: SpendRoute = {}): MemberSpend {
  const provider = route.provider ?? spend.provider
  const model = route.model ?? spend.model
  return {
    sessionId: spend.sessionId,
    calls: spend.calls + 1,
    inputTokens: spend.inputTokens + usage.inputTokens,
    outputTokens: spend.outputTokens + usage.outputTokens,
    cacheReadTokens: spend.cacheReadTokens + (usage.cacheReadTokens ?? 0),
    cacheWriteTokens: spend.cacheWriteTokens + (usage.cacheWriteTokens ?? 0),
    ...provider === undefined ? {} : { provider },
    ...model === undefined ? {} : { model },
  }
}

/**
 * Total billable tokens for one record.
 *
 * Cached input is billed, so it counts; this is the number a declared budget is
 * compared against, and it never relies on the optional provider-supplied
 * `totalTokens`, which an adapter may omit.
 *
 * @param spend - the record to measure.
 * @returns the summed billable tokens.
 */
export function billableTokens(spend: MemberSpend): number {
  return spend.inputTokens + spend.cacheReadTokens + spend.cacheWriteTokens + spend.outputTokens
}

/**
 * Whether a member has spent its declared budget.
 *
 * The comparison is strictly greater: a member that lands exactly on its budget
 * has stayed within it, which is what "budget" means to the operator who wrote
 * the number.
 *
 * @param spend - the record to test.
 * @param budget - declared token budget.
 * @returns true once the member is past its budget.
 */
export function overBudget(spend: MemberSpend, budget: number): boolean {
  return billableTokens(spend) > budget
}

/**
 * Render the one notice a spent budget owes.
 *
 * It is addressed to the member and never to the Lead. The Team mailbox refuses
 * a message a member sends to itself, and the Lead is the only credential this
 * plugin holds, so asking the Lead to report to the Lead would be a message the
 * mailbox drops. Naming the Lead inside the member's notice keeps the escalation
 * on the one edge the mailbox does allow.
 *
 * @param memberName - declared member name that overspent.
 * @param spend - its cumulative record.
 * @param budget - declared token budget.
 * @returns the wrap-up notice delivered to the member.
 */
export function budgetNotice(memberName: string, spend: MemberSpend, budget: number): string {
  const used = billableTokens(spend)
  const route = spend.model === undefined ? 'an unrecorded route' : `model ${spend.model}`
  return [
    `[BUDGET] You have spent ${used} of the ${budget} tokens cluster.yml declares for "${memberName}"`,
    `across ${spend.calls} model calls on ${route}.`,
    'Stop starting new work, finish what is already in flight, and report to the Lead',
    'with send_message target "lead" exactly what is done and what is left.',
  ].join(' ')
}

/** One member's spend, as a report reads it. */
export interface MemberSpendReport {
  /** Roster name the session belongs to, or its session id when the roster names no member. */
  readonly name: string
  /** Completed model calls counted so far. */
  readonly calls: number
  /** Billable tokens the member has spent. */
  readonly billable: number
  /** Provider that served the calls, when the events named one. */
  readonly provider?: string
  /** Model that served the calls, when the events named one. */
  readonly model?: string
  /** Token budget `cluster.yml` declares, when it declares one. */
  readonly budget?: number
  /** Whether the member is past its budget. */
  readonly overBudget: boolean
}

/**
 * Turn folded records into the rows a report prints.
 *
 * Sorted by spend and then by name, so two reads of the same fold print the same
 * lines — which is what a human comparing two reports needs, and what a test can
 * assert without depending on fold order.
 * @param rows - each session's record with the name and declared budget that go with it.
 * @returns one row per record, heaviest billable total first.
 */
export function spendReport(
  rows: readonly { readonly name: string; readonly spend: MemberSpend; readonly budget?: number }[],
): MemberSpendReport[] {
  return rows
    .map(({ name, spend, budget }) => ({
      name,
      calls: spend.calls,
      billable: billableTokens(spend),
      ...spend.provider === undefined ? {} : { provider: spend.provider },
      ...spend.model === undefined ? {} : { model: spend.model },
      ...budget === undefined ? {} : { budget },
      // Without a declared budget there is nothing to be over, so the flag stays false.
      overBudget: budget === undefined ? false : overBudget(spend, budget),
    }))
    .sort((left, right) => right.billable - left.billable || left.name.localeCompare(right.name))
}
