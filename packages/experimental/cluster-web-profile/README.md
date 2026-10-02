---
description: "Add the published experimental cluster panel to a Web profile after the Host cluster layer."
kind: "package-bundle"
---

# @deepseek-ai/dsh-experimental-cluster-web-profile

English | [中文](README.zh.md)

## Summary

`dsh-experimental-cluster-web-profile` is the published experimental Web layer for the [cluster panel](../cluster-web/README.md). Add it after `@deepseek-ai/dsh-web-app` and [`@deepseek-ai/dsh-experimental-cluster-bundle`](../cluster-bundle/README.md) to read the cluster roster, board, and folded spend in the browser. Removing either experimental layer leaves the stable base and Web composition unchanged. The dsh installation ships it as an optional bundle that no shipped Web profile enables; switch it on from the Web sidebar's Plugins page after the Host layer.

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

### Install into a profile

Add the Host cluster layer and this Web layer to an initialized `web` profile in this order:

```sh
dsh plugin --profile web add @deepseek-ai/dsh-experimental-cluster-bundle
dsh plugin --profile web add @deepseek-ai/dsh-experimental-cluster-web-profile
```

The first command supplies Agent Teams, the declarative configuration, the router, the orchestrator, the protocol tools, and the overview service. The second command activates this package's declared patch and its browser panel. Removing the package with `dsh plugin --profile web remove @deepseek-ai/dsh-experimental-cluster-web-profile` removes the Web layer from the profile's ordered bundle list.

### What you get

The conversation header gains a cluster action that reads the roster, the board with its protocol counts, and the folded spend. [`@deepseek-ai/dsh-experimental-cluster-web`](../cluster-web/README.md) owns both halves: the Host service that derives the view and the browser entry that mounts the generated Client Remote namespace and registers the action.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The package's runtime content is [`cordis.patch.yml`](cordis.patch.yml). Applied after `dsh-web-app` and the Host cluster layer, its single `insert` entry adds the `ui-cluster` row for `@deepseek-ai/dsh-experimental-cluster-web`, the same package the Host layer mounts. The inserted Client entry owns the generated Remote assembly and the panel; this static bundle holds no mutable state and installs no runtime invariant.

| File | Role |
|---|---|
| [`cordis.patch.yml`](cordis.patch.yml) | Ordered Web patch containing the `ui-cluster` row |
| [`src/index.ts`](src/index.ts) | Empty module entry; the patch is the runtime content |
| — | No runtime invariant companion is published; the package carries only a static profile patch. The Remote assembly and the panel own their activation requirements. |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Experimental packages](../README.md) — incubation status and publication policy.
- [Cluster Host bundle](../cluster-bundle/README.md) — the required domain, router, orchestrator, and service layer.
- [Cluster Web service and panel](../cluster-web/README.md) — the view, its derivation, and the browser action.
- [Web bundle](../../bundle/web-app/README.md) — the stable browser layer this patch extends.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through the Host-side cluster bundle selected alongside this Web layer.

#### KV Cache effect

This Web bundle adds no model request content; the Host-side cluster tools and the orchestrator own prompt, schema, and cache effects.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Ordered composition** — `dsh-base`, `dsh-web-app`, `dsh-experimental-cluster-bundle`, and this package must remain in that order.
- **Opt-in only** — the package ships with the installation switched off; no shipped Web profile enables the experimental cluster layers.
- **No component test yet** — the panel's content and dictionaries are tested without a browser, and the rendered action is not: a jsdom test for it is the remaining work.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The panel is read-only, so this layer inserts one row and nothing else. The action reads on demand rather than on mount, because most sessions never open it.
</details>
