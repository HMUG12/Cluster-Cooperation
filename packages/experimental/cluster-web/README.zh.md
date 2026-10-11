---
description: "Web 面板读取的集群总览：花名册、任务板、协议计数与折算花费，都在宿主侧派生。"
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-cluster-web

[English](README.md) | 中文

## 概述

本包把集群送到浏览器的方式是**一组生成的 Remote 方法**：花名册、任务板、其上的计数、折算后的花费、设置界面要编辑并保存的文档，以及那个界面**拉起来的成员**。派生之所以放在这里而不是面板里，是因为客户端 bundle **不得导入别的插件的值** ✗：凡是需要面板自己算的东西，它就根本算不了。声明的集群名、花费与文档都按**结构性读取**取得，因此那些包挂或不挂，本服务都能加载。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与未完成事项](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

在挂载了 Agent Team 的地方挂上它。它注册一个服务 `ctx.clusterWeb`，并以 `ctx.remote.clusterWeb` 暴露给浏览器；集群 profile 层已经替你挂好了：

```yaml
- id: cluster-web
  name: '@deepseek-ai/dsh-experimental-cluster-web'
```

### 何时选它

当某个 Web 页面需要"看到集群在做什么"、而页面本身**不**持有权限时选它：每个方法都以一个活着的 Team 成员为凭据，而写入由**拥有那份 schema 的服务**解析并校验，因此被拒绝的字段绝不会落到磁盘上。唯一会触达 Team 的动作是**拉起声明的成员**，而 Team 服务只接受**来自 Lead 本人会话**的那一次。headless 部署没有浏览器可服务，不需要它。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>维护者工作上下文——点击展开</summary>

| 文件 | 作用 |
|---|---|
| [`src/overview.ts`](src/overview.ts) | 视图的形状、协议分类与排序规则 |
| [`src/client/locales.ts`](src/client/locales.ts) | 面板字典：中文是键的来源，英文按它校对 |
| [`src/client/panel.ts`](src/client/panel.ts) | 面板要显示的内容（以数据表示）：分组、类别标签、行与计数 |
| [`src/client/ClusterPanel.tsx`](src/client/ClusterPanel.tsx) | 会话头部动作：按需读取视图、铺开派生结果、编辑文档，并拉起声明的成员 |
| [`src/client/mount.ts`](src/client/mount.ts) | 注册字典与会话头部动作，并挂载 Remote 命名空间 |
| [`src/index.ts`](src/index.ts) | 服务：结构性读取、总览、文档的读取与写入，以及拉起成员的动作 |

每条规则都是花名册、任务板与花费的纯函数，因此测试不需要活体 Team。顺序是**刻意固定**而非偶然：Lead 在花名册首位、同名按键名、任务按标识排序——对同一块任务板的两次读取产生同一个视图，这正是"人对人比较两份视图"和"测试"都需要的。

花费在载荷里是可选的：不折叠用量的组合就如实报"没有"，面板显示空列表，而不是一个它得凭空发明的零。声明的集群名同样可选，没有声明时就是不出现。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [Agent Teams](../agent-team/README.zh.md) — 本视图所派生的花名册与任务板。
- [`cluster-orchestrator`](../cluster-orchestrator/README.zh.md) — 发布本视图所报告的花费折叠结果。
- [`tool-cluster`](../tool-cluster/README.zh.md) — 拥有分类所读的那些主题前缀。

-----

<a id="model-experience"></a>
## 模型体验

没有，因为视图读取的是集群已经发布的服务，不添加任何模型能看到的内容。

#### KV Cache 影响

本包不添加任何模型请求内容；Prompt、Schema 与缓存影响由集群工具拥有。

## 已知限制与未完成事项

<a id="known-limitations-and-deferred-work"></a>

- 未发布运行时不变式伴随包：本视图是三个输入的纯函数，而这三个输入已由拥有它们的那些包各自断言过。
- **Web 会话需要的是集群 profile，而不是另一层** — Host 服务与浏览器入口是 `cluster-bundle` 里的**同一行**，所以把这个 profile 用到 Web 会话上，会话头部动作才会出现。[`cluster-web-profile`](../cluster-web-profile/README.zh.md) 是**故意留空的**：再插一次本包会把 `clusterWeb` 注册两遍，而加载器在启动时就会拒绝。
- **视图概述声明，文档按需读取** — 总览报告声明的集群名与每个成员的路由模型，而整份 `cluster.yml` 只在设置区打开时才取，因此只想看花名册的读者不会连带拉取那份文档。
- **从面板拉起的成员会立刻跑它的第一轮** — Team 服务是靠跑第一轮来创建一个 teammate 的，所以这个动作需要一条可用路由与可用凭据：没有的话成员**仍会被创建**，它的第一轮失败，而面板把该成员连同**宿主的理由**报成"未拉起"。
- **花费只覆盖已经花过的成员** — 编排器的折叠在成员第一次模型调用之前没有行，因此视图列出的是它折叠到的，而不是整个花名册。
- **这个动作读取的是调用会话所属的集群** — 子代理会话不会回溯到它的 Lead，因此 teammate 自己的会话读到的是它自己身份所属的集群，而不是 Lead 的。
- **协议词汇是跨服务边界读取的，不是导入的** — 分类器与它所读的主题前缀同住在 `tool-cluster` 里，并以 `ctx.clusterProtocols` 发布：跨工作区包的**值**导入在本仓的测试解析下不成立，而结构性读取成立 ✓。没有组合发布该词汇时，行上**一个类别也没有**，而不是猜一个。

-----

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

方案原本写的是"扩展上游 Team 面板"；本包是它的**兄弟**，因为集群自己的两个面恰好是 Team 面板没有数据来源的那两个——声明与花费——而新增一个服务不必改动上游契约。面板就是同一个包里的浏览器半：会话头部动作渲染视图，设置区读取那份文档、把用户敲进去的文本发回去，并在字段被拒时如实转述 schema 拥有者给出的理由。

</details>
