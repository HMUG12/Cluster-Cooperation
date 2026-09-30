/**
 * Cluster panel dictionaries.
 *
 * The panel renders no literal copy of its own: every string a reader sees comes
 * from here, so the Chinese dictionary is the key source and the English one is
 * checked against it.
 *
 * @module @deepseek-ai/dsh-experimental-cluster-web/client
 */

/** Locale namespace owned by the cluster panel. */
export const NS = 'cluster'

/** Simplified Chinese dictionary and key source. */
export const zh = {
  title: '集群',
  refresh: '刷新集群',
  loading: '正在加载集群…',
  emptyRoster: '还没有成员',
  emptyBoard: '还没有任务',
  emptySpend: '还没有成员花过模型调用',
  roster: '成员',
  board: '任务',
  spend: '花费',
  summary: '成员 {members} · 任务 {tasks} · 可开始 {ready} · 被阻塞 {blocked}',
  summaryKinds: ' · 选票 {ballot} · 计票 {tally} · 发言 {speech} · 裁决 {verdict} · 普通任务 {task}',
  unowned: '未分配',
  roleLead: 'Lead',
  roleTeammate: 'teammate',
  blocked: '被阻塞',
  billable: '可计费 token',
  calls: '次调用',
  budgetOf: '预算 {budget}',
  overBudget: '已超预算',
  kindBallot: '选票',
  kindTally: '计票',
  kindSpeech: '发言',
  kindVerdict: '裁决',
  kindTask: '普通任务',
  'status.pending': '待处理',
  'status.in_progress': '进行中',
  'status.completed': '已完成',
  'status.deleted': '已删除',
  'memberStatus.running': '运行中',
  'memberStatus.idle': '空闲',
  'memberStatus.inactive': '未运行',
  'memberStatus.provisioning': '准备中',
  'memberStatus.failed': '失败',
} satisfies Record<string, string>

/** Cluster panel locale key union. */
export type ClusterKey = keyof typeof zh

/** English dictionary checked against the Chinese key set. */
export const en = {
  title: 'Cluster',
  refresh: 'Refresh cluster',
  loading: 'Loading cluster…',
  emptyRoster: 'No members yet',
  emptyBoard: 'No tasks yet',
  emptySpend: 'No member has spent a model call yet',
  roster: 'Members',
  board: 'Tasks',
  spend: 'Spend',
  summary: 'Members {members} · tasks {tasks} · ready {ready} · blocked {blocked}',
  summaryKinds: ' · ballots {ballot} · tallies {tally} · speeches {speech} · verdicts {verdict} · ordinary {task}',
  unowned: 'Unowned',
  roleLead: 'Lead',
  roleTeammate: 'teammate',
  blocked: 'Blocked',
  billable: 'billable tokens',
  calls: 'calls',
  budgetOf: 'budget {budget}',
  overBudget: 'over budget',
  kindBallot: 'Ballot',
  kindTally: 'Tally',
  kindSpeech: 'Speech',
  kindVerdict: 'Verdict',
  kindTask: 'Ordinary task',
  'status.pending': 'Pending',
  'status.in_progress': 'In progress',
  'status.completed': 'Completed',
  'status.deleted': 'Deleted',
  'memberStatus.running': 'Running',
  'memberStatus.idle': 'Idle',
  'memberStatus.inactive': 'Inactive',
  'memberStatus.provisioning': 'Provisioning',
  'memberStatus.failed': 'Failed',
} satisfies Record<ClusterKey, string>
