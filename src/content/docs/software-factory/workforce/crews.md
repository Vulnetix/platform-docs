---
title: Crews
description: Named sets of agents started together. The built-in crews, crew runs over a scope of directories, the supervisor that shares workers between them, the provider pool, live controls, the crew log, and the Role Manager every worker runs under.
order: 5
sources: [belai/docs/fleet.md, belai/docs/role-manager.md, belai/cmd/belai/crewcmd.go, vdb-site/api/internal/handler/belai_crews.go]
checked: [belai@35506b9, vdb-site@284f1d6]
updated: 28 Oct 2026
---

A crew is a named set of agent profiles, each with a number of replicas, started together. A workflow's [crew step](/software-factory/workflows/nodes/crew/) can dispatch a whole crew; its members hand cards to each other on the board.

## Built-in crews

| Crew | Members |
|---|---|
| `belai:delivery` | `belai:scout` ×1, `belai:builder` ×2, `belai:reviewer` ×1 |
| `belai:security` | `belai:vuln-scout` ×1, `belai:patcher` ×2, `belai:verifier` ×1 |
| `belai:feature` | `belai:planner` ×1, `belai:builder` ×2, `belai:reviewer` ×1 |
| `belai:bug` | `belai:repro` ×1, `belai:builder` ×2, `belai:reviewer` ×1 |
| `belai:ui` | `belai:designer` ×1, `belai:builder` ×2, `belai:reviewer` ×1 |
| `belai:maintenance` | `belai:test-fixer` ×1, `belai:lint-fixer` ×1, `belai:reviewer` ×1 |

## Crew runs

`belai agent start -crew CREW` starts a **crew run**: the crew once, over a scope of directories, not once per repository.

```sh
belai agent start -crew belai:delivery -dir ~/src/api:3 -dir ~/src/web -dir ~/src/docs:1 \
  -pool anthropic/claude-sonnet-5-5 -pool openai/gpt-5 -switch-after 3 -final-retry 900
```

- **The scope.** Each `-dir PATH[:WEIGHT]` adds a directory. The default is the repository you are in. There is no limit on directories.
- **The supervisor** counts each member's claimable cards in each directory every five seconds, and shares the member's replicas between directories in proportion to weight times work. Missing workers are started and surplus ones drained, idle ones first, so the crew follows the work without thrashing.
- **A worker stays in one repository at a time.** Each directory keeps its own settings, trust and tools. The supervisor moves a worker by draining it in one directory and starting one in another.
- **One run per crew.** Starting a crew that is running adds the new directories to its scope. With nothing new it is refused, unless `-fill`.
- **It outlives its supervisor.** If the supervisor dies, the run is orphaned, not ended: its workers keep their cards and a new supervisor is started by the first thing to notice. After 5 restarts in 10 minutes the run fails.
- A run ends when stopped, or after a quiet window with nothing to claim anywhere, unless it stays (`-stay`, bounded by `-stay-idle-max`).

### The provider pool

`-pool` is a ring of providers and models. Workers start on the first. After `-switch-after` outages in a row (3 by default) a worker moves to the next target this host can run. When the whole pool has failed, the crew is `sleeping` for `-final-retry` seconds (900 by default), then in its `final_retry` phase makes one last try.

### Live controls

A running worker reads a control file before every claim and round: its model, its effort, and whether to drain. `belai agent control`, the supervisor, the pool and the TUI's control room write it. Changes apply at the next round, never with a restart. A model a person picked is pinned until `-auto` hands it back.

The crew controls the factory and the console can send are: `replicas`, `max_workers`, `pool`, `switch_after`, `final_retry`, `scope_add`, `scope_remove`, `scope_pause`, `scope_weight`, `worker_target`, `worker_effort`, `worker_drain`, `worker_stop`, `worker_auto` and `stop`.

## Crew run states

A crew run is `running`, `stopping`, `stopped`, `orphaned` (its supervisor died and a new one is being started) or `failed`. Every edit to a run records who made it: the `launch`, a `human`, the `supervisor`, the `harness`, the `web`, a `worker`, or `rc`.

## The control room

`/crew` in the TUI opens the crew control room: a run's workers, cards, providers, scope and faults, all editable while it runs.

## The crew log

Every crew run keeps a log of faults and an audit trail.

```sh
belai crew log -crew belai:delivery     # the newest run of this crew
belai crew log -run RUN -follow         # keep printing new lines
belai crew log -run RUN -audit -verify  # audit entries, with the hash chain checked
```

| Flag | Meaning |
|---|---|
| `-run`, `-crew` | Which run: by id, or the newest of a crew |
| `-worker` | Only this worker's lines |
| `-class` | Only faults of this class |
| `-audit` | Audit entries instead of faults |
| `-verify` | Check the audit hash chain |
| `-follow` | Keep printing |
| `-limit` | The newest N lines |
| `-json` | JSON lines |

## The Role Manager

Every worker runs under Belai's Role Manager, its central safety boundary. It decides what untrusted content may be trusted, which tool calls may run, what may enter the system prompt, and which mode a prompt without one should run in. It classifies untrusted text (tool results from the shell and the web, files read) before the model acts on it, keeps untrusted text out of the system and tool blocks, and checks that the model's tool calls match the tools it was offered. See [Guardrails](/software-factory/belai/guardrails/).

## Related

- [Agents](/software-factory/workforce/agents/)
- [Crew node](/software-factory/workflows/nodes/crew/)
- [Handoffs](/software-factory/runs/handoffs/)
