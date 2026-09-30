---
description: "The cluster overview a Web panel reads: roster, board, protocol counts, and folded spend, derived on the host."
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-cluster-web

English | [中文](README.zh.md)

## Summary

This package crosses the cluster to the browser in one shape: a single generated Remote method that returns the roster, the board, the counts over it, and the folded spend — already ordered and already counted. The derivation lives here rather than in the panel because a client bundle may not import another plugin's values, so anything the panel would have to work out for itself is a thing it cannot work out at all. The declared cluster name and the spend are read structurally, exactly as the `/cluster` command reads them, so this service loads whether or not those packages are mounted.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
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

Choose it when a Web page should show what the cluster is doing without giving the page any authority: every method on the service is a read, and the only credential it accepts is a live Team member. A headless deployment has no browser to serve and does not need it.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Working context for maintainers — click to expand</summary>

| File | Role |
|---|---|
| [`src/overview.ts`](src/overview.ts) | The view's shape, the protocol classification, and the ordering |
| [`src/index.ts`](src/index.ts) | The service: structural reads, and the one Remote method |

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

<a id="known-limitations-and-deferred-work"></a>
## Known Limitations and Deferred Work

- No runtime invariant companion is published because the view is a pure function of three inputs, and those inputs are already asserted by the packages that own them.
- **Nothing renders this yet** — the payload crosses to the browser as a generated Remote method, and the Web panel that consumes it is the next step. Until then the service is mounted and readable, and no page calls it.
- **The declarations are summarised, not listed** — the view reports the declared cluster name and each member's routed model, but not the full `cluster.yml`: a route list per member is a panel of its own, and the document already has a reader.
- **Spend covers the members that have spent** — the orchestrator's fold has no row before a member's first model call, so the view lists what it folded rather than the whole roster.
- **The protocol classification is not in the payload yet** — the board arrives as the Team reports it, so nothing tells a ballot from an ordinary row. Classifying it here would mean importing the protocol subjects' prefixes from `tool-cluster`, and a source import of a newly added package's export does not resolve in this workspace's test runner while the same import from an existing package does; that resolution question is the next slice's first task, not something to duplicate the prefixes around.

-----

<a id="dev-note"></a>
## Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The plan called for extending the upstream Team panel; this package is a sibling instead, because the cluster's own two surfaces are exactly the two the Team panel has no source for — the declarations and the spend — and a new read-only service can be added without changing an upstream contract. The panel itself, when it lands, is a browser half in this same package.

</details>
