---
description: "Web 面板读取的集群总览：花名册、任务板、协议计数与折算花费，都在宿主侧派生。"
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-cluster-web

[English](README.md) | 中文

## 概要

本包用一个形状把集群送到浏览器：**一个生成的 Remote 方法**，返回花名册、任务板、其上的计数，以及折算后的花费——顺序已排好、计数已算好。派生之所以放在这里而不是面板里，是因为客户端 bundle **不得导入别的插件的值** ✗：凡是需要面板自己算的东西，它就根本算不了。声明的集群名与花费都按**结构性读取**取得，与 `/cluster` 命令完全一致，因此那两个包挂或不挂，本服务都能加载。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [已知限制与未完成事项](#known-limitations-and-deferred-work)
- [开发说明](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

在挂载了 Agent Team 的地方挂上它。它注册一个服务 `ctx.clusterWeb`，并以 `ctx.remote.clusterWeb` 暴露给浏览器；集群 profile 层已经替你挂好了：

```yaml
- id: cluster-web
  name: '@deepseek-ai/dsh-experimental-cluster-web'
```

### 何时选它

当某个 Web 页面需要"看到集群在做什么"、但**不**该获得任何权限时选它：服务上的每个方法都是读，且它接受的唯一凭据是一个活着的 Team 成员。headless 部署没有浏览器可服务，不需要它。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>维护者工作上下文——点击展开</summary>

| 文件 | 作用 |
|---|---|
| [`src/overview.ts`](src/overview.ts) | 视图的形状、协议分类与排序规则 |
| [`src/index.ts`](src/index.ts) | 服务：结构性读取，以及那一个 Remote 方法 |

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

<a id="known-limitations-and-deferred-work"></a>
## 已知限制与未完成事项

- 未发布运行时不变式伴随包：本视图是三个输入的纯函数，而这三个输入已由拥有它们的那些包各自断言过。
- **目前还没有东西渲染它** — 载荷以生成的 Remote 方法送到浏览器，消费它的 Web 面板是下一步。在那之前，服务是挂着的、可读的，但没有页面调用它。
- **声明是概述而非清单** — 视图报告声明的集群名与每个成员的路由模型，但不给整份 `cluster.yml`：每个成员的路由清单本身就是一块面板，而那份文档已经有读者了。
- **花费只覆盖已经花过的成员** — 编排器的折叠在成员第一次模型调用之前没有行，因此视图列出的是它折叠到的，而不是整个花名册。
- **协议分类暂时不在载荷里** — 任务板按 Team 所报的原样返回，因此没有任何东西能区分"选票"与普通行。要在这里分类就得从 `tool-cluster` 导入协议主题前缀，而**新加入包的导出在源码导入下无法被本工作区的测试运行器解析**（同一个导入来自既有包却可以 ✗）；那是下一刀的首要任务，而不是把前缀复制一份绕过去。

-----

<a id="dev-note"></a>
## 开发说明

<details>
<summary>维护者工作上下文——点击展开</summary>

方案原本写的是"扩展上游 Team 面板"；本包是它的**兄弟**，因为集群自己的两个面恰好是 Team 面板没有数据来源的那两个——声明与花费——而新增一个只读服务不必改动上游契约。面板本身落地时，会是同一个包里的浏览器半。

</details>
