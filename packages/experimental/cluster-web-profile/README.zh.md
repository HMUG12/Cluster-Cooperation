---
description: "在 Host 集群层之后，把已发布的实验性集群面板加入一个 Web profile。"
kind: "package-bundle"
---

# @deepseek-ai/dsh-experimental-cluster-web-profile

[English](README.md) | 中文

## 概述

`dsh-experimental-cluster-web-profile` 是[集群面板](../cluster-web/README.zh.md)的已发布实验性 Web 层。把它加在 `@deepseek-ai/dsh-web-app` 与 [`@deepseek-ai/dsh-experimental-cluster-bundle`](../cluster-bundle/README.zh.md) 之后，就能在浏览器里读取集群的成员、任务板与已折叠的花费，**并在那里配置集群文档**。移除任一层实验层，稳定的 base 与 Web 组合都不变。dsh 安装把它作为**可选 bundle** 出厂，没有任何随行 Web profile 会启用它；请在 Host 层之后从 Web 侧栏的 Plugins 页面打开它。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与待办](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

### 装入一个 profile

把一个已初始化的 `web` profile 按此顺序加上 Host 集群层与本 Web 层：

```sh
dsh plugin --profile web add @deepseek-ai/dsh-experimental-cluster-bundle
dsh plugin --profile web add @deepseek-ai/dsh-experimental-cluster-web-profile
```

第一条命令提供 Agent Teams、声明式配置、路由、编排器、协议工具与总览服务，并且——因为 `cluster-web` 是**双面包**——还提供注册那块面板的浏览器入口。第二层**自己不声明任何行**：把同一个服务注册两遍是加载器在启动时就会拒绝的事，所以它贡献的就是"那个可开关的层"本身。用 `dsh plugin --profile web remove @deepseek-ai/dsh-experimental-cluster-web-profile` 移除本包，就把它从 profile 的有序 bundle 列表中拿掉。

### 你会得到什么

会话头部会多出一个集群动作：读取成员、带协议计数的任务板与已折叠的花费；另有一个设置区，显示集群文档、把编辑后的文本发回去，并在字段被拒时转述 schema 拥有者给出的理由。[`@deepseek-ai/dsh-experimental-cluster-web`](../cluster-web/README.zh.md) 拥有它的两半：派生视图的 Host 服务，以及挂载生成的 Client Remote 命名空间并注册该动作的浏览器入口。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内幕 —— 点击展开</summary>

本包的运行时内容就是 [`cordis.patch.yml`](cordis.patch.yml)。应用在 `dsh-web-app` 与 Host 集群层之后，它**刻意不声明任何行**：挂载 `@deepseek-ai/dsh-experimental-cluster-web` 的那条 `ui-cluster` 行属于 Host 集群 bundle，而那一行同时也点亮了本包的浏览器入口。这个静态 bundle 不持有可变状态，也不安装任何运行时不变式。

| 文件 | 作用 |
|---|---|
| [`cordis.patch.yml`](cordis.patch.yml) | 有序 Web patch，刻意不声明任何条目 |
| [`src/index.ts`](src/index.ts) | 空模块入口；运行时内容是那份 patch |
| — | 未发布运行时不变式伴随包；本包只承载一份静态 profile patch。Remote 组装与面板各自拥有其激活前提。 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [实验包](../README.zh.md) — 孵化状态与发布策略。
- [集群 Host bundle](../cluster-bundle/README.zh.md) — 所必需的领域、路由、编排器与服务层。
- [集群 Web 服务与面板](../cluster-web/README.zh.md) — 视图、它的派生，以及浏览器动作。
- [Web bundle](../../bundle/web-app/README.zh.md) — 这份 patch 所扩展的稳定浏览器层。

-----

<a id="model-experience"></a>
## 模型体验

间接地，经由与本 Web 层一同选用的 Host 侧集群 bundle。

#### KV Cache 影响

这个 Web bundle 不添加任何模型请求内容；Prompt、Schema 与缓存影响由 Host 侧集群工具与编排器拥有。

## 已知限制与待办

<a id="known-limitations-and-deferred-work"></a>

- **有序组合** — `dsh-base`、`dsh-web-app`、`dsh-experimental-cluster-bundle` 与本包必须保持该顺序。
- **仅限选用** — 本包出厂时处于关闭状态；没有任何随行 Web profile 会启用这些实验性集群层。
- **这一层是开关，不是挂载** — 它不声明自己的行，所以把它从 profile 的 bundle 列表里移除就是关掉面板；以为这个文件里会写着面板的读者在这里找不到它。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文 —— 点击展开</summary>

这一层存在的原因是：出厂的**可选 bundle** 流程要把一个 Web 呈现面当作有名字的 bundle 来开关，因此这份不含任何行的 patch 就是内容本身，而不是占位符。动作是**按需读取**而不是挂载即读，因为大多数会话根本不会打开它。
</details>
