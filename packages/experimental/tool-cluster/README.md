---
description: "The four protocols a Cluster Lead can call: one durable broadcast, one roundtable with a synthesis, one motion with a tally, and one debate with a verdict."
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-tool-cluster

English | [中文](README.zh.md)

## Summary

This package gives a Team Lead four ways to put one question to the whole team at once: a durable broadcast, a roundtable whose synthesis is collected by one member, a motion counted by one member, and a debate weighed by a judge. Each is a fan-out the Lead could not express with `team_task_create` alone, because the board closes it: every participant owns a row, and the collector task blocks on exactly those rows, so the ordinary release path wakes the collector and carries the count or the verdict it reads. The tools belong to the Lead only, and a composition that mounts no tool runtime simply gets none.

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

Mount this package beside `@deepseek-ai/dsh-experimental-agent-team` and a tool runtime. Registration is per Team Lead and idempotent: a Lead receives the four tools when it appears, and they are disposed with it. Nothing else is required, and there is no configuration: the protocols are the same shape whatever the cluster declares.

The cluster profile layer mounts it for you:

```yaml
- id: tool-cluster
  name: '@deepseek-ai/dsh-experimental-tool-cluster'
```

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Working context for maintainers — click to expand</summary>

| File | Role |
|---|---|
| [`src/broadcast.ts`](src/broadcast.ts) | Broadcast target selection, the refusals it reports, and the wording of a skipped target |
| [`src/motion.ts`](src/motion.ts) | Motion planning, ballot counting, and the notice that carries a count |
| [`src/roundtable.ts`](src/roundtable.ts) | Roundtable planning and every text one round emits |
| [`src/debate.ts`](src/debate.ts) | Debate planning, the round vocabulary, and the reading a verdict weighs |
| [`src/index.ts`](src/index.ts) | Plugin: the four tool definitions, Lead-only installation, and the per-target attempt |

Every rule lives in the pure modules and is covered by tests that need no live Team; the plugin only wires them to the tool runtime and the board. Fan-out is per target rather than all-or-nothing: a target the roster cannot reach is reported in the result with its reason, because a protocol that mutated the board and then threw would leave rows nobody owns.

The one shape the tools do not own is the closing of a protocol. A tally, a synthesis, and a verdict are ordinary board rows with `blockedBy` edges, and the release that opens them belongs to the orchestrator, which is why a composition needs both packages for a protocol to finish.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Agent Teams](../agent-team/README.md) — the roster, mailbox, and task board every protocol fans out through.
- [`cluster-orchestrator`](../cluster-orchestrator/README.md) — the release path that wakes a collector and carries its count.
- [`cluster-bundle`](../cluster-bundle/README.md) — the profile layer that mounts this package with the rest of the cluster.

-----

<a id="model-experience"></a>
## Model Experience

### The broadcast tool

#### What the model sees

A Lead that must tell its whole team one thing calls `broadcast_message` once instead of `send_message` per member. The tool takes the message and an optional `targets` list; omitting it addresses every current teammate. The result reports each delivery with its message id and status, and every target it refused with the reason — an unknown name, the Lead itself, or a member that failed at provisioning. The message text is the caller's own, unframed.

#### Token effect

One tool call and one short JSON result in the Lead's history, plus one durable peer message per delivered target in the recipient's history — the same per-target cost `send_message` would have had.

#### KV Cache effect

Append-only on both sides: the result and every delivered message land after the reusable request prefix, so no cached prefix is invalidated.

### The roundtable tool

#### What the model sees

`roundtable` asks one question of several teammates at once: it opens one answer task per participant, assigns each to its owner, sends each a `[ROUNDTABLE]` notice naming that task, and leaves one `Synthesis: ...` task blocked by every answer. That synthesis task declares its collector on a `cluster-owner:` line, so the release-time handoff assigns it the moment the last answer lands and wakes that member. The result reports the round's task id and every participant it refused.

#### Token effect

One tool call and one JSON result in the Lead's history, plus one task notice per participant and one assignment notice to the collector when the round closes.

#### KV Cache effect

Append-only everywhere: every notice lands after the reusable request prefix, so no cached prefix is invalidated.

### The motion tool

#### What the model sees

`motion` puts one decision to a vote: it opens one ballot task per voter, assigns each to its owner, sends each a `[MOTION]` notice naming that task, and leaves one `Tally: ...` task blocked by every ballot. Each ballot records its position as a final line of `vote: for`, `vote: against`, or `vote: abstain`; the tally task declares its counter on a `cluster-owner:` line, so the release-time handoff assigns that member when the last ballot is cast — and the same notice carries the count the board already agrees on, so the counter verifies a number instead of counting.

#### Token effect

One tool call and one JSON result in the Lead's history, one ballot notice per voter, and one assignment notice carrying the count to the counter.

#### KV Cache effect

Append-only everywhere: every notice lands after the reusable request prefix, so no cached prefix is invalidated.

### The debate tool

#### What the model sees

`debate` argues a topic over rounds: it opens one speech task per speaker for the opening round, assigns and announces each with a `[DEBATE]` notice, and opens every later round blocked by the whole round before it — which is the round control it needs, because the board opens a round only once the previous one is argued. Each speech records its argument as a final line of `statement: ...`, and the `Verdict: ...` task declares its judge on a `cluster-owner:` line, so the handoff assigns that member when the final round closes — and the same notice carries how many arguments in that round are readable, so the judge checks a number instead of counting.

#### Token effect

One tool call and one JSON result in the Lead's history, one notice per opening-round speaker, and one assignment notice carrying the reading to the judge. Each later round costs one handoff notice per speaker, because its speech is assigned at release rather than up front.

#### KV Cache effect

Append-only everywhere: every notice lands after the reusable request prefix, so no cached prefix is invalidated.

-----

<a id="known-limitations-and-deferred-work"></a>
## Known Limitations and Deferred Work

- No runtime invariant companion is published because every rule is a pure function of the board and the config, and replaying those is the check.
- **Lead-only** — a teammate has `send_message`, `team_task_*`, and its own mailbox; the four protocols exist so one member can put a single question to many, and a teammate that needs that asks the Lead.
- **No scheduling policy** — a protocol spends each participant a turn, and only the debate caps its own size (five rounds, thirty-two speeches). Turn scheduling, concurrency caps, and compaction stay outside this package.
- **A protocol costs what its fan-out costs** — every participant receives a durable notice and owns a row, so a roundtable over eight teammates is eight turns plus the synthesis; narrow the participant list rather than expecting the tool to.

-----

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The tools began inside `cluster-orchestrator` and were registered conditionally there, which kept them out of `docs/tool-catalog.md` and out of the Model Experience link checks. Splitting them out gave the catalog its row: the protocols are the model-facing half of the cluster, and the orchestrator keeps the event-driven half that closes them.

</details>
