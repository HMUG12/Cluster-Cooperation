---
description: "Binds the Lead Agent to the provider and model its cluster role declares."
kind: "package-reference"
---

# @deepseek-ai/dsh-cluster-router

English | [中文](README.zh.md)

## Summary

`dsh-cluster-router` binds the Team Lead to the model its cluster role declares. The Lead is created by a profile entry point before any Team exists, so nothing else can give it a route: the plugin reads `cluster.yml` and installs an Agent-scoped model selection as the Lead is published. Teammates take the other path — the patched `spawn_teammate` passes their declared route at creation, because a teammate's creation event never reaches this plugin.

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

Mount it after `@deepseek-ai/dsh-cluster-config` and the Agent Teams domain:

```yaml
- id: cluster-router
  name: '@deepseek-ai/dsh-cluster-router'
  config:
    cluster: default
```

| Field | Default | Meaning |
|---|---|---|
| `cluster` | the document's `defaultCluster` | Cluster whose routes apply. |

### What you get

The Lead receives the route declared at `clusters.<name>.lead`. A member that declares no route keeps its inherited model and logs one warning naming the member and cluster.

### What success and failure look like

The Lead uses its declared provider and model from its first request. A route that names an unregistered provider fails at `llm.prepareCall`, not here, because provider registration belongs to the adapter layer.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The plugin subscribes to `agent/created`, asks `ctx.agentTeams.tryMembership(agent)` for the member name, resolves the configured route, and installs `installModelSelection(agent.ctx, ref)` from `@deepseek-ai/dsh-agent`. Disposal runs on `agent/disposed` and through one `ctx.effect()` for plugin teardown.

`agent/created` is the only safe window: AgentLoop awaits its serial listeners before starting queued work, so the selection is in place before the first prompt assembly. `installModelSelection` routes through the `agent/request` waterfall, which runs before `llm.prepareCall`; touching `llm/stream` instead is rejected by the harness as an altered prepared call.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [`cluster-config`](../config/README.md) — the document this plugin reads.
- [`agent/model-selection`](../../core/agent/src/model-selection.ts) — the scoped selection installer.
- [`cluster-orchestrator`](../orchestrator/README.md) — the other consumer of this configuration.

-----

<a id="model-experience"></a>
## Model Experience

### None directly

#### What the model sees

This package contributes no prompt section, tool schema, or message text. A provider or model change made through the selection appends the shared `[model changed: ...]` notice owned by `@deepseek-ai/dsh-agent`, not by this package.

#### Token effect

Zero direct token effect. It changes which model serves the Lead's requests.

#### KV Cache effect

Independent: the plugin writes no request content. Because every member on the same route shares the system policy and tool schemas, members bound to one provider and model reuse one request prefix; members on different routes do not share a cache at all.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Lead only** — a teammate's creation event never reaches this plugin, so teammate routes are applied by `spawn_teammate` at creation instead. A teammate spawned outside that tool keeps the inherited model.
- **No fallback execution** — declared fallback routes are read but never applied; a failing primary route does not fail over yet.
- **No mid-run switching** — the selection is installed once at publication. Nothing re-reads the document, so a route change needs a restart.
- **One cluster per profile** — the cluster name comes from configuration, so concurrent teams with different route tables are deferred.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The `agent/created` listener must stay synchronous through installation. An `await` between the membership read and `installModelSelection` can let the loop reach its first request.

</details>
