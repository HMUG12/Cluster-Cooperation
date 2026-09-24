/**
 * Render one member's declared accountability into the text a spawned teammate
 * starts with.
 *
 * `spawn_teammate` carries a name, a description, and a task. Everything a
 * member must be held to across delegations — what it owns, what it must
 * produce, when the work is done, and how it will be judged — lives in
 * `cluster.yml` instead of being re-typed into every prompt. This module is a
 * pure projection from that declaration to text, so the same rendering is
 * covered by tests without a live Team.
 *
 * @module @deepseek-ai/dsh-cluster-config
 */

import type { MemberSpec } from './types.ts'

/** Name of the member whose briefing is being rendered. */
export interface BriefingRequest {
  /** Cluster the member belongs to, used as the section heading. */
  readonly clusterName: string
  /** The declared member row. */
  readonly member: MemberSpec
}

/** Append a labeled bullet list, skipping an absent or empty list. */
function bullets(label: string, values: readonly string[] | undefined): string[] {
  if (values === undefined || values.length === 0) return []
  return [`${label}:`, ...values.map(value => `- ${value}`)]
}

/**
 * Render the structured briefing for one member, or nothing when the member
 * declares no accountability of its own.
 *
 * Accountability is the point of a briefing: `mission`, `deliverables`,
 * `definitionOfDone`, or `qualityBar`. Write scopes and a token budget are
 * operational detail that only rides along once a member is actually held to
 * something — a member that declares neither keeps the previous behaviour, so
 * the teammate starts with exactly the Lead's task and no injected boilerplate.
 *
 * @param request - cluster name and the declared member row.
 * @returns the briefing text, or undefined when the member owns no accountability.
 */
export function renderBriefing(request: BriefingRequest): string | undefined {
  const { clusterName, member } = request
  const accountable = member.mission !== undefined
    || (member.deliverables?.length ?? 0) > 0
    || (member.definitionOfDone?.length ?? 0) > 0
    || (member.qualityBar?.length ?? 0) > 0
  if (!accountable) return undefined
  const lines: string[] = []
  if (member.mission !== undefined) lines.push(`Mission: ${member.mission}`)
  lines.push(...bullets('Deliverables', member.deliverables))
  lines.push(...bullets('Definition of done', member.definitionOfDone))
  lines.push(...bullets('Quality bar', member.qualityBar))
  if (member.writeScopes !== undefined && member.writeScopes.length > 0) {
    lines.push(`Advisory write scopes: ${member.writeScopes.join(', ')}`)
  }
  if (member.tokenBudget !== undefined) lines.push(`Token budget: ${member.tokenBudget}`)
  return [
    `<cluster-briefing member="${member.name}" cluster="${clusterName}">`,
    ...lines,
    '</cluster-briefing>',
  ].join('\n')
}
