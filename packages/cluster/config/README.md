---
description: "Declarative Agent Cluster configuration: reusable model routes, members, accountability, and review policy read from one cluster.yml document."
kind: "package-reference"
---

# @deepseek-ai/dsh-cluster-config

English | [中文](README.zh.md)

## Summary

`dsh-cluster-config` reads one `cluster.yml` document and answers what a cluster declared: per-member model routes, the accountability each teammate starts with, the review policy for completed work, and the soft token budget a member may spend. It exists because the Agent Teams domain threads no model through `spawn_teammate`, so without a declaration every teammate inherits the Lead's provider and model. Choose it when a deployment must bind each role to its own provider, model, or vendor.

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
  critic: { provider: anthropic-gateway, model: claude-opus-4 }
clusters:
  default:
    topology: mesh
    orchestration:
      review: { enabled: true, reviewer: reviewer, maxRetries: 2 }
    lead:
      route: planner
      fallback: [cheap]
    members:
      - name: reviewer
        model: critic
        context: fresh
        mission: Judge delivered work against the task it claimed to satisfy.
        deliverables: [A verdict per reviewed task]
        definitionOfDone: [Every review ends in a claim, a reopen, or an escalation]
        qualityBar: [A rejection names the blocking defect, not a preference]
        writeScopes: []
        tokenBudget: 120000
```

A `route` (or `model`) value is either an alias under `models` or an inline `{ provider, model }` object.

### What you get

`routeFor()` answers the provider and model for one member. `briefingFor()` renders that member's accountability into the text a spawned teammate starts with, `reviewFor()` reports the review policy, and `budgetFor()` reports the soft token budget a member declared. A member that declares no accountability renders no briefing, so a route alone changes nothing about the teammate's prompt.

### What success and failure look like

A valid document is cached on first access. An unknown key, an unknown alias, a wrong type, a reviewer that is not a declared member, or a `defaultCluster` that names no cluster throws `ClusterConfigError` listing every offending path at once, before anything is served.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

| File | Role |
|---|---|
| [`src/types.ts`](src/types.ts) | Document types and the accepted version constant |
| [`src/document.ts`](src/document.ts) | Strict reader: rejects unknown keys, resolves aliases, accumulates issues |
| [`src/briefing.ts`](src/briefing.ts) | Pure rendering of one member's accountability |
| [`src/index.ts`](src/index.ts) | The `ctx.clusterConfig` service, lazy load, and lookups |

Loading is lazy so a broken document fails at the first consumer with the file path in the message, rather than during boot where the cause is harder to attribute. Validation rejects unknown keys rather than ignoring them, because a typo that silently keeps an inherited model is the exact failure this package exists to prevent.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [`cluster-router`](../router/README.md) — the consumer that binds the Lead to these routes.
- [`cluster-orchestrator`](../orchestrator/README.md) — the consumer that reads the review policy.
- [`llm-pi-ai`](../../llm/llm-pi-ai/README.md) — declares OpenAI-compatible and Anthropic-compatible provider routes.

-----

<a id="model-experience"></a>
## Model Experience

### No direct model context

#### What the model sees

This package contributes no prompt section, tool schema, or message text of its own. Its briefing rendering is delivered by the patched `spawn_teammate`, which prepends the brief between the teammate's identity reminder and the Lead's task.

#### Token effect

Zero direct token effect for routes. A declared briefing adds one block to each spawned teammate's first request and follows ordinary history afterwards.

#### KV Cache effect

Independent for routes: the package writes no request content. A briefing is appended after the teammate identity prefix, so it extends the teammate's first request rather than replacing the reusable prefix.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **No sampling parameters** — `AgentOptions` carries only `provider`, `model`, `reasoningEffort`, and `maxTokens`, so `temperature` and similar fields cannot be bound per member and must be set on the adapter route instead.
- **No hot reload** — a document edit is picked up only by restarting the profile; there is no file watcher or config-only HMR trigger.
- **No fallback execution** — `fallbacksFor()` reports declared fallbacks but nothing consumes them yet; routing a failed request to the next route is deferred to the telemetry layer.
- **Briefing applies at spawn only** — an already-running teammate keeps the brief it started with.
- **Budget reporting only** — `budgetFor()` answers what a member declared; the cluster orchestrator turns that into a notice, and nothing stops a member that overspends it.
- **One cluster per profile** — callers pass a cluster name explicitly, so a deployment running several clusters concurrently must configure one `defaultCluster` per profile.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Route lookup is deliberately synchronous and cached. The consumer reads it inside an `agent/created` listener, which must stay free of awaits that reorder publication.

</details>
