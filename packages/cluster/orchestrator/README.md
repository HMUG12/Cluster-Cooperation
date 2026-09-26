---
description: "Keeps the shared Team task board moving: wake released owners, review completed work against a retry budget, and keep member spend inside what the cluster declares."
kind: "package-reference"
---

# @deepseek-ai/dsh-cluster-orchestrator

English | [中文](README.zh.md)

## Summary

`dsh-cluster-orchestrator` applies the board and budget policy its cluster declares. The Agent Teams domain records `blockedBy` edges and reports `ready`, but it never notifies anybody, a completed task says nothing about whether the work was good, and a declared `tokenBudget` is read by nothing at all. This plugin closes all three gaps from the durable log: a completion wakes the owners it released, it opens the review the cluster declared, and every settled model call folds into the spend that budget is measured against.

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
    budgetWatch: true
```

| Field | Default | Meaning |
|---|---|---|
| `dependencyAutoUnlock` | `true` | Whether a completed blocker wakes the released task's owner. |
| `reviewLoop` | `true` | Whether a completed task opens the review its cluster declares. |
| `budgetWatch` | `true` | Whether a member past its declared token budget is told to wind down. |

### What you get

When a shared task reaches `completed`, every `pending` task that names it as a blocker, has an owner, and has no remaining open blocker receives one durable `[TASK READY]` message. The same completion also opens `Review: <subject>` for the reviewer declared in `cluster.yml`, assigns it to that member, and delivers `[REVIEW]`. A completion that still owes a review wakes nobody: its dependents wait for the verdict, and completing the review is what releases them. A released task that carries no owner but declares one on its own `cluster-owner:` line is assigned to that member first, which is what lets a fan-out leave a synthesis task waiting for the last answer: the board refuses to assign a task that is still blocked, so a declaration can only be applied at release.

A task that comes back from a rejection is counted through the reviews opened for it: below `maxRetries` the owner receives `[RETRY k/max]`, and at the budget the Lead receives `[ESCALATE]` instead of another round.

Every durable model call also folds into its session's spend. A member that goes past the `tokenBudget` its cluster declares is told once to finish what is in flight and to carry the overrun to the Lead itself.

The Lead also gains three tools. `broadcast_message` sends a single durable message to every current teammate, or to the members it names, and reports each refusal with a reason instead of dropping it. `roundtable` goes further: one call asks a question of several teammates as tasks they own, and leaves one synthesis task blocked by all their answers, so the collector it names is assigned and woken the moment the last answer lands. `motion` puts one decision to a vote: a ballot task per voter, and a `Tally:` task that is assigned to a teammate when the last ballot is cast — carrying the counted result, because the board already agrees on it.

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
| [`src/spend.ts`](src/spend.ts) | Usage folding, budget verdicts, and both budget notices |
| [`src/broadcast.ts`](src/broadcast.ts) | Broadcast target selection and the wording of every refusal |
| [`src/handoff.ts`](src/handoff.ts) | Release-time assignment and the wake-up that carries it |
| [`src/roundtable.ts`](src/roundtable.ts) | Roundtable planning and every text one round emits |
| [`src/motion.ts`](src/motion.ts) | Motion planning, ballot counting, and the notice that carries a count |
| [`src/index.ts`](src/index.ts) | Plugin: event subscription, roster resolution, queued delivery |

The plugin subscribes to `session/event` and filters the durable commits rather than polling, so every notice rides the same fact that changed the board. All decisions live in the pure modules, which is why every rule is covered by tests that need no live Team. Deliveries are serialized through one promise chain so a slow message cannot let a later event overtake it.

Replay suppression differs per rule because the right key differs: the board keys on `taskId::revision`, while spend folds only events newer than the last folded `seq` for that session. Both make a replayed event a no-op without keeping state that could drift, and the refusal conditions matter as much as the rules — a review is never opened for a review, for the reviewer's own work, or for a completion that already has one.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Agent Teams](../../experimental/agent-team/README.md) — the roster, mailbox, and task board this plugin reads.
- [`cluster-config`](../config/README.md) — declares the reviewer, the retry budget, and each member's token budget.
- [`cluster-bundle`](../bundle/README.md) — the profile layer that mounts all three.

-----

<a id="model-experience"></a>
## Model Experience

### Board notices

#### What the model sees

One durable user-role message per decision, delivered to the member that must act. Every text names the task or the member, the action, and the budget when one applies; the Lead receives no notice about its own tasks, and a member with nothing to act on receives nothing. The fixed texts are owned by [`src/ready.ts`](src/ready.ts), [`src/review.ts`](src/review.ts), [`src/spend.ts`](src/spend.ts), and [`src/handoff.ts`](src/handoff.ts), which carries the variant that arrives together with an assignment:

##### Verbatim text for this field, when needed

```markdown
[TASK READY] task-2 "wire the endpoint" is unblocked because task-1 completed. Call team_task_get task-2 for the current revision, then team_task_update task-2 with action "claim" using that revision, and report the outcome to the Lead.
```

#### Token effect

Conditional and driven by the log: zero tokens until a completion, a release, a rejection, or a budget crossing, then one short message per affected member, retained in the recipient's history like any other peer message.

#### KV Cache effect

Append-only for the recipient: each notice is appended after the reusable request prefix. It neither replaces earlier tokens nor invalidates a cached prefix.

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

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Wake-up only** — a notice is a message, not a claim. The owner still has to call `team_task_get` and `team_task_update`, so a member that ignores its mailbox stalls the edge.
- **A handoff depends on its declaration surviving to release** — the `cluster-owner:` line must still be in the description when the last blocker lands, and the name must still be on the roster; otherwise the task stays unowned and nobody is woken for it.
- **Budget notice, not a hard stop** — an over-budget member is asked to wind down once per Session and nothing cancels its turn, so a member that ignores the notice keeps spending.
- **Review verdicts ride the board** — approval is completing the review task and rejection is reopening the reviewed one. A reviewer that does neither leaves the review open forever.
- **Dependents wait on the verdict** — because a reviewed completion releases nobody, a reviewer that never approves leaves everything downstream of that task blocked, and only an operator or the Lead can break the tie.
- **The Lead cannot be addressed** — the Team mailbox refuses a message a member sends to itself, and this plugin holds only the Lead's credential, so a notice that concerns the Lead names it inside the member's own notice and the member carries the report. An unowned escalation has no legal recipient and is logged for the operator instead.
- **Completed-only trigger** — reopening a completed task does not re-notify, and a new blocker added after a completion is not replayed.
- **No round control** — turn scheduling, per-round caps, and compaction policy are not part of this package.
- **The broadcast tool sits outside the tool catalog** — `docs/tool-catalog.md` is generated from `tool-*` packages and this plugin is not one, so the tool is registered and documented here instead. Promoting it to a `tool-*` package would bring it into the catalog and into the Model Experience link checks.
- **A roundtable is only as private as the board** — every answer task is readable by every member, so answers are public, and an enabled review policy reviews each answer and the synthesis like any other completion.
- **A count is only as good as the lines it reads** — a ballot completed without a readable `vote:` line is counted as unrecorded and named as a caveat in the notice, so a motion can close with a count that does not add up to its roll rather than with a verdict nobody can check.
- **A teammate that is still provisioning cannot be reached** — the mailbox and the board both resolve a target through the roster's active phase, so asking a member that is still starting up throws on delivery and on assignment alike. Every protocol reports that member as skipped with the reason instead of mutating the board and then failing halfway, which is what a fan-out issued right after `spawn_teammate` would otherwise hit.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

Keep the pure modules pure: they are the only reason every rule has coverage without a live Team.

</details>
