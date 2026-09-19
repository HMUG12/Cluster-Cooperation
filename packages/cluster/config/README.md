---
description: "Declarative Agent Cluster configuration: reusable model routes, members, and topology read from one cluster.yml document."
kind: "package-reference"
---

# @deepseek-ai/dsh-cluster-config

English | [中文](README.zh.md)

## Summary

`dsh-cluster-config` reads one `cluster.yml` document and answers per-member model routes. It exists because the Agent Teams domain threads no model through `spawn_teammate`: without a declared route, every teammate inherits the Lead's provider and model. Choose it when a deployment must bind each role to its own provider, model, or vendor.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limited-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount the service and point it at a document:

```yaml
- id: cluster-config
  name: '@deepseek-ai/dsh-cluster-config'
  config:
    file: ./cluster.yml
    defaultCluster: default
```

Two optional settings:

| Field | Default | Meaning |
|---|---|---|
| `file` | `cluster.yml` under the Harness home, then the process cwd | Document location. |
| `defaultCluster` | the document's `defaultCluster` | Cluster used when a caller supplies none. |

### Document shape

```yaml
version: 1
defaultCluster: default
models:
  planner: { provider: deepseek-official, model: deepseek-chat }
clusters:
  default:
    topology: mesh
    lead:
      route: planner
      fallback: [cheap]
    members:
      - name: reviewer
        model: critic
        context: fresh
        writeScopes: [docs/]
        tokenBudget: 120000
```

A `route` (or `model`) value is either an alias under `models` or an inline `{ provider, model }` object.

### What success and failure look like

A valid document is cached on first access. An unknown key, an unknown alias, a wrong type, or a `defaultCluster` that names no cluster throws `ClusterConfigError` listing every offending path at once, before any route is served.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

| File | Role |
|---|---|
| [`src/types.ts`](src/types.ts) | Document types and the accepted version constant |
| [`src/document.ts`](src/document.ts) | Strict reader: rejects unknown keys, resolves aliases, accumulates issues |
| [`src/index.ts`](src/index.ts) | The `ctx.clusterConfig` service, lazy load, and route lookup |

Loading is lazy so a broken document fails at the first consumer with the file path in the message, rather than during boot where the cause is harder to attribute. Validation rejects unknown keys rather than ignoring them, because a typo that silently keeps an inherited model is the exact failure this package exists to prevent.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [`cluster-router`](../router/README.md) — the consumer that installs these routes on live Agents.
- [`cluster-bundle`](../bundle/README.md) — the profile layer that mounts both.
- [`llm-pi-ai`](../../llm/llm-pi-ai/README.md) — declares OpenAI-compatible and Anthropic-compatible provider routes.

-----

<a id="model-experience"></a>
## Model Experience

### No direct model context

#### What the model sees

None, as this package contributes no prompt section, no tool schema, and no message text. It only answers which provider and model another plugin should bind to an Agent.

#### Token effect

Zero direct token effect. The selected route changes which model receives requests and therefore which prompt prefix is cached, but this package adds no content to any request.

#### KV Cache effect

Independent: the package writes no request content, so it neither preserves nor invalidates a reusable prefix by itself. Changing a member's route changes the provider or model for that member's later requests.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **No sampling parameters** — `AgentOptions` carries only `provider`, `model`, `reasoningEffort`, and `maxTokens`, so `temperature` and similar fields cannot be bound per member and must be set on the adapter route instead.
- **No hot reload** — a document edit is picked up only by restarting the profile; there is no file watcher or config-only HMR trigger.
- **No fallback execution** — `fallbacksFor()` reports declared fallbacks but nothing consumes them yet; routing a failed request to the next route is deferred to the telemetry and orchestration layers.
- **No per-cluster selection from the Lead session** — callers pass a cluster name explicitly, so a deployment running several clusters concurrently must configure one `defaultCluster` per profile.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Route lookup is deliberately synchronous and cached. The consumer reads it inside an `agent/created` listener, which must stay free of awaits that reorder publication.

</details>
