---
description: "Wakes the owner of a shared Team task as soon as its blockers complete."
kind: "package-reference"
---

# @deepseek-ai/dsh-cluster-orchestrator

English | [中文](README.zh.md)

## Summary

`dsh-cluster-orchestrator` turns a completed blocker into a wake-up. The Agent Teams domain records `blockedBy` edges and reports `ready`, but it never notifies anybody: a released task waits until its owner happens to re-list the board. This plugin closes that gap.

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

Mount it alongside the Team domain:

```yaml
- id: cluster-orchestrator
  name: '@deepseek-ai/dsh-cluster-orchestrator'
  config:
    dependencyAutoUnlock: true
```

| Field | Default | Meaning |
|---|---|---|
| `dependencyAutoUnlock` | `true` | Whether a completed blocker wakes the released task's owner. |

### What you get

When a shared task reaches `completed`, every `pending` task that (a) names it as a blocker, (b) has an owner, and (c) has no remaining open blocker receives one durable peer message:

```
[TASK READY] task-2 "wire the endpoint" is unblocked because task-1 completed. Call team_task_get task-2 …
```

Delivery is an ordinary `send_message`, so the target is steered at its next step boundary, woken if idle, or cold-resumed if inactive.

### What success and failure look like

A released owner starts working without the Lead polling the board. A completion that releases nobody sends nothing, and replaying the same completion is a no-op. A delivery failure is logged and never fails the turn that completed the task.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

| File | Role |
|---|---|
| [`src/ready.ts`](src/ready.ts) | Pure readiness arithmetic and the model-facing notice text |
| [`src/index.ts`](src/index.ts) | Plugin: session-event subscription, roster resolution, queued delivery |

The plugin subscribes to `session/event` and filters the durable `team/task` commit rather than polling, so the wake-up rides the same fact that changed the board. All decision logic lives in `readyNotices()`, which is why the rule is covered by tests that need no live Team. Deliveries are serialized through one promise chain so a slow message cannot let a later completion overtake it, and the controller is aborted on teardown.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Agent Teams](../../experimental/agent-team/README.md) — the roster, mailbox, and task board this plugin reads.
- [`cluster-router`](../router/README.md) — binds each member to its configured model.
- [`cluster-bundle`](../bundle/README.md) — the profile layer that mounts all three.

-----

<a id="model-experience"></a>
## Model Experience

### Readiness notices

#### What the model sees

One durable user-role message per released task, delivered to its owner. The fixed text is owned by [`src/ready.ts`](src/ready.ts):

##### Verbatim text for this field, when needed

```text
[TASK READY] task-2 "wire the endpoint" is unblocked because task-1 completed. Call team_task_get task-2 for the current revision, then team_task_update task-2 with action "claim" using that revision, and report the outcome to the Lead.
```

The Lead receives no notice for its own tasks, and a member that owns no released task receives nothing.

#### Token effect

Conditional and driven by the board: zero tokens until a blocker completes, then one short message per released task, retained in the recipient's history like any other peer message.

#### KV Cache effect

Append-only for the recipient: the notice is appended after the reusable request prefix. It neither replaces earlier tokens nor invalidates a cached prefix.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Wake-up only** — the notice is a message, not a claim. The owner still has to call `team_task_get` and `team_task_update`, so a member that ignores its mailbox stalls the edge.
- **Completed-only trigger** — reopening a completed task does not re-notify, and a new blocker added after a completion is not replayed.
- **No budget or round control** — turn scheduling, token budgets, and compaction policy are not part of this package.
- **Lead resolution by session** — the plugin resolves the Lead through the session that emitted the event, so a Team mounted outside an Agent session is not served.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

`readyNotices()` must stay pure and side-effect free: it is the only reason the readiness rule has coverage without a live Team.

</details>
