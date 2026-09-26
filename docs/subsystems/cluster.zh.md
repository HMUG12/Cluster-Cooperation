# Cluster Cooperation

[English](cluster.md) | 中文

Cluster Cooperation 这一组包为一队 agent 提供声明的路由、声明的问责与声明的预算。[Agent Teams](agent-team.zh.md) 拥有花名册、邮箱与共享任务板；本页记录 cluster 层在其之上补了什么：一份 `cluster.yml` 文档、回答它的 `ctx.clusterConfig` 服务、派生 teammate 时施加的按成员模型绑定，以及施加于完成事件的编排策略。[architecture.md](../architecture.zh.md) 把这一层放回更大的插件树里。

## 文档

一份文档声明格式版本、`models` 下的可复用路由别名，以及一个或多个具名 cluster。cluster 声明拓扑、可选的并发与编排块、一个 Lead，以及它的成员。成员声明绑定它的路由（或 `models` 别名）、有序的 fallback、被派生 teammate 起步时携带的问责（`description`、`mission`、`deliverables`、`definitionOfDone`、`qualityBar`）、建议性的 `writeScopes`，以及软性 `tokenBudget`。

读取器刻意严格。未知键、未知别名、类型错误、不是本 cluster 已声明成员的 reviewer、重复的成员名，或不是正整数的预算与并发上限，都会在加载时拒绝整份文档，并一次性列出每个出错的路径——因为"拼错后静默保留继承来的模型"正是这一层存在的理由。

## 服务回答什么

`ctx.clusterConfig` 在第一个消费者处惰性加载文档，因此坏文件会在被使用的地方失败，而不是在启动期间。`routeFor()` 给出某个成员的 provider 与 model，`fallbacksFor()` 给出它有顺序的备选，`briefingFor()` 给出被派生 teammate 起步时的问责文本，`reviewFor()` 给出评审策略，`budgetFor()` 给出成员声明的软 token 预算。未声明路由的成员沿用 Lead 继承来的那条；未声明问责的成员不会渲染出 briefing。

## 各部分如何接线

[`cluster-config`](../../packages/cluster/config/README.zh.md) 拥有文档与服务。[`cluster-router`](../../packages/cluster/router/README.zh.md) 在 teammate 的 Agent 被创建时把它绑定到声明的路由上——这是让"按角色选模型"真正成立的唯一接缝：Agent Teams 不会透过 `spawn_teammate` 传递任何模型。[`cluster-orchestrator`](../../packages/cluster/orchestrator/README.zh.md) 读同一份声明来推动共享任务板：唤醒被解锁的 owner、把下游卡在评审裁决上、按重试预算计数驳回、盯住成员花费。[`cluster-bundle`](../../packages/cluster/bundle/README.zh.md) 是挂载整套的 profile 层。

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.zh.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxclusterconfig--clusterconfig"></a>

### `ctx.clusterConfig` — `ClusterConfig`

Owns one cluster document and answers per-member model routes.

The document is read lazily on first access and cached for the service lifetime, so a misconfiguration surfaces as a loud failure at the first consumer instead of at boot time.

```ts cordis-catalog
/**
 * Cluster used when a caller supplies no name.
 * @returns the configured cluster.
 * @throws Error when no cluster can be selected unambiguously.
 */
defaultClusterName(): string

/**
 * Read one declared cluster.
 * @param name - cluster name, defaulting to {@link defaultClusterName}.
 * @returns the complete cluster declaration.
 */
cluster(name: string = this.defaultClusterName()): ClusterSpec

/**
 * Read one member declaration.
 * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
 * @param memberName - model-facing member name, or `lead`.
 * @returns the member row, or undefined when it is not declared.
 */
member(clusterName: string, memberName: string): MemberSpec | undefined

/**
 * Resolve the primary route bound to one cluster member.
 * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
 * @param memberName - model-facing member name, or `lead` for the coordinator.
 * @returns the configured selection, or undefined when the member declares no route.
 */
routeFor(clusterName: string, memberName: string): ModelSelection | undefined

/**
 * Ordered fallback routes for one cluster member, excluding its primary route.
 * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
 * @param memberName - model-facing member name, or `lead`.
 * @returns configured fallbacks, empty when none are declared.
 */
fallbacksFor(clusterName: string, memberName: string): ModelSelection[]

/**
 * Render the accountability a spawned member starts with.
 * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
 * @param memberName - model-facing member name. The Lead declares no briefing.
 * @returns the briefing text, or undefined when the member declares none.
 */
briefingFor(clusterName: string, memberName: string): string | undefined

/**
 * Read the soft token budget declared for one member.
 * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
 * @param memberName - model-facing member name. A Lead declares no budget.
 * @returns the declared budget, or undefined when the member declares none.
 */
budgetFor(clusterName: string, memberName: string): number | undefined

/**
 * Read the review policy that governs completed work.
 * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
 * @returns the enabled review policy, or undefined when review is off.
 */
reviewFor(clusterName: string = this.defaultClusterName()): ReviewSpec | undefined
```

Types: [ModelSelection](core.zh.md)

Source: [`packages/cluster/config/src/index.ts`](../../packages/cluster/config/src/index.ts)
<!-- END GENERATED cordis-surface -->

## 已知边界

这一层声明的比它执行的多。`topology` 与 `maxConcurrency` 会被解析并做范围校验，但完全空转——谁能和谁说话完全由 Team 邮箱决定，也没有东西限制同时运行的成员数。超预算的成员是被"要求"收尾，而不是被停下。与本层有关的、面向 Lead 的通知无法由本层投递给 Lead，因为 Team 邮箱拒绝成员发给自己，改由成员转达。每个包的 README 各自完整记录了它的边界。
