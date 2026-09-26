/**
 * Pure parsing and rendering for the human-facing `/cluster` command.
 *
 * Every renderer reads the board and the roster the Team itself already keeps,
 * so the command answers what the cluster is doing without asking a model and
 * without storing a second copy of anything. Keeping the whole surface pure is
 * what lets each line be covered by tests that need no live Team.
 *
 * @module @deepseek-ai/dsh-command-cluster
 */

import type { TeamMemberView, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team'

/** Usage line shared by every refusal. */
export const USAGE = 'Usage: /cluster [status|tasks|agents|graph]'

/** Sub-commands `/cluster` owns. */
export type ClusterSubcommand = 'status' | 'tasks' | 'agents' | 'graph'

/** One parsed invocation. */
export type ClusterCommand =
  | { readonly kind: 'run'; readonly subcommand: ClusterSubcommand }
  | { readonly kind: 'refused'; readonly reason: string }

/** Fixed member status order, so a report never reorders between runs. */
const MEMBER_STATUSES: readonly TeamMemberView['status'][] = ['running', 'idle', 'inactive', 'provisioning', 'failed']

/** Fixed task status order, so a report never reorders between runs. */
const TASK_STATUSES: readonly TeamTaskView['status'][] = ['in_progress', 'pending', 'completed', 'deleted']

/**
 * Parse one `/cluster` invocation.
 * @param rawInput - everything the user typed after the command name.
 * @returns the sub-command to run, or the reason it was refused.
 */
export function parseClusterCommand(rawInput: string): ClusterCommand {
  const input = rawInput.trim().toLowerCase()
  if (input.length === 0) return { kind: 'run', subcommand: 'status' }
  if (input === 'status' || input === 'tasks' || input === 'agents' || input === 'graph') {
    return { kind: 'run', subcommand: input }
  }
  return { kind: 'refused', reason: `"/cluster ${rawInput.trim()}" is not a cluster sub-command.\n${USAGE}` }
}

/** Render `counted name` pairs in a fixed order, omitting empty buckets. */
function buckets<T extends string>(order: readonly T[], counts: ReadonlyMap<T, number>): string {
  return order
    .filter(status => (counts.get(status) ?? 0) > 0)
    .map(status => `${status} ${counts.get(status) ?? 0}`)
    .join(', ')
}

/** Count one derived label over a list. */
function countBy<T, L extends string>(items: readonly T[], label: (item: T) => L): Map<L, number> {
  const counts = new Map<L, number>()
  for (const item of items) {
    const key = label(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/** One-line readiness annotation for a shared task. */
function readiness(task: TeamTaskView): string {
  if (task.status !== 'pending') return ''
  const blockers = task.blockedBy.length === 0 ? '' : `, blocked by ${task.blockedBy.map(String).join(', ')}`
  return task.ready ? ` (ready${blockers})` : ` (waiting${blockers})`
}

/**
 * Overall shape of the cluster: who is on it and what the board holds.
 * @param clusterName - cluster the deployment resolves as its default.
 * @param members - current roster, Lead included.
 * @param tasks - current board, tombstones included.
 * @returns the status report.
 */
export function clusterStatus(
  clusterName: string,
  members: readonly TeamMemberView[],
  tasks: readonly TeamTaskView[],
): string {
  const teammates = members.filter(member => member.role === 'teammate')
  const live = teammates.filter(member => member.status !== 'failed')
  const ready = tasks.filter(task => task.ready).length
  const waiting = tasks.filter(task => task.status === 'pending' && !task.ready).length
  return [
    `Cluster: ${clusterName}`,
    `Members: ${members.length} (lead + ${teammates.length} teammates) — ${buckets(MEMBER_STATUSES, countBy(teammates, member => member.status))}`,
    `Reachable: ${live.length} of ${teammates.length} teammates`,
    `Tasks: ${tasks.length} — ${buckets(TASK_STATUSES, countBy(tasks, task => task.status))}`,
    `Pending: ${ready} ready, ${waiting} waiting on a blocker`,
  ].join('\n')
}

/**
 * One line per shared task, in board order.
 * @param tasks - current board, tombstones included.
 * @returns the task list report.
 */
export function clusterTasks(tasks: readonly TeamTaskView[]): string {
  if (tasks.length === 0) return 'The shared board holds no task.'
  return tasks
    .map((task) => {
      const owner = task.ownerName === undefined ? 'unowned' : `owner ${task.ownerName}`
      return `${String(task.id)} [${task.status}] ${task.subject} — ${owner}${readiness(task)}`
    })
    .join('\n')
}

/**
 * One line per member, Lead first.
 * @param members - current roster, Lead included.
 * @returns the roster report.
 */
export function clusterAgents(members: readonly TeamMemberView[]): string {
  if (members.length === 0) return 'The roster holds no member.'
  return members
    .map((member) => {
      const model = member.model === undefined ? '' : `, ${member.model}`
      const diagnostics = member.diagnostics.length === 0 ? '' : ` — ${member.diagnostics.join('; ')}`
      return `${member.name} [${member.status}] ${member.role}${model}${diagnostics}`
    })
    .join('\n')
}

/**
 * The dependency edges the board carries, one blocker per line.
 * @param tasks - current board, tombstones included.
 * @returns the dependency report.
 */
export function clusterGraph(tasks: readonly TeamTaskView[]): string {
  const edges = tasks.filter(task => task.blockedBy.length > 0)
  if (edges.length === 0) return 'No shared task waits on another.'
  return edges
    .map(task => `${String(task.id)} ${task.subject} ← ${task.blockedBy.map(String).join(', ')}`)
    .join('\n')
}
