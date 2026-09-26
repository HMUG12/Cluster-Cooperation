---
description: "面向人的 /cluster 斜杠命令：在不为模型花费任何回合的前提下，查看集群的花名册、共享任务板与依赖边。"
kind: "package-reference"
---

# @deepseek-ai/dsh-command-cluster

[English](README.md) | 中文

## 摘要

`dsh-command-cluster` 为用户提供 `/cluster` 命令，从命令平面读取一个活着的 Agent Team：带每个成员运行时状态的花名册、带就绪与阻塞信息的共享任务板，以及任务之间的依赖边。命令及其直接输出停留在 UI 里，绝不进入模型请求，也不向 Team 写回任何东西。请在挂载了命令适配器的交互式部署中使用本包；没有命令适配器的 headless 与自动化应用不需要它。

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

在同时存在命令适配器与 Agent Team 的地方挂载它。每条子命令都针对调用者所属的那个 Team，因此 Lead 与 teammate 读到的是同一块任务板。

### 命令参考

| 输入 | 结果 |
|---|---|
| `/cluster` | 总体形态：集群名、按状态统计的花名册、可触达的 teammate 数量，以及按状态统计的任务板与其中有多少 pending 已就绪 |
| `/cluster status` | 同一份报告，只是显式点名 |
| `/cluster tasks` | 每个共享任务一行：id、状态、标题、owner，以及它的就绪状态与全部阻塞项 |
| `/cluster agents` | 每个成员一行，Lead 在首行：名字、运行时状态、角色、模型，以及任何诊断信息 |
| `/cluster graph` | 每条依赖一行：谁在等待，以及它在等哪些阻塞项 |

### 输出语法

四个子命令之外的输入会用 usage 行拒绝，而不会被当成自由文本。每个渲染器都保持固定的状态顺序，因此对同一块任务板的两次运行会打印出同样的行。

### 组合方式

该命令注入命令注册表与 Team 服务。已经在运行集群的部署把两者都挂上：

```yaml
- id: commands
  name: '@deepseek-ai/dsh-commands'
- id: agent-team
  name: '@deepseek-ai/dsh-experimental-agent-team'
- id: command-cluster
  name: '@deepseek-ai/dsh-command-cluster'
```

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部细节 — 点击展开</summary>

| 文件 | 职责 |
|---|---|
| [`src/report.ts`](src/report.ts) | 子命令解析与每一行渲染 |
| [`src/index.ts`](src/index.ts) | 插件：读取 Team 服务并分派一条子命令 |

该命令读取的是 Team 服务本就维护的那两份列表——花名册与任务板——并据此推导出它打印的全部内容，因此它不保存任何事实的第二份副本，也就不可能与它所查看的任务板产生分歧。解析与渲染都是纯函数，这正是每一行都能脱离活的 Team 被测试的原因。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

报告里对 owner、阻塞项与就绪状态的称呼，与编排包里通知的称呼一致，因此读者可以从任务板一路跟到它发出的消息。cluster bundle 挂载的是 headless 运行所需的集群层，并**刻意不包含**这条命令。

-----

<a id="model-experience"></a>
## 模型体验

无，因为该命令在命令平面作答：它不贡献工具、不贡献系统提示词小节、也不贡献会话内容，因此挂载它不会改动任何请求前缀。

#### KV Cache 影响

没有任何内容被追加到请求上，因此不存在会使缓存前缀失效的可能。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>

- **构造上只读** — 该命令从不认领、不重指派、也不完成任何任务，因此它无法挽救一个卡住的工作流；Lead 的工具仍是唯一的写入者。
- **还没有成本报告** — 编排器从 durable 用量折出的每成员花费尚未作为服务暴露，因此 `/cluster cost` 要等那个接口。
- **不在随附的 bundle 里** — 交互式部署自行挂载这条命令，因为没有命令适配器的启动会让它停留在 pending。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>开发备注 — 点击展开</summary>

这条命令之所以存在，是因为集群状态此前**完全没有人类可读的表面**：花名册与任务板只能透过 Lead 的工具结果看到，于是"看着一次运行"等于去读模型的转录。这里的一切都是推导出来的，所以下一步是编排器已经算好的那份花费接口，也是为什么依赖报告将来可以长成真正的树形排布，而不是每行一条边。

</details>
