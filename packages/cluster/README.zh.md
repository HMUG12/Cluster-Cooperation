---
description: "集群包组的索引：profile 所挂载的声明式 Agent Cluster 配置。"
kind: "package-group"
---

# packages/cluster

[English](README.md) | 中文

## 概要

集群包组负责声明式 Agent Cluster 配置：一份 `cluster.yml` 声明 profile 所要挂载的角色、模型路由、评审策略与 token 预算，使行为靠声明而非写进每个部署。这里只剩 `config` 一个发布成员，因为"读一份文档并回答关于它的问题"是没有任何原型承诺的契约。而消费 Agent Team 的组合层、路由、任务板策略与命令四个包都是实验性的——它们所依赖的 Team 契约就是实验性的——它们位于 [`packages/experimental`](../experimental/README.zh.md)，使用 `@deepseek-ai/dsh-experimental-cluster-*` 名称。

## 目录

- [包](#packages)
- [相关文档](#related-documentation)
- [开发说明](#dev-note)

-----

<a id="packages"></a>
## 包

| 包 | 作用 | ctx key |
|---|---|---|
| [`config`](config/README.zh.md) | 声明式集群文档：路由、成员、拓扑、评审策略与预算 | `ctx.clusterConfig` |

-----

<a id="related-documentation"></a>
## 相关文档

- [Cluster Cooperation](../../docs/subsystems/cluster.zh.md) — 一个集群声明了什么，以及它的各部分如何接线。
- [实验包组](../experimental/README.zh.md) — 消费 Agent Team、并以 `@deepseek-ai/dsh-experimental-*` 发布的那些包。
- [实验子树规则](../experimental/AGENTS.md) — 实验状态放松了什么、没有放松什么。

-----

<a id="dev-note"></a>
## 开发说明

<details>
<summary>维护者工作上下文——点击展开</summary>

在"发布包不得引用实验包"的工作区约束检查生效后，面向 Agent Team 的那些包离开了本组：一个 profile 层、一个路由器、一个任务板策略插件与一条命令都消费 Agent Teams，因此它们的公开契约同样是实验性的。`config` 从来不必搬走，因为它只依赖发布包，而且它回答的是关于一份文档的问题，而不是关于一个正在运行的 Team。

</details>
