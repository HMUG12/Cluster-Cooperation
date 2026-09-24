---
description: "让共享的 Team 任务板持续运转：唤醒被解锁的 owner，并按重试预算评审已完成的工作。"
kind: "package-reference"
---

# @deepseek-ai/dsh-cluster-orchestrator

[English](README.md) | 中文

## 概述

`dsh-cluster-orchestrator` 执行其 cluster 声明的任务板策略。Agent Teams domain 会记录 `blockedBy` 边并算出 `ready`，但它从不通知任何人；而一个任务完成也说明不了干得好不好。本插件从同一个 durable `team/task` 提交上补上这两个缺口：一次完成会唤醒被它解锁的 owner，同时开出 cluster 声明的评审，并把驳回计数到重试预算用尽。

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

把它与 Team domain、`@deepseek-ai/dsh-cluster-config` 一同挂载：

```yaml
- id: cluster-orchestrator
  name: '@deepseek-ai/dsh-cluster-orchestrator'
  config:
    dependencyAutoUnlock: true
    reviewLoop: true
```

| 字段 | 默认值 | 含义 |
|---|---|---|
| `dependencyAutoUnlock` | `true` | 某个阻塞项完成时，是否唤醒被解锁任务的 owner。 |
| `reviewLoop` | `true` | 某个任务完成时，是否开出其 cluster 声明的评审。 |

### 获得的功能

当某个共享任务到达 `completed` 时，所有把它列为阻塞项、已有 owner、且再无未完成阻塞项的 `pending` 任务，都会收到一条 durable 的 `[TASK READY]` 消息。同一次完成还会为 `cluster.yml` 声明的 reviewer 开出 `Review: <原标题>`、把它分配给该成员，并投递 `[REVIEW]`。

被驳回后回来的任务，按"为它开过的评审数"计数：未超 `maxRetries` 时 owner 收到 `[RETRY k/max]`，到达预算后由 Lead 收到 `[ESCALATE]`，不再进入下一轮。

### 成功与失败分别是什么样

被解锁的 owner 无需 Lead 轮询任务板就开始工作。释放不了任何人的完成事件什么也不发，重放同一次完成也是空操作。投递失败只记录日志，绝不让"完成任务的那一轮"失败。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部细节 — 点击展开</summary>

| 文件 | 职责 |
|---|---|
| [`src/ready.ts`](src/ready.ts) | 就绪判定与唤醒文本 |
| [`src/review.ts`](src/review.ts) | 评审请求、驳回计数，以及两种裁决文本 |
| [`src/index.ts`](src/index.ts) | 插件：事件订阅、成员解析、串行投递 |

插件订阅 `session/event` 并过滤出 durable `team/task` 提交而非轮询，因此每次唤醒都搭在"改变了任务板的同一个事实"上。所有判定都在两个纯模块里，这正是两条规则都能脱离活的 Team 被测试的原因。投递串在一条 promise 链上，慢消息不会让后一次完成超越它。重放抑制以 `taskId::revision` 为键：一个 revision 标识一种任务板状态，因此重放的事件被忽略，而任何真实变更都能通过。

拒绝条件与规则本身同样重要。评审任务不会被再评审、reviewer 自己的产出不会被评审、已有评审记录的完成不会再开一次——最后这条保证正是重放安全的前提。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [Agent Teams](../../experimental/agent-team/README.zh.md) — 本插件读取的 roster、邮箱与任务板。
- [`cluster-config`](../config/README.zh.md) — 声明 reviewer 与重试预算。
- [`cluster-bundle`](../bundle/README.zh.md) — 同时挂载这三者的 profile 层。

-----

<a id="model-experience"></a>
## 模型体验

### 任务板通知

#### 模型看到什么

每次任务板决策产生一条 durable 的 user 角色消息，投递给必须行动的那个成员。每条文本都会指出任务 id、要执行的动作，以及适用时的预算；Lead 不会收到关于自己任务的这类通知，无事可做的成员什么也收不到。这些固定文本由 [`src/ready.ts`](src/ready.ts) 与 [`src/review.ts`](src/review.ts) 拥有：

##### 该字段的逐字文本（需要时）

```markdown
[TASK READY] task-2 "wire the endpoint" is unblocked because task-1 completed. Call team_task_get task-2 for the current revision, then team_task_update task-2 with action "claim" using that revision, and report the outcome to the Lead.
```

#### Token 影响

有条件的、由任务板驱动：在出现完成、释放或驳回之前为零 token，之后每个受影响的成员各收到一条短消息，并像其他 peer 消息一样保留在接收方历史里。

#### KV Cache 影响

对接收方是追加式的：每条通知都追加在可复用的请求前缀之后。它既不替换早先的 token，也不使已缓存的前缀失效。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **只是唤醒** — 通知是一条消息，不是认领。owner 仍须调用 `team_task_get` 与 `team_task_update`，因此无视邮箱的成员会让这条边卡住。
- **评审裁决依赖任务板** — 批准 = 完成评审任务，驳回 = 重开被审任务。两者都不做的 reviewer 会让评审永远开着。
- **只由完成触发** — 重开一个已完成任务不会再通知，完成之后再新增的阻塞项也不会被重放。
- **没有预算与轮次控制** — 轮次调度、token 预算与压缩策略不属于本包。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

请保持这两个纯模块的纯粹性：它们是两条规则都能脱离活的 Team 获得覆盖的唯一原因。

</details>
