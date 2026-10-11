---
description: "The cluster overview a Web panel reads: roster, board, protocol counts, and folded spend, derived on the host."
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-cluster-web

English | [中文](README.zh.md)

## Summary

This package crosses the cluster to the browser as generated Remote methods: the roster, the board, its counts, the folded spend, the document a settings surface edits and saves, and the members that surface brings up. The derivation lives here rather than in the panel because a client bundle may not import another plugin's values, so anything the panel would work out for itself is something it cannot work out at all. The declared name, the spend, and the document are read structurally, so this service loads whether or not those packages are mounted.

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

Mount it wherever the Agent Team is mounted. It registers one service, `ctx.clusterWeb`, and exposes it to the browser as `ctx.remote.clusterWeb`; the cluster profile layer already mounts it:

```yaml
- id: cluster-web
  name: '@deepseek-ai/dsh-experimental-cluster-web'
```

### When to choose it

Choose it when a Web page should show what the cluster is doing, and let a person configure it, without the page holding authority of its own: every method takes a live Team member as its credential, and the write is parsed and validated by the service that owns the schema, so a rejected field never reaches the disk. The one action that reaches the Team is bringing the declared members up, and the Team service accepts that from the Lead's own session alone. A headless deployment has no browser to serve and does not need it.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Working context for maintainers — click to expand</summary>

| File | Role |
|---|---|
| [`src/overview.ts`](src/overview.ts) | The view's shape, the protocol classification, and the ordering |
| [`src/client/locales.ts`](src/client/locales.ts) | The panel's dictionaries: Chinese is the key source, English is checked against it |
| [`src/client/panel.ts`](src/client/panel.ts) | What the panel shows, as data: grouping, kind labels, rows, and counts |
| [`src/client/ClusterPanel.tsx`](src/client/ClusterPanel.tsx) | The conversation-header action: reads the view on demand, lays out the derivation, edits the document, and brings declared members up |
| [`src/client/mount.ts`](src/client/mount.ts) | Registers the dictionaries and the header action, and mounts the Remote namespace |
| [`src/index.ts`](src/index.ts) | The service: structural reads, the overview, the document read and write, and the member action |

Every rule is a pure function of the roster, the board, and the spend, which is why the tests need no live Team. The ordering is fixed rather than incidental: the Lead leads the roster, members break ties by name, and tasks sort by identity, so two reads of the same board produce the same view — which is what a person comparing two views, and a test, both need.

Spend is optional in the payload: a composition that folds no usage simply reports none, and the panel shows an empty list instead of a zero it would have to invent. The declared cluster name is optional in the same way, and absent when no composition declares one.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Agent Teams](../agent-team/README.md) — the roster and board this view is derived from.
- [`cluster-orchestrator`](../cluster-orchestrator/README.md) — publishes the folded spend this view reports.
- [`tool-cluster`](../tool-cluster/README.md) — owns the subject prefixes the classification reads.

-----

<a id="model-experience"></a>
## Model Experience

None, as the view reads services the cluster already publishes and adds no content a model sees.

#### KV Cache effect

This package adds no model request content; the cluster tools own prompt, schema, and cache effects.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- No runtime invariant companion is published because the view is a pure function of three inputs, and those inputs are already asserted by the packages that own them.
- **A web session needs the cluster profile, not a separate web layer** — the Host service and the browser entry are one row in `cluster-bundle`, so applying that profile to a web session is what makes the header action appear. [`cluster-web-profile`](../cluster-web-profile/README.md) is deliberately empty: inserting this package again would register `clusterWeb` twice, which the loader refuses at boot.
- **The view summarises the declarations; the document is read on demand** — the overview reports the declared cluster name and each member's routed model, while the full `cluster.yml` is fetched only when the settings section is opened, so a reader who only wants the roster never pulls a document.
- **A member brought up from the panel starts a turn** — the Team service creates a teammate by running its first turn, so the action needs a usable route and credential: without one the member is still created, its first turn fails, and the panel reports that member as not brought up with the host's own reason.
- **Spend covers the members that have spent** — the orchestrator's fold has no row before a member's first model call, so the view lists what it folded rather than the whole roster.
- **The action reads the invoking session's cluster** — a subagent session is not resolved to its Lead, so a teammate's own conversation reads the cluster its own identity belongs to rather than the Lead's.
- **The protocol vocabulary is read across the service boundary, not imported** — the classifier lives with the prefixes it reads inside `tool-cluster` and is published as `ctx.clusterProtocols`, because a value import of another workspace package does not resolve in this repository's test resolution while a structural read does. A composition that publishes no vocabulary gets rows with no kind at all, rather than a guess.

-----

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The plan called for extending the upstream Team panel; this package is a sibling instead, because the cluster's own two surfaces are exactly the two the Team panel has no source for — the declarations and the spend — and a new service can be added without changing an upstream contract. The panel is the browser half in this same package: the header action renders the view, and a settings section reads the document, sends back what the user typed, and reports the schema owner's reason when a field is refused.

</details>
