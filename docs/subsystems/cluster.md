# Cluster Cooperation

English | [中文](cluster.zh.md)

The Cluster Cooperation packages give a team of agents declared routes, declared accountability, and a declared budget. [Agent Teams](agent-team.md) owns the roster, the mailbox, and the shared task board; this page records what the cluster layer adds on top: one `cluster.yml` document, the `ctx.clusterConfig` service that answers it, the per-member model binding applied when a teammate is created, and the board policy applied to completions. [architecture.md](../architecture.md) places the layer in the wider plugin tree.

## The document

A document declares a format version, reusable route aliases under `models`, and one or more named clusters. A cluster names a topology, optional concurrency and orchestration blocks, a Lead, and its members. A member declares the route (or `models` alias) that binds it, ordered fallbacks, the accountability a spawned teammate starts with (`description`, `mission`, `deliverables`, `definitionOfDone`, `qualityBar`), advisory `writeScopes`, and a soft `tokenBudget`.

The reader is strict on purpose. An unknown key, an unknown alias, a wrong type, a reviewer that is not a declared member, a duplicate member name, or a budget or concurrency limit that is not a positive integer rejects the whole document at load, listing every offending path at once, because a typo that silently keeps an inherited model is the failure this layer exists to prevent.

## What the service answers

`ctx.clusterConfig` loads the document lazily at its first consumer, so a broken file fails where it is used rather than during boot. `routeFor()` answers the provider and model for one member, `fallbacksFor()` its ordered alternatives, `briefingFor()` the accountability text a spawned teammate starts with, `reviewFor()` the review policy, and `budgetFor()` the soft token budget a member declared. A member that declares no route keeps the Lead's inherited one, and a member that declares no accountability renders no briefing.

## How the parts wire together

[`cluster-config`](../../packages/cluster/config/README.md) owns the document and the service. [`cluster-router`](../../packages/experimental/cluster-router/README.md) binds each teammate to its declared route as its Agent is created, which is the one seam that makes per-role models work at all: Agent Teams threads no model through `spawn_teammate`. [`cluster-orchestrator`](../../packages/experimental/cluster-orchestrator/README.md) reads the same declaration to move the shared task board, waking released owners, gating downstream work on the review verdict, counting rejections against the retry budget, and watching member spend. [`cluster-bundle`](../../packages/experimental/cluster-bundle/README.md) is the profile layer that mounts the whole set.

<!-- BEGIN GENERATED cordis-surface (gen-cordis-catalog.ts) — do not edit between markers -->

<a id="cordis-surface"></a>

## Cordis API

