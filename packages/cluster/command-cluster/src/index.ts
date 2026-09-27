/**
 * Human-facing `/cluster` command over the live Agent Team.
 *
 * The command answers from the services that already own the state: the roster
 * and the shared board come from the Team service, and the cluster name comes
 * from `cluster.yml` when this deployment loads one. Nothing here is written
 * back, so the command cannot change a run it is inspecting.
 *
 * @module @deepseek-ai/dsh-command-cluster
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
} from './report.ts'

export const name = 'command-cluster'
export const inject = ['commands', 'agentTeams']

/** The cluster-config service surface this command reads, when it is mounted. */
interface ClusterPolicySource {
  defaultClusterName(): string
}

/** Whether this deployment loads a cluster document, and which cluster it names. */
function defaultClusterName(ctx: Context): string {
  const found = (ctx as unknown as { get(name: string): unknown }).get('clusterConfig')
  if (typeof found !== 'object' || found === null) return 'this session'
  const read = (found as Partial<ClusterPolicySource>).defaultClusterName
  return typeof read === 'function' ? read.call(found) : 'this session'
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

/** Execute one parsed human command against the live Team. */
function executeClusterCommand(ctx: Context, invocation: CommandInvocation): CommandResult {
  const command = parseClusterCommand(invocation.rawInput)
  if (command.kind === 'refused') return { kind: 'error', text: command.reason }
  try {
    if (command.subcommand === 'cost') return { kind: 'success', text: spendText(ctx) }
    const members = ctx.agentTeams.listMembers(invocation.agent)
    const tasks = ctx.agentTeams.listTasks(invocation.agent)
    const text = command.subcommand === 'tasks'
      ? clusterTasks(tasks)
      : command.subcommand === 'agents'
        ? clusterAgents(members)
        : command.subcommand === 'graph'
          ? clusterGraph(tasks)
          : clusterStatus(defaultClusterName(ctx), members, tasks)
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
    definitionId: CommandDefinitionId('@deepseek-ai/dsh-command-cluster'),
    name: 'cluster',
    description: 'Show the cluster roster, the shared task board, and its dependency edges',
    input: { hint: '[status|tasks|agents|graph|cost]', attachments: false },
    handler: invocation => executeClusterCommand(ctx, invocation),
  })
}
