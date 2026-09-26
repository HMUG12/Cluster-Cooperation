---
description: "The human-facing /cluster slash command for users and maintainers watching a cluster's roster, shared board, and dependency edges without spending a model turn."
kind: "package-reference"
---

# @deepseek-ai/dsh-command-cluster

English | [中文](README.zh.md)

## Summary

`dsh-command-cluster` gives users the `/cluster` command to read a live Agent Team from the command plane: the roster with each member's runtime status, the shared task board with readiness and blockers, and the dependency edges between tasks. Commands and their direct output stay in the UI and never enter a model request, and the command writes nothing back to the Team. Use this package in interactive deployments that mount a command adapter; headless and automation apps without one do not need it.

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

Mount it wherever a command adapter and the Agent Team are both present. Every sub-command runs against the Team the invoking agent belongs to, so the Lead and a teammate read the same board.

### Command reference

| Input | Result |
|---|---|
| `/cluster` | Overall shape: the cluster name, roster counts by status, how many teammates are reachable, and the board by status with how many pending tasks are ready |
| `/cluster status` | The same report, named explicitly |
| `/cluster tasks` | One line per shared task: id, status, subject, owner, and its readiness with every blocker |
| `/cluster agents` | One line per member, Lead first: name, runtime status, role, model, and any diagnostics |
| `/cluster graph` | One edge per line: the task that waits, and the blockers it waits on |

### Output grammar

A sub-command outside the four above is refused with the usage line instead of being treated as free text. Every renderer keeps a fixed status order, so two runs over the same board print the same lines.

### Compose it

The command injects the commands registry and the Team service. A deployment that already runs a cluster mounts both:

```yaml
- id: commands
  name: '@deepseek-ai/dsh-commands'
- id: agent-team
  name: '@deepseek-ai/dsh-experimental-agent-team'
- id: command-cluster
  name: '@deepseek-ai/dsh-command-cluster'
```

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

| File | Responsibility |
|---|---|
| [`src/report.ts`](src/report.ts) | Sub-command parsing and every rendered line |
| [`src/index.ts`](src/index.ts) | Plugin: reads the Team service and dispatches one sub-command |

The command reads the two lists the Team service already maintains — the roster and the board — and derives everything it prints, so it stores no second copy of any fact and can never disagree with the board it inspects. Parsing and rendering are pure functions, which is why every line is covered by tests that need no live Team.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

The reports name owners, blockers, and readiness the same way the orchestration package's notices do, so a reader can follow one run from the board into the messages it sends. The cluster bundle mounts the cluster layer that headless runs need, and deliberately does not include this command.

-----

<a id="model-experience"></a>
## Model Experience

None, as the command answers in the command plane: it contributes no tool, no system-prompt section, and no session content, so mounting it leaves every request prefix unchanged.

#### KV Cache effect

Nothing is appended to any request, so no cached prefix can be invalidated.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **Read-only by construction** — the command never claims, reassigns, or completes anything, so it cannot rescue a stalled run; the Lead's tools remain the only writers.
- **No cost report yet** — the per-member spend the orchestrator folds from durable usage is not exposed as a service, so `/cluster cost` waits for that surface.
- **Outside the shipped bundle** — an interactive deployment mounts this command itself, because a boot without a command adapter would leave it pending.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Development notes — click to expand</summary>

The command exists because a cluster's state had no human-readable surface at all: the roster and the board were visible only through the Lead's tool results, so watching a run meant reading a model's transcript. Everything here is derived, which is why the next step is the spend surface the orchestrator already computes, and why the dependency report can grow a real tree layout instead of one edge per line.

</details>