Generated from source by `scripts/gen-cordis-catalog.ts` (verified fresh by `pnpm run verify-cordis-catalog` in doc-sync; regenerate with `pnpm run gen-cordis-catalog`) — the language sides differ only in locale-specific paired document paths. Signature blocks use a `ts cordis-catalog` fence and keep the original source JSDoc; dispatch modes are defined in the [primer](../cordis-primer.md#dispatch-modes), and the framework-inherited `ctx` API lives in [cordis-api/inherited.md](../cordis-api/inherited.md).

<a id="ctxclusterconfig--clusterconfig"></a>

### `ctx.clusterConfig` — `ClusterConfig`

Owns one cluster document and answers per-member model routes.

The document is read lazily on first access and cached for the service lifetime, so a misconfiguration surfaces as a loud failure at the first consumer instead of at boot time.

```ts cordis-catalog
/**
 * Cluster used when a caller supplies no name.
 * @returns the configured cluster.
 * @throws Error when no cluster can be selected unambiguously.
 */
defaultClusterName(): string

/**
 * Read one declared cluster.
 * @param name - cluster name, defaulting to {@link defaultClusterName}.
 * @returns the complete cluster declaration.
 */
cluster(name: string = this.defaultClusterName()): ClusterSpec

/**
 * Read one member declaration.
 * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
 * @param memberName - model-facing member name, or `lead`.
 * @returns the member row, or undefined when it is not declared.
 */
member(clusterName: string, memberName: string): MemberSpec | undefined

/**
 * Resolve the primary route bound to one cluster member.
 * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
 * @param memberName - model-facing member name, or `lead` for the coordinator.
 * @returns the configured selection, or undefined when the member declares no route.
 */
routeFor(clusterName: string, memberName: string): ModelSelection | undefined

/**
 * Ordered fallback routes for one cluster member, excluding its primary route.
 * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
 * @param memberName - model-facing member name, or `lead`.
 * @returns configured fallbacks, empty when none are declared.
 */
fallbacksFor(clusterName: string, memberName: string): ModelSelection[]

/**
 * Render the accountability a spawned member starts with.
 * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
 * @param memberName - model-facing member name. The Lead declares no briefing.
 * @returns the briefing text, or undefined when the member declares none.
 */
briefingFor(clusterName: string, memberName: string): string | undefined

/**
 * Read the soft token budget declared for one member.
 * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
 * @param memberName - model-facing member name. A Lead declares no budget.
 * @returns the declared budget, or undefined when the member declares none.
 */
budgetFor(clusterName: string, memberName: string): number | undefined

/**
 * Validate a document and write it, so a user can change the cluster at all.
 *
 * This is the only path that creates the file, so it goes through the same
 * reader every load uses: a document with a rejected field never reaches the
 * disk, and the caller learns which fields failed. The caller's own text is
 * written rather than the expanded reading, so a named route stays named.
 * @param document - candidate document, validated before anything is written.
 * @returns the validated document.
 * @throws ClusterConfigError when a field is rejected.
 */
save(document: unknown): ClusterDocument

/**
 * Read the document a settings surface edits.
 *
 * An absent document reads as the empty one rather than throwing, because a
 * panel asking what to edit is exactly the case where no file exists yet;
 * {@link configured} tells the two apart.
 * @returns the loaded document, empty when none has been written.
 */
currentDocument(): ClusterDocument

/**
 * Read the document as the text a surface edits.
 *
 * A configured cluster reads as the file's own text rather than as a
 * re-serialisation of the reading, because the reading cannot be written back:
 * a cluster's name is carried by its key rather than spelled out, so a surface
 * that showed the reading would hand the user text this service rejects. An
 * unconfigured cluster reads as the starter, so a first-time user is handed
 * something to edit rather than an empty box.
 * @returns the file's text, or the starter's when no document exists.
 */
editableText(): string

/**
 * Render the starter as the text it is written as.
 * @returns YAML text naming the configured default cluster.
 */
starterText(): string

/**
 * Validate text and write it, so a surface can edit the document as text.
 *
 * The text is parsed here rather than in the client because this service owns
 * both the only parser and the only schema: a caller that parsed on its own
 * would either accept what this repository rejects or reject what it accepts,
 * and the two failures would look the same to a user.
 *
 * The file is rewritten in this service's own formatting, so comments and hand
 * layout do not survive a save; what does survive is every declared field, and
 * saving an unchanged document changes nothing at all.
 * @param text - candidate document text, in YAML or JSON.
 * @returns the validated document.
 * @throws ClusterConfigError when a field is rejected.
 * @throws Error when the text is not parseable at all.
 */
saveText(text: string): ClusterDocument

/**
 * Build the document a first-time user starts from.
 *
 * It carries structure only: the operator's own cluster name, a star topology,
 * and one worker. No route and no prose is invented here, because a model id is
 * an environment fact this repository does not know and a description is copy
 * that would have to be translated; both are the operator's to supply.
 * @returns a valid document naming the configured default cluster.
 */
starter(): ClusterDocument

/**
 * Read the review policy that governs completed work.
 * @param clusterName - owning cluster, defaulting to {@link defaultClusterName}.
 * @returns the enabled review policy, or undefined when review is off.
 */
reviewFor(clusterName: string = this.defaultClusterName()): ReviewSpec | undefined
```

Types: [ModelSelection](core.md)

Source: [`packages/cluster/config/src/index.ts`](../../packages/cluster/config/src/index.ts)
<!-- END GENERATED cordis-surface -->

## Known limits

The layer declares more than it enforces. `topology` and `maxConcurrency` are parsed and range-checked yet inert, because the Team mailbox alone decides who may talk to whom and nothing caps how many members run at once. An over-budget member is asked to wind down rather than stopped. A notice that concerns the Lead cannot be addressed to the Lead from this layer, since the Team mailbox refuses a message a member sends to itself, so the member carries the report instead. Each package README records its own limits in full.
