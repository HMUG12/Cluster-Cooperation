---
description: "声明式 Agent Cluster 配置：从一份 cluster.yml 中读取可复用的模型路由、成员、问责与评审策略。"
kind: "package-reference"
---

# @deepseek-ai/dsh-cluster-config

[English](README.md) | 中文

## 概述

`dsh-cluster-config` 读取一份 `cluster.yml`，回答某个 cluster 声明了什么：每个成员的模型路由、每个 teammate 起步时携带的问责、已完成工作的评审策略，以及成员可花费的软 token 预算。它之所以存在，是因为 Agent Teams domain 不会透过 `spawn_teammate` 传递任何模型，没有声明时每个 teammate 都会继承 Lead 的 provider 与 model。当一次部署必须把每个角色绑定到各自的 provider、model 或供应商时，请选择本包。

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

挂载该服务并指向一份文档：

```yaml
- id: cluster-config
  name: '@deepseek-ai/dsh-cluster-config'
  config:
    file: ./cluster.yml
    defaultCluster: default
```

两个可选设置：

| 字段 | 默认值 | 含义 |
|---|---|---|
| `file` | Harness home 下的 `cluster.yml`，其次是进程 cwd | 文档位置。 |
| `defaultCluster` | 文档中的 `defaultCluster` | 调用方未指定时使用的 cluster。 |

### 文档形状

```yaml
version: 1
defaultCluster: default
models:
  planner: { provider: deepseek-official, model: deepseek-chat }
  critic: { provider: anthropic-gateway, model: claude-opus-4 }
clusters:
  default:
    topology: mesh
    orchestration:
      review: { enabled: true, reviewer: reviewer, maxRetries: 2 }
    lead:
      route: planner
      fallback: [cheap]
    members:
      - name: reviewer
        model: critic
        context: fresh
        mission: Judge delivered work against the task it claimed to satisfy.
        deliverables: [A verdict per reviewed task]
        definitionOfDone: [Every review ends in a claim, a reopen, or an escalation]
        qualityBar: [A rejection names the blocking defect, not a preference]
        writeScopes: []
        tokenBudget: 120000
```

`route`（或 `model`）的取值，要么是 `models` 下的别名，要么是内联的 `{ provider, model }` 对象。

### 获得的功能

`routeFor()` 给出某个成员的 provider 与 model。`briefingFor()` 把该成员的问责渲染成被派生的 teammate 起步时的文本，`reviewFor()` 报告评审策略，`budgetFor()` 报告成员声明的软 token 预算。未声明问责的成员不会渲染出 briefing，因此单有路由不会改动 teammate 的提示词。

### 成功与失败分别是什么样

合法文档在首次访问时被缓存。未知键、未知别名、类型错误、不是本 cluster 已声明成员的 reviewer，或指向不存在 cluster 的 `defaultCluster`，都会抛出 `ClusterConfigError` 并一次性列出每个出错的路径，早于任何查询被服务。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部细节 — 点击展开</summary>

| 文件 | 职责 |
|---|---|
| [`src/types.ts`](src/types.ts) | 文档类型与受支持的版本常量 |
| [`src/document.ts`](src/document.ts) | 严格读取器：拒绝未知键、解析别名、累积问题 |
| [`src/briefing.ts`](src/briefing.ts) | 纯函数：渲染单个成员的问责 |
| [`src/index.ts`](src/index.ts) | `ctx.clusterConfig` 服务、惰性加载与各类查询 |

加载是惰性的，因此坏文档会在第一个消费者处失败并在消息里带上文件路径，而不是在启动期失败、更难归因。校验拒绝未知键而非忽略它们，因为"一个笔误悄悄保留继承来的模型"正是本包存在的意义。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [`cluster-router`](../router/README.zh.md) — 把这些路由绑定到 Lead 的消费者。
- [`cluster-orchestrator`](../orchestrator/README.zh.md) — 读取评审策略的消费者。
- [`llm-pi-ai`](../../llm/llm-pi-ai/README.zh.md) — 声明 OpenAI 兼容与 Anthropic 兼容的 provider 路由。

-----

<a id="model-experience"></a>
## 模型体验

### 不直接产生模型上下文

#### 模型看到什么

本包不贡献任何自己的提示小节、工具 schema 或消息文本。它的 briefing 渲染由打过补丁的 `spawn_teammate` 交付——把简报插在 teammate 的身份提醒与 Lead 的任务之间。

#### Token 影响

就路由而言是零直接 token 影响。已声明的 briefing 会为每个被派生的 teammate 的第一次请求增加一个块，此后随普通历史走。

#### KV Cache 影响

就路由而言相互独立：本包不写入任何请求内容。briefing 追加在 teammate 身份前缀之后，因此它扩展该 teammate 的第一次请求，而不是替换可复用的前缀。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **没有采样参数** — `AgentOptions` 只带 `provider`、`model`、`reasoningEffort` 与 `maxTokens`，因此 `temperature` 之类的字段无法按成员绑定，只能设置在适配器路由上。
- **不支持热重载** — 改动文档只能靠重启 profile 生效；没有文件监听，也没有仅配置的 HMR 触发器。
- **不执行降级** — `fallbacksFor()` 会报告已声明的降级路由，但目前没有消费者；把失败请求改道到下一个路由的工作延后到遥测层。
- **briefing 只在派生时生效** — 已在运行的 teammate 会保持它起步时拿到的那份简报。
- **预算只报告不拦截** — `budgetFor()` 只回答成员声明了什么；由 cluster orchestrator 把它变成一条通知，没有任何东西能阻止超额花费的成员。
- **每个 profile 只支持一个 cluster** — 调用方需显式传入 cluster 名，因此多个 cluster 并发运行的部署必须为每个 profile 配置一个 `defaultCluster`。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

路由查询刻意保持同步并缓存。消费者在 `agent/created` 监听器里读取它，该监听器必须避免会让发布顺序错乱的 await。

</details>
