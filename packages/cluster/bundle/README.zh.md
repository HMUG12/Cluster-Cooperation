---
description: "Cluster Cooperation profile 层：在 dsh-base 之上同时挂载 Agent Teams、声明式集群配置与按角色路由的模型。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-cluster-bundle

[English](README.md) | 中文

## 概述

`dsh-cluster-bundle` 是一层 profile 层，把一个 dsh profile 变成可配置的 Agent Cluster。它应用在 `dsh-base` 之后：patch 会启用 Agent Teams domain 与它作用域内的工具、禁用普通 subagent 委派，并挂载声明式集群配置与按角色路由的模型。

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

把本包加入已初始化的 profile，或在开发时直接应用该 patch：

```sh
dsh --profile headless --patch packages/cluster/bundle/cordis.patch.yml "Use Agent Teams: split this task between two teammates, wait, and summarize."
```

profile 必须已经包含 `@deepseek-ai/dsh-base`，本层会消费其中的 Subagent 服务与提供方配置行。请在 Harness home 或工作目录提供 `cluster.yml`，否则只有 Lead 继承来的路由生效。

### 获得的功能

patch 会禁用 `tool-subagent-control`、`tool-subagent-list-agents`、`tool-subagent` 与 `tool-subagent-fork`，然后插入 Team 服务、Team 工具集、`@deepseek-ai/dsh-cluster-config`、`@deepseek-ai/dsh-cluster-router` 与 `@deepseek-ai/dsh-cluster-orchestrator`。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部细节 — 点击展开</summary>

| 文件 | 职责 |
|---|---|
| [`cordis.patch.yml`](cordis.patch.yml) | 叠加在 `dsh-base` 之上的有序 patch：四次禁用，然后五次插入 |
| [`src/index.ts`](src/index.ts) | 空模块入口；patch 才是运行内容 |

这些禁用是必需的而非装饰性的：Team 工具复用了 legacy 工具名 `send_message`、`list_agents` 与 `interrupt_agent`，因此同时保留两套注册的组合会把 legacy 定义提供给 Team 成员。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [`cluster-config`](../config/README.zh.md) — 文档格式。
- [`cluster-router`](../router/README.zh.md) — 路由机制。
- [base bundle](../../bundle/base/README.zh.md) — 本 patch 所扩展的层。

-----

<a id="model-experience"></a>
## 模型体验

### Team 策略与工具

#### 模型看到什么

Team 策略与九个工具 schema 属于 [`@deepseek-ai/dsh-experimental-tool-agent-team`](../../experimental/tool-agent-team/README.zh.md)。本 bundle 不添加自己的提示文本；它改变组合方式，并通过 `@deepseek-ai/dsh-cluster-router` 改变每个成员由哪个提供方与模型服务。

#### Token 影响

添加 `@deepseek-ai/dsh-experimental-tool-agent-team` 所述的 Team 策略与工具 schema，不添加自己的文本。

#### KV Cache 影响

只要 patch、已配置路由与 Team 身份不变，前缀即稳定。绑定到不同提供方或模型的成员之间不共享缓存前缀。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **不是独立 profile** — 该 patch 针对 `dsh-base` 提供的配置行 id 与 Subagent 提供方，不能单独使用。
- **仅限可选启用** — 没有任何随附 profile 会启用本层；需用 `--patch` 应用，或加入已初始化的 profile。
- **共享工作目录** — 每个 teammate 看到同一个工作目录；本 bundle 不提供 worktree 隔离或文件系统锁。
- **编排策略不完整** — 依赖自动解锁与评审回路已就绪，但轮次调度、预算与压缩策略仍未包含在本层。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

请保持 patch 插入顺序稳定：`cluster-config` 先于 `cluster-router`，两者都在它们所消费的 Team domain 之后。

</details>
