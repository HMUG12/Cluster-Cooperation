---
description: "把 Lead Agent 绑定到其 cluster 角色声明的 provider 与 model。"
kind: "package-reference"
---

# @deepseek-ai/dsh-cluster-router

[English](README.md) | 中文

## 概述

`dsh-cluster-router` 把 Team Lead 绑定到其 cluster 角色声明的模型。Lead 由 profile 入口在任何 Team 存在之前创建，因此没有别的东西能给它一个路由：本插件读取 `cluster.yml`，并在 Lead 发布时装上一个 Agent 作用域的模型选择。teammate 走另一条路——打过补丁的 `spawn_teammate` 在创建时传入其声明的路由，因为 teammate 的创建事件永远不会到达本插件。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

在 `@deepseek-ai/dsh-cluster-config` 与 Agent Teams domain 之后挂载它：

```yaml
- id: cluster-router
  name: '@deepseek-ai/dsh-cluster-router'
  config:
    cluster: default
```

| 字段 | 默认值 | 含义 |
|---|---|---|
| `cluster` | 文档中的 `defaultCluster` | 生效的 cluster。 |

### 获得的功能

Lead 会收到 `clusters.<name>.lead` 声明的路由。未声明路由的成员保持其继承的模型，并记录一条指出该成员与 cluster 的警告。

### 成功与失败分别是什么样

Lead 从第一次请求起就使用其声明的 provider 与 model。若某个路由指向未注册的 provider，会在 `llm.prepareCall` 处失败而非此处，因为 provider 注册属于适配器层。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部细节 — 点击展开</summary>

插件订阅 `agent/created`，向 `ctx.agentTeams.tryMembership(agent)` 询问成员名，解析配置中的路由，并装上来自 `@deepseek-ai/dsh-agent` 的 `installModelSelection(agent.ctx, ref)`。释放发生在 `agent/disposed`，以及插件卸载用的一个 `ctx.effect()` 中。

`agent/created` 是唯一安全的时机：AgentLoop 会先等待其串行监听器，再启动排队的工作，因此该选择在第一次 prompt 装配之前就已就位。`installModelSelection` 走 `agent/request` 瀑布，它早于 `llm.prepareCall`；若改在 `llm/stream` 动手，会被 harness 视为被改动的 prepared call 而拒绝。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [`cluster-config`](../config/README.zh.md) — 本插件读取的文档。
- [`agent/model-selection`](../../core/agent/src/model-selection.ts) — 作用域化的选择安装器。
- [`cluster-orchestrator`](../orchestrator/README.zh.md) — 这份配置的另一个消费者。

-----

<a id="model-experience"></a>
## 模型体验

### 不直接产生

#### 模型看到什么

本包不贡献任何提示小节、工具 schema 或消息文本。经由该选择产生的 provider 或 model 变更会附加 `@deepseek-ai/dsh-agent` 拥有的共享 `[model changed: ...]` 通知，而不是本包产生的。

#### Token 影响

零直接 token 影响。它改变由哪个模型服务 Lead 的请求。

#### KV Cache 影响

相互独立：插件不写入任何请求内容。由于同一路由上的每个成员共享系统策略与工具 schema，绑定到同一 provider 与 model 的成员复用同一个请求前缀；不同路由的成员完全不共享缓存。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **仅覆盖 Lead** — teammate 的创建事件不会到达本插件，因此 teammate 的路由改由 `spawn_teammate` 在创建时应用。用该工具之外的方式派生的 teammate 会保持继承的模型。
- **不执行降级** — 已声明的降级路由会被读取但从不应用；主路由失败时还不会切换。
- **不支持运行中切换** — 该选择在发布时安装一次。没有任何东西重新读取文档，因此改路由需要重启。
- **每个 profile 只支持一个 cluster** — cluster 名来自配置，因此多个路由表不同的 Team 并发运行暂不支持。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

`agent/created` 监听器在安装过程中必须保持同步。在读取成员身份与 `installModelSelection` 之间出现 `await`，会让循环有机会走到第一次请求。

</details>
