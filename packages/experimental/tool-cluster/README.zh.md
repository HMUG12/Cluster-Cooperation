---
description: "Cluster Lead 可调用的四个协议：一次持久广播、一次带回汇总的圆桌、一次由一人计票的动议，以及一次由评判者裁断的辩论。"
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-tool-cluster

[English](README.md) | 中文

## 概要

本包给 Team Lead 四种"一次把同一个问题抛给整队"的方式：一次持久广播、一次由某个成员汇总的圆桌、一次由某个成员计票的动议，以及一次由评判者裁断的辩论。每一种都是 Lead 光靠 `team_task_create` 表达不出来的扇出，因为**收口由任务板完成**：每个参与者都拥有一行，而汇总任务恰好阻塞在这些行上，于是照常走的释放路径会唤醒汇总者，并把他要读的计数或裁断一并捎上。这些工具只属于 Lead；没有挂载工具运行时的组合就是拿不到工具，不会有别的后果。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与未完成事项](#known-limitations-and-deferred-work)
- [开发说明](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

把本包与 `@deepseek-ai/dsh-experimental-agent-team`、以及一个工具运行时挂在一起。注册是按 Lead 进行且幂等的：一个 Lead 出现时它拿到这四个工具，随它一起被释放。除此之外没有别的要求，也没有配置项——无论集群声明成什么样，协议形状都一样。

集群 profile 层已经替你挂好了：

```yaml
- id: tool-cluster
  name: '@deepseek-ai/dsh-experimental-tool-cluster'
```

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>维护者工作上下文——点击展开</summary>

| 文件 | 作用 |
|---|---|
| [`src/broadcast.ts`](src/broadcast.ts) | 广播目标选择、它上报的拒绝原因，以及"被跳过目标"的措辞 |
| [`src/motion.ts`](src/motion.ts) | 动议规划、选票计数，以及携带计数的通知 |
| [`src/roundtable.ts`](src/roundtable.ts) | 圆桌规划，以及一轮所发出的全部文本 |
| [`src/debate.ts`](src/debate.ts) | 辩论规划、轮次词汇，以及裁断所要读的内容 |
| [`src/index.ts`](src/index.ts) | 插件：四个工具定义、仅 Lead 的安装，以及逐个目标的尝试 |

所有规则都住在纯模块里，由不需要活体 Team 的测试覆盖；插件只负责把它们接到工具运行时与任务板上。扇出是"逐个目标"而非全有全无：花名册触达不到的目标会在结果里带着原因上报，因为一个先改动任务板再抛错的协议会留下无主行。

唯一不归这些工具管的是**协议的收口**。计票、汇总与裁断都是带 `blockedBy` 边的普通任务板行，打开它们的释放属于编排器——所以一个协议要走完，组合里两个包都要在。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [Agent Teams](../agent-team/README.zh.md) — 每个协议所扇出的 roster、邮箱与任务板。
- [`cluster-orchestrator`](../cluster-orchestrator/README.zh.md) — 唤醒汇总者并捎上计数的释放路径。
- [`cluster-bundle`](../cluster-bundle/README.zh.md) — 把本包与集群其余部分一起挂载的 profile 层。

-----

<a id="model-experience"></a>
## 模型体验

### broadcast 工具

#### 模型看到什么

需要一次告知全队的 Lead，只需调用一次 `broadcast_message`，不必按成员逐个 `send_message`。该工具接收消息与可选的 `targets` 列表；省略它就面向当前每个 teammate。结果会报告每一次投递及其 message id 与状态，并报告每一个被拒绝的目标及原因——名字不存在、目标就是 Lead 自己，或该成员在派生阶段已失败。消息正文就是调用方自己的文字，不加框。

#### Token 影响

Lead 历史里多一次工具调用与一条简短的 JSON 结果；每个被投递的目标在接收方历史里各多一条 durable peer 消息——与逐个 `send_message` 的按目标代价完全相同。

#### KV Cache 影响

两侧都是追加式：结果与每条投递的消息都落在可复用请求前缀之后，因此不会使已缓存的前缀失效。

### roundtable 工具

#### 模型看到什么

`roundtable` 一次向若干 teammate 提出同一个问题：为每位参与者开一个作答任务、逐个指派给它的 owner、给每人发一条点明该任务的 `[ROUNDTABLE]` 通知，并留下一个被全部答案阻塞的 `Synthesis: ...` 汇总任务。该汇总任务用 `cluster-owner:` 行声明它的收集者，因此放行时的 handoff 会在最后一份答案落地的瞬间把它指派给那位成员并唤醒它。结果会报告这一轮的任务 id，以及每一个被拒绝的参与者。

#### Token 影响

Lead 历史里多一次工具调用与一条 JSON 结果；每位参与者多一条任务通知，收集者在这一轮收口时多一条指派通知。

#### KV Cache 影响

处处追加式：每条通知都落在可复用请求前缀之后，因此不会使已缓存的前缀失效。

### motion 工具

#### 模型看到什么

`motion` 把一个决定交给投票：为每位投票人开一个选票任务、逐个指派、各发一条点明该任务的 `[MOTION]` 通知，并留下一个被全部选票阻塞的 `Tally: ...` 任务。每张选票以末行 `vote: for` / `vote: against` / `vote: abstain` 记录立场；汇总任务用 `cluster-owner:` 行声明它的计票人，因此放行时的 handoff 会在最后一张票投出时把该成员指派并唤醒——**同一条通知就带着任务板已经一致同意的计数**，计票人核对的是一个数字，而不是自己去数。

#### Token 影响

Lead 历史里多一次工具调用与一条 JSON 结果；每位投票人一条选票通知；计票人一条携带计数的指派通知。

#### KV Cache 影响

处处追加式：每条通知都落在可复用请求前缀之后，因此不会使已缓存的前缀失效。

### debate 工具

#### 模型看到什么

`debate` 让一个题目分轮辩下去：开局轮为每位辩手开一个发言任务、逐个指派并各发一条点明该任务的 `[DEBATE]` 通知，之后每一轮都**被上一整轮阻塞**——这就是它所需要的轮次控制，因为任务板只会在上一轮辩完之后才开下一轮。每个发言以末行 `statement: ...` 记录论证；`Verdict: ...` 任务用 `cluster-owner:` 行声明它的裁判，因此放行时的 handoff 会在终轮收口时把该成员指派并唤醒——**同一条通知就带着终轮里有多少论证是可读的**，裁判核对的是一个数字，而不是自己去数。

#### Token 影响

Lead 历史里多一次工具调用与一条 JSON 结果；开局轮每位辩手一条通知；裁判一条携带读数的指派通知。之后每一轮每位辩手各多一条 handoff 通知，因为那一轮的发言是在放行时被指派，而不是事先指派。

#### KV Cache 影响

处处追加式：每条通知都落在可复用请求前缀之后，因此不会使已缓存的前缀失效。

## 已知限制与未完成事项

<a id="known-limitations-and-deferred-work"></a>

- 未发布运行时不变式伴随包：每条规则都是任务板与配置的纯函数，重放它们本身就是校验。
- **仅限 Lead** — teammate 有 `send_message`、`team_task_*` 和自己的邮箱；这四个协议存在的意义是"一个成员把同一个问题抛给很多人"，需要这件事的 teammate 去请 Lead。
- **没有调度策略** — 一个协议会花掉每个参与者一个回合，只有辩论自带规模上限（五轮、三十二条发言）。回合调度、并发上限与压缩仍在本包之外。
- **协议的成本等于它扇出的成本** — 每个参与者都会收到一条持久通知并拥有一行，因此对八个 teammate 的圆桌就是八轮加一次汇总；要做的是缩小参与者名单，而不是指望工具替你做。

-----

<a id="dev-note"></a>
### 开发说明

<details>
<summary>维护者工作上下文——点击展开</summary>

这些工具最初住在 `cluster-orchestrator` 里、在那儿被条件注册，因而一直进不了 `docs/tool-catalog.md`，也进不了模型体验的链接检查。把它们拆出来之后目录里才有了这一行：协议是集群面向模型的那一半，编排器保留收口它们的、事件驱动的那一半。

</details>
