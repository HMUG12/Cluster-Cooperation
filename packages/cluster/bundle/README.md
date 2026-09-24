---
description: "Cluster Cooperation profile layer: Agent Teams plus declarative cluster configuration and role-based model routing, over dsh-base."
kind: "package-bundle"
---

# @deepseek-ai/dsh-cluster-bundle

English | [中文](README.zh.md)

## Summary

`dsh-cluster-bundle` is a profile layer that turns one dsh profile into a configurable Agent Cluster. Applied after `dsh-base`, its patch enables the Agent Teams domain and its scoped tools, disables ordinary subagent delegation, and mounts declarative cluster configuration with role-based model routing.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Add the package to an initialized profile, or apply the patch directly while developing:

```sh
dsh --profile headless --patch packages/cluster/bundle/cordis.patch.yml "Use Agent Teams: split this task between two teammates, wait, and summarize."
```

The profile must already contain `@deepseek-ai/dsh-base`, whose Subagent services and provider rows this layer consumes. Provide a `cluster.yml` in the Harness home or the working directory, otherwise only the Lead's inherited route applies.

### What you get

The patch disables `tool-subagent-control`, `tool-subagent-list-agents`, `tool-subagent`, and `tool-subagent-fork`, then inserts the Team service, the Team tool set, `@deepseek-ai/dsh-cluster-config`, `@deepseek-ai/dsh-cluster-router`, and `@deepseek-ai/dsh-cluster-orchestrator`.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

| File | Role |
|---|---|
| [`cordis.patch.yml`](cordis.patch.yml) | Ordered patch over `dsh-base`: four disables, then five inserts |
| [`src/index.ts`](src/index.ts) | Empty module entry; the patch is the runtime content |

The disables are required rather than cosmetic: the Team tools re-use the legacy tool names `send_message`, `list_agents`, and `interrupt_agent`, so a composition that keeps both registrations serves the legacy definitions to Team members.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [`cluster-config`](../config/README.md) — the document format.
- [`cluster-router`](../router/README.md) — the routing mechanism.
- [base bundle](../../bundle/base/README.md) — the layer this patch extends.

-----

<a id="model-experience"></a>
## Model Experience

### Team policy and tools

#### What the model sees

The Team policy and the nine tool schemas belong to [`@deepseek-ai/dsh-experimental-tool-agent-team`](../../experimental/tool-agent-team/README.md). This bundle adds no prompt text of its own; it changes composition, and it changes which provider and model serve each member through `@deepseek-ai/dsh-cluster-router`.

#### Token effect

Adds the Team policy and tool schemas described by `@deepseek-ai/dsh-experimental-tool-agent-team`, and no text of its own.

#### KV Cache effect

Prefix-stable while the patch, the configured routes, and the Team identity remain unchanged. Members bound to different providers or models do not share a cache prefix with the Lead.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Not a standalone profile** — the patch targets row ids and Subagent providers supplied by `dsh-base`.
- **Opt-in only** — no shipped profile enables this layer; it is applied with `--patch` or added to an initialized profile.
- **Shared checkout** — every teammate sees the same working directory; this bundle adds no worktree isolation or filesystem locking.
- **Incomplete orchestration policy** — dependency auto-unlock and the review loop are in place, while turn scheduling, budgets, and compaction policy are not part of this layer.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Keep the patch's insert order stable: `cluster-config` precedes `cluster-router`, and both follow the Team domain they consume.

</details>
