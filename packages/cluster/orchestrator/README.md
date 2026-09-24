---
description: "Keeps the shared Team task board moving: wake released owners, and review completed work against a retry budget."
kind: "package-reference"
---

# @deepseek-ai/dsh-cluster-orchestrator

English | [中文](README.zh.md)

## Summary

`dsh-cluster-orchestrator` applies the board policy its cluster declares. The Agent Teams domain records `blockedBy` edges and reports `ready`, but it never notifies anybody, and a completed task says nothing about whether the work was good. This plugin closes both gaps from the same durable `team/task` commit: a completion wakes the owners it released, and it opens the review the cluster declared, counting rejections until the retry budget is spent.

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

Mount it alongside the Team domain and `@deepseek-ai/dsh-cluster-config`:

```yaml
- id: cluster-orchestrator
  name: '@deepseek-ai/dsh-cluster-orchestrator'
  config:
    dependencyAutoUnlock: true
    reviewLoop: true
```

| Field | Default | Meaning |
|---|---|---|
| `dependencyAutoUnlock` | `true` | Whether a completed blocker wakes the released task's owner. |
| `reviewLoop` | `true` | Whether a completed task opens the review its cluster declares. |

### What you get

When a shared task reaches `completed`, every `pending` task that names it as a blocker, has an owner, and has no remaining open blocker receives one durable `[TASK READY]` message. The same completion also opens `Review: <subject>` for the reviewer declared in `cluster.yml`, assigns it to that member, and delivers `[REVIEW]`.

A task that comes back from a rejection is counted through the reviews opened for it: below `maxRetries` the owner receives `[RETRY k/max]`, and at the budget the Lead receives `[ESCALATE]` instead of another round.

### What success and failure look like

A released owner starts working without the Lead polling the board. A completion that releases nobody sends nothing, and replaying the same completion is a no-op. A delivery failure is logged and never fails the turn that completed the task.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

| File | Role |
|---|---|
| [`src/ready.ts`](src/ready.ts) | Readiness arithmetic and the wake-up text |
| [`src/review.ts`](src/review.ts) | Review request, rejection counting, and both verdict texts |
| [`src/index.ts`](src/index.ts) | Plugin: event subscription, roster resolution, queued delivery |

The plugin subscribes to `session/event` and filters the durable `team/task` commit rather than polling, so every wake-up rides the same fact that changed the board. All decisions live in the two pure modules, which is why both rules are covered by tests that need no live Team. Deliveries are serialized through one promise chain so a slow message cannot let a later completion overtake it. Replay suppression keys on `taskId::revision`: a revision identifies one board state, so a replayed event is ignored while any genuine mutation gets through.

The refusal conditions matter as much as the rules. A review is never opened for a review, for the reviewer's own work, or for a completion that already has one — the last guard is what makes replay safe.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Agent Teams](../../experimental/agent-team/README.md) — the roster, mailbox, and task board this plugin reads.
- [`cluster-config`](../config/README.md) — declares the reviewer and retry budget.
- [`cluster-bundle`](../bundle/README.md) — the profile layer that mounts all three.

-----

<a id="model-experience"></a>
## Model Experience

### Board notices

#### What the model sees

One durable user-role message per board decision, delivered to the member that must act. Every text names the task id, the action, and the budget when one applies; the Lead receives no notice for its own tasks, and a member with nothing to act on receives nothing. The fixed texts are owned by [`src/ready.ts`](src/ready.ts) and [`src/review.ts`](src/review.ts):

##### Verbatim text for this field, when needed

```markdown
[TASK READY] task-2 "wire the endpoint" is unblocked because task-1 completed. Call team_task_get task-2 for the current revision, then team_task_update task-2 with action "claim" using that revision, and report the outcome to the Lead.
```

#### Token effect

Conditional and driven by the board: zero tokens until a completion, a release, or a rejection, then one short message per affected member, retained in the recipient's history like any other peer message.

#### KV Cache effect

Append-only for the recipient: each notice is appended after the reusable request prefix. It neither replaces earlier tokens nor invalidates a cached prefix.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Wake-up only** — a notice is a message, not a claim. The owner still has to call `team_task_get` and `team_task_update`, so a member that ignores its mailbox stalls the edge.
- **Review verdicts ride the board** — approval is completing the review task and rejection is reopening the reviewed one. A reviewer that does neither leaves the review open forever.
- **Completed-only trigger** — reopening a completed task does not re-notify, and a new blocker added after a completion is not replayed.
- **No budget or round control** — turn scheduling, token budgets, and compaction policy are not part of this package.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Keep the pure modules pure: they are the only reason both rules have coverage without a live Team.

</details>
