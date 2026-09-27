---
description: "The cluster group map: the declarative Agent Cluster configuration a profile mounts."
kind: "package-group"
---

# packages/cluster

English | [中文](README.zh.md)

## Summary

The cluster group owns the declarative Agent Cluster configuration: one `cluster.yml` that names the roles, model routes, review policy, and token budgets a profile mounts, so behaviour is declared instead of written into each deployment. Only `config` remains a release member here, because reading a document and answering questions about it is a contract with no prototype promise. The composition, routing, board-policy, and command packages that consume an Agent Team are experimental — the Team contract they build on is — and they live in [`packages/experimental`](../experimental/README.md) under `@deepseek-ai/dsh-experimental-cluster-*` names.

## Table of Contents

- [Packages](#packages)
- [Related documentation](#related-documentation)
- [Dev Note](#dev-note)

-----

<a id="packages"></a>
## Packages

| Package | Role | ctx key |
|---|---|---|
| [`config`](config/README.md) | Declarative cluster document: routes, members, topology, review policy, and budgets | `ctx.clusterConfig` |

-----

<a id="related-documentation"></a>
## Related documentation

- [Cluster Cooperation](../../docs/subsystems/cluster.md) — what a cluster declares and how its parts wire together.
- [Experimental group](../experimental/README.md) — the packages that consume an Agent Team and publish under `@deepseek-ai/dsh-experimental-*`.
- [Experimental subtree rules](../experimental/AGENTS.md) — what experimental status does and does not relax.

-----

<a id="dev-note"></a>
## Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The Agent-Team-facing packages left this group once the workspace constraint check enforced that a release package must not name an experimental one: a profile layer, a router, a board-policy plugin, and a command all consume Agent Teams, so their public contracts are experimental too. `config` never had to move, because it depends only on release packages and answers about a document rather than about a running Team.

</details>
