---
description: "让共享的 Team 任务板持续运转：唤醒被解锁的 owner、按重试预算评审已完成的工作，并让成员花费不超出 cluster 声明的额度。"
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-cluster-orchestrator

[English](README.md) | 中文

## 概述

`dsh-experimental-cluster-orchestrator` 执行其 cluster 声明的任务板与预算策略。Agent Teams domain 会记录 `blockedBy` 边并算出 `ready`，但它从不通知任何人；一个任务完成也说明不了干得好不好；而声明的 `tokenBudget` 根本没有任何消费者。本插件从 durable 日志上补上这三个缺口：一次完成会唤醒被它解锁的 owner，开出 cluster 声明的评审，并把每一次已结算的模型调用折算进"预算所衡量的花费"。

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
  name: '@deepseek-ai/dsh-experimental-cluster-orchestrator'
  config:
    dependencyAutoUnlock: true
    reviewLoop: true
    budgetWatch: true
```

| 字段 | 默认值 | 含义 |
|---|---|---|
| `dependencyAutoUnlock` | `true` | 某个阻塞项完成时，是否唤醒被解锁任务的 owner。 |
| `reviewLoop` | `true` | 某个任务完成时，是否开出其 cluster 声明的评审。 |
| `budgetWatch` | `true` | 成员超出其声明的 token 预算时，是否被要求收尾。 |

### 获得的功能

当某个共享任务到达 `completed` 时，所有把它列为阻塞项、已有 owner、且再无未完成阻塞项的 `pending` 任务，都会收到一条 durable 的 `[TASK READY]` 消息。同一次完成还会为 `cluster.yml` 声明的 reviewer 开出 `Review: <原标题>`、把它分配给该成员，并投递 `[REVIEW]`。仍欠着评审的完成事件谁都不唤醒：它的下游要等裁决，而"完成那次评审"才是释放下游的事实。被放行但无主、却在自身 `cluster-owner:` 行上声明了主人的任务，会先被指派给那位成员——这正是"扇出之后留一个等待最后一份答案的汇总任务"得以成立的原因：任务板拒绝给仍被阻塞的任务指派，所以声明只能在放行那一刻兑现。

被驳回后回来的任务，按"为它开过的评审数"计数：未超 `maxRetries` 时 owner 收到 `[RETRY k/max]`，到达预算后由 Lead 收到 `[ESCALATE]`，不再进入下一轮。

每一次 durable 模型调用还会折算进其会话的花费。超出 cluster 声明 `tokenBudget` 的成员会被告知一次：收尾在飞的工作，并由它自己把这次超额汇报给 Lead。

Lead 还多了四个工具。`broadcast_message` 把一条 durable 消息发给当前每个 teammate，或发给它点名的成员，并把每一次拒绝连同原因报告回来，而不是悄悄丢掉。`roundtable` 走得更远：一次调用就把同一个问题变成若干"由成员自己拥有的作答任务"，并留下一个被全部答案阻塞的汇总任务——于是它指定的收集者会在最后一份答案落地的瞬间被指派、被唤醒。`motion` 把一个决定交给投票：每位投票人一个选票任务，外加一个 `Tally:` 任务——最后一张票投出时它被指派给某位队友，并**同时携带已经数好的结果**，因为任务板本来就知道。`debate` 让一个题目分轮辩下去：每位辩手每轮一个发言任务，第 r 轮被"第 r-1 轮的全部任务"阻塞，而 `Verdict:` 任务在终轮收口时被指派给一位裁判——并**同时携带终轮里有多少论证是可读的**。

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
| [`src/spend.ts`](src/spend.ts) | 用量折算、预算裁决，以及两条预算通知 |
| [`src/handoff.ts`](src/handoff.ts) | 放行时按声明指派，以及随之送达的那条唤醒 |
| [`src/index.ts`](src/index.ts) | 插件：事件订阅、成员解析、串行投递 |

插件订阅 `session/event` 并过滤出 durable 提交而非轮询，因此每条通知都搭在"改变了任务板的同一个事实"上。所有判定都在纯模块里，这正是每条规则都能脱离活的 Team 被测试的原因。投递串在一条 promise 链上，慢消息不会让后一次事件超越它。

重放抑制的键因规则而异，因为合适的键本来就不同：任务板以 `taskId::revision` 为键，而花费只折算比该会话上次折算过的 `seq` 更新的事件。两者都让重放成为空操作，同时不保留会漂移的状态；拒绝条件与规则本身同样重要——评审任务不会被再评审、reviewer 自己的产出不会被评审、已有评审记录的完成不会再开一次。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [Agent Teams](../../experimental/agent-team/README.zh.md) — 本插件读取的 roster、邮箱与任务板。
- [`cluster-config`](../../cluster/config/README.zh.md) — 声明 reviewer、重试预算与每个成员的 token 预算。
- [`cluster-bundle`](../cluster-bundle/README.zh.md) — 同时挂载这三者的 profile 层。

-----

<a id="model-experience"></a>
## 模型体验

### 任务板通知

#### 模型看到什么

每次决策产生一条 durable 的 user 角色消息，投递给必须行动的那个成员。每条文本都会指出任务或成员、要执行的动作，以及适用时的预算；Lead 不会收到关于自己任务的这类通知，无事可做的成员什么也收不到。这些固定文本由 [`src/ready.ts`](src/ready.ts)、[`src/review.ts`](src/review.ts)、[`src/spend.ts`](src/spend.ts) 与 [`src/handoff.ts`](src/handoff.ts) 拥有，最后一个负责那条"随指派一起到达"的变体：

##### 该字段的逐字文本（需要时）

```markdown
[TASK READY] task-2 "wire the endpoint" is unblocked because task-1 completed. Call team_task_get task-2 for the current revision: if it is still unowned, team_task_update task-2 with action "claim" using that revision; otherwise it is already yours, so finish it and team_task_update task-2 with action "complete". Report the outcome to the Lead.
```

#### Token 影响

有条件的、由日志驱动：在出现完成、释放、驳回或预算越线之前为零 token，之后每个受影响的成员各收到一条短消息，并像其他 peer 消息一样保留在接收方历史里。

#### KV Cache 影响

对接收方是追加式的：每条通知都追加在可复用的请求前缀之后。它既不替换早先的 token，也不使已缓存的前缀失效。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- 未发布运行时不变式伴随包：任务板与预算的折叠都是 durable 日志的函数，重放该日志本身就是校验。
- **只是唤醒** — 通知是一条消息，不是认领。owner 仍须调用 `team_task_get` 与 `team_task_update`，因此无视邮箱的成员会让这条边卡住。
- **指派依赖声明活到放行那一刻** — 最后一个阻塞项落地时，`cluster-owner:` 行必须仍在描述里、且该名字仍在花名册上；否则该任务保持无主，也就没有人会为它被唤醒。
- **预算只通知，不强停** — 超预算的成员每个会话被要求收尾一次，且没有任何东西取消它这一轮，因此无视通知的成员会继续花费。
- **评审裁决依赖任务板** — 批准 = 完成评审任务，驳回 = 重开被审任务。两者都不做的 reviewer 会让评审永远开着。
- **下游等的是裁决** — 正因为被评审的完成事件不释放任何人，始终不批准的 reviewer 会让该任务下游全部卡住，只能靠人工或 Lead 打破僵局。
- **Lead 无法被寻址** — Team 邮箱拒绝成员发给自己，而本插件只持有 Lead 这一个凭据，因此"与 Lead 有关"的通知只能把 Lead 写进成员自己的通知里、由成员转达；无 owner 的升级没有任何合法收件人，改为记录日志给运维。
- **只由完成触发** — 重开一个已完成任务不会再通知，完成之后再新增的阻塞项也不会被重放。
- **没有轮次控制** — 轮次调度、每轮上限与压缩策略不属于本包。
- **圆桌的私密性上限就是任务板的可见性** — 每个作答任务所有成员都读得到，因此答案是公开的；而启用评审时，评审策略会把每份答案与汇总当作普通完成事件一并评审。
- **计数只等于它所读到的行** — 没有可读 `vote:` 行就被完成的选票会计为 unrecorded，并在通知里作为附加说明列出；因此一轮投票可能以"计数与名册对不上"收尾，而不是给出一个谁也核对不了的结论。
- **仍在 provisioning 的 teammate 无法被触达** — 邮箱与任务板都把目标解析到花名册的 active 阶段，所以向一个还在启动中的成员发消息或派任务都会抛错。四种协议都把它记为 skipped 并附上原因，而不是先改动任务板、再半途失败——这正是"刚 `spawn_teammate` 完就发起扇出"会踩到的情形。
- **裁决只权衡终轮** — 之前的轮次仍留在任务板上、仍然可读，但裁决任务只被终轮阻塞，因此裁判权衡的是收尾论证，除非它自己去翻更早的轮次。
- **辩论规模是硬上限而非可配置项** — 超过五轮、或超过三十二个发言任务，会被提前拒绝；因为每一轮都要花掉每位辩手一整个回合，而那种规模的辩论花费大于它所能决定的东西。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

请保持这些纯模块的纯粹性：它们是每条规则都能脱离活的 Team 获得覆盖的唯一原因。

</details>
