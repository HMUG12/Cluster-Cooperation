---
description: "Add the published experimental cluster panel to a Web profile after the Host cluster layer."
kind: "package-bundle"
---

# @deepseek-ai/dsh-experimental-cluster-web-profile

English | [中文](README.zh.md)

## Summary

`dsh-experimental-cluster-web-profile` is the published experimental Web layer for the [cluster panel](../cluster-web/README.md). Add it after `@deepseek-ai/dsh-web-app` and [`@deepseek-ai/dsh-experimental-cluster-bundle`](../cluster-bundle/README.md) to read the cluster roster, board, and folded spend in the browser, and to configure the cluster document there. Removing either experimental layer leaves the stable base and Web composition unchanged. The dsh installation ships it as an optional bundle that no shipped Web profile enables; switch it on from the Web sidebar's Plugins page after the Host layer.

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

The first command supplies Agent Teams, the declarative configuration, the router, the orchestrator, the protocol tools, the overview service, and — because `cluster-web` is a dual-face package — the browser entry that registers the panel. This second layer declares no row of its own: registering the same service twice is what the loader refuses at boot, so what it contributes is the ordered switch itself. Removing the package with `dsh plugin --profile web remove @deepseek-ai/dsh-experimental-cluster-web-profile` takes it back out of the profile's ordered bundle list.

### What you get

The conversation header gains a cluster action that reads the roster, the board with its protocol counts, and the folded spend, and a settings section that shows the cluster document, sends back edited text, and reports the schema owner's reason when a field is refused. [`@deepseek-ai/dsh-experimental-cluster-web`](../cluster-web/README.md) owns both halves: the Host service that derives the view and the browser entry that mounts the generated Client Remote namespace and registers the action.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The package's runtime content is [`cordis.patch.yml`](cordis.patch.yml). Applied after `dsh-web-app` and the Host cluster layer, it deliberately declares no row: the `ui-cluster` row that mounts `@deepseek-ai/dsh-experimental-cluster-web` belongs to the Host cluster bundle, and that one row activates the package's browser entry too. This static bundle holds no mutable state and installs no runtime invariant.

| File | Role |
|---|---|
| [`cordis.patch.yml`](cordis.patch.yml) | Ordered Web patch that deliberately declares no entry |
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
- **The layer is a switch, not a mount** — it declares no row of its own, so removing it from the profile's bundle list is what turns the panel off; a reader expecting this file to name the panel will not find it there.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The layer exists because the shipped optional-bundle flow switches a Web presentation on and off as its own named bundle, so the rowless patch is the content rather than a placeholder. The action reads on demand rather than on mount, because most sessions never open it.
</details>
