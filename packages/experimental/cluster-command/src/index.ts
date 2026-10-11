/**
 * Human-facing `/cluster` command over the live Agent Team.
 *
 * The command answers from the services that already own the state: the roster
 * and the shared board come from the Team service, and the cluster name comes
 * from `cluster.yml` when this deployment loads one. Nothing here is written
 * back, so the command cannot change a run it is inspecting.
 *
 * @module @deepseek-ai/dsh-experimental-cluster-command
 */

import type { Context } from '@deepseek-ai/cordis'
import { CommandDefinitionId } from '@deepseek-ai/dsh-commands/brand'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import {
  clusterAgents,
  clusterCost,
  clusterGraph,
  clusterStatus,
  clusterTasks,
  parseClusterCommand,
  type ClusterCostRow,
  type RoundReport,
} from './report.ts'

export const name = 'command-cluster'
export const inject = ['commands', 'agentTeams']

/** The cluster-config service surface this command reads, when it is mounted. */
interface ClusterPolicySource {
  defaultClusterName(): string
}

/** Whether this deployment loads a cluster document, and which cluster it names. */
function defaultClusterName(ctx: Context): string | undefined {
  const found = (ctx as unknown as { get(name: string): unknown }).get('clusterConfig')
  if (typeof found !== 'object' || found === null) return 'this session'
  const read = (found as Partial<ClusterPolicySource>).defaultClusterName
  if (typeof read !== 'function') return 'this session'
  try {
    return read.call(found)
  } catch (error) {
    // Named because the swallow is deliberate: a deployment with no document is a
    // state this command reports, not a read that failed — the declarations
    // refuse to name a cluster when none is declared, and the roster below is
    // still live.
    ctx.logger.debug(`cluster command could not name the cluster: ${String(error)}`)
    return undefined
  }
}

/**
 * Read the spend view the orchestrator publishes.
 *
 * This command cannot fold usage itself: only the orchestrator subscribes to
 * every session's events, so it holds the one complete picture of what the
 * cluster has spent. A deployment that mounts no orchestrator has nothing to
 * report rather than a zero it would have to invent.
 * @param ctx - the context the command runs in.
 * @returns the spend report.
 */
function spendText(ctx: Context): string {
  const found = (ctx as unknown as { get(name: string): unknown }).get('clusterSpend')
  const read = typeof found === 'object' && found !== null
    ? (found as Partial<{ members(): readonly ClusterCostRow[] }>).members
    : undefined
  if (typeof read !== 'function') {
    return 'No cluster orchestrator is mounted, so nothing folds model spend for this Team yet.'
  }
  return clusterCost(read.call(found))
}

/**
 * Read the declared cap and the counts the orchestrator publishes.
 *
 * The command can read the cap from the declarations, but it cannot count turns
 * itself: only the orchestrator sees every member's turn boundary. A deployment
 * that mounts one half and not the other reports the half it has.
 * @param ctx - the context the command runs in.
 * @param clusterName - the declared cluster, or undefined when no document names one.
 * @returns the report's round data, or undefined when neither half is available.
 */
function roundsReport(ctx: Context, clusterName: string | undefined): RoundReport | undefined {
  const cap = clusterName === undefined ? undefined : declaredCap(ctx, clusterName)
  const counted = publishedRounds(ctx)
  if (counted === undefined) return cap === undefined ? undefined : { members: 0, turns: 0, cap }
  return { ...counted, ...cap === undefined ? {} : { cap } }
}

/** The cap the declarations state, when a configuration service is mounted and accepts the read. */
function declaredCap(ctx: Context, clusterName: string): number | undefined {
  const found = (ctx as unknown as { get(name: string): unknown }).get('clusterConfig')
  const read = typeof found === 'object' && found !== null
    ? (found as Partial<{ roundsFor(cluster: string): { readonly max: number } | undefined }>).roundsFor
    : undefined
  if (typeof read !== 'function') return undefined
  try {
    return read.call(found, clusterName)?.max
  } catch (error) {
    // Named because the swallow is deliberate: a document that declares no such
    // cluster has no cap to state, which is not a reason to fail the report.
    ctx.logger.debug(`cluster command could not read the round cap: ${String(error)}`)
    return undefined
  }
}

/** The turn counts the orchestrator publishes, when it is mounted. */
function publishedRounds(ctx: Context): { readonly members: number; readonly turns: number } | undefined {
  const found = (ctx as unknown as { get(name: string): unknown }).get('clusterRounds')
  const read = typeof found === 'object' && found !== null
    ? (found as Partial<{ members(): readonly { readonly turns: number }[] }>).members
    : undefined
  if (typeof read !== 'function') return undefined
  try {
    const rows = read.call(found) ?? []
    if (rows.length === 0) return undefined
    return { members: rows.length, turns: rows.reduce((total, row) => total + row.turns, 0) }
  } catch (error) {
    ctx.logger.debug(`cluster command could not read the counted turns: ${String(error)}`)
    return undefined
  }
}

/** Execute one parsed human command against the live Team. */
function executeClusterCommand(ctx: Context, invocation: CommandInvocation): CommandResult {
  const command = parseClusterCommand(invocation.rawInput)
  if (command.kind === 'refused') return { kind: 'error', text: command.reason }
  try {
    if (command.subcommand === 'cost') return { kind: 'success', text: spendText(ctx) }
    const members = ctx.agentTeams.listMembers(invocation.agent)
    const tasks = ctx.agentTeams.listTasks(invocation.agent)
    const clusterName = defaultClusterName(ctx)
    const text = command.subcommand === 'tasks'
      ? clusterTasks(tasks)
      : command.subcommand === 'agents'
        ? clusterAgents(members)
        : command.subcommand === 'graph'
          ? clusterGraph(tasks)
          : clusterStatus(clusterName, members, tasks, roundsReport(ctx, clusterName))
    return { kind: 'success', text }
  } catch (error: unknown) {
    // A command runs outside a model turn, so a refusal has to be readable here
    // rather than thrown into a dispatch the caller cannot act on.
    return {
      kind: 'error',
      text: `/cluster ${command.subcommand} could not read this Team: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export function apply(ctx: Context): void {
  ctx.commands.register({
    definitionId: CommandDefinitionId('@deepseek-ai/dsh-experimental-cluster-command'),
    name: 'cluster',
    description: 'Show the cluster roster, the shared task board, and its dependency edges',
    input: { hint: '[status|tasks|agents|graph|cost]', attachments: false },
    handler: invocation => executeClusterCommand(ctx, invocation),
  })
}
