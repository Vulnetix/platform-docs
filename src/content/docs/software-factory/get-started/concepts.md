---
title: Concepts
description: The model behind Software Factory in one page. It covers scope and autonomy, workflows and runs, the four kinds of step, hosts and crews, and how people stay in the loop.
order: 2
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-engine.md, vdb-site/api/internal/handler/factory_core_common.go]
checked: [vdb-site@284f1d6]
updated: 28 Oct 2026
---

This page names the parts of the factory and how they connect. Each section links to the page that covers its part in full.

## Scope: what the factory may touch

The factory acts only inside **managed orgs**: GitHub App installations that an owner or admin has switched on. A repository inside a managed org can have its own settings row, with an autonomy level, a board mode and a monthly token cap. A repository with no row runs at the tenant's `autonomy.default`. See [Managed orgs and repositories](/software-factory/control/managed-scope/).

## Autonomy: how far it may go

Autonomy is a ladder of four levels:

| Level | The factory may |
|---|---|
| `observe` | Read and record. It writes nothing to GitHub. |
| `suggest` | Comment and post reviews. |
| `draft_pr` | Open draft pull requests. |
| `auto_merge_low_risk` | Approve a pull request once it is ready. A person still merges. |

`autonomy.max` caps every repository, and each workflow default states the level it needs. See [Autonomy levels](/software-factory/control/autonomy/).

## Workflows and runs

A **workflow** is a graph you draw in the builder or start from a [template](/software-factory/workflows/templates/). It has nodes, edges between them, limits (tokens, concurrency, GitHub calls) and a scope (the repositories it applies to). You edit a draft and publish a version. Publishing runs the full validator, and only a published version runs.

A **run** is one execution of a published version. It is made of **steps**, one for each node it reaches. Runs and steps have statuses you can filter on: a run is `queued`, `running`, `waiting_approval`, `paused`, `held`, `succeeded`, `failed` or `cancelled`. See [Runs and steps](/software-factory/runs/runs-and-steps/).

## The kinds of step

| Node | Decides with | Typical use |
|---|---|---|
| [Trigger](/software-factory/workflows/nodes/trigger/) | The event it matches | Starts the run. |
| [Scan](/software-factory/workflows/nodes/scan/) | Vulnetix scanners | Find vulnerable packages, secrets, malware. |
| [Decision](/software-factory/workflows/nodes/decision/) | A System One classifier with a confidence threshold | Triage: fix now, schedule, ignore. |
| [Gate](/software-factory/workflows/nodes/gate/) | Deterministic checks, with no model | Tests pass, release jail clean, quality gate. |
| [Crew](/software-factory/workflows/nodes/crew/) | Agents on a host | Write the fix, the test, the review. |
| [Human](/software-factory/workflows/nodes/human/) | A person | Approve a plan, a merge-ready change, a budget increase. |
| [Output](/software-factory/workflows/nodes/output/) | The result of the run | Draft PR, review, comment, VEX, TEA release. |
| [State](/software-factory/workflows/nodes/state/) | Values carried between steps | Pass a finding or a branch name along. |

> [!WHY] Why models only decide at decision nodes
> A decision node can only choose an edge you drew, and a gate never asks a model at all. Every path a run can take is visible in the graph and can be tested with a dry run before you publish.

## Hosts, crews and agents

An **agent** is a Belai profile: a model, a system prompt, tools and limits. A **crew** is a set of agents dispatched together, up to 8 replicas, to one **host** for one step. A host is a machine running Belai: a [Pix Sandbox](/software-factory/workforce/pix-sandboxes/) that Vulnetix runs, or your own machine connected with `belai rc`. The factory picks a host for each crew step from its `runOn` rule. If no host can take it, the step waits and the card says why. See [Hosts and placement](/software-factory/workforce/hosts-and-placement/).

## The board

Work items are **cards** on a kanban [board](/software-factory/workforce/board/). A card is the same record as its GitHub issue when mirroring is on. Agents claim cards, move them between lists, and leave notes. Cards that need a person carry a `checkpoint:` label.

## People in the loop

Anything that waits on a person is a **checkpoint**: an approval, an agent's question, a card held or blocked, a draft pull request ready for review. The [Checkpoints](/software-factory/decisions/checkpoints/) page lists them most urgent kind first and newest first within a kind, and the cockpit's Needs you panel shows the head of that queue. You can answer most of them by voice on a [Pix call](/software-factory/pix/calling-pix/).

## Limits and money

[Budgets](/software-factory/cost/budgets/) nest from the month down to a single step, and the tightest one applies. A separate [GitHub quota](/software-factory/cost/github-quota/) share keeps the factory from using up your installation's API rate limit. Buttons that call GitHub show their price before you press them.

## Evidence

The [event stream](/software-factory/evidence/event-stream/) is the live feed of everything that happens, kept 30 days. The [audit ledger](/software-factory/evidence/audit-ledger/) is a permanent hash chain of every change. [Trust](/software-factory/evidence/trust-and-slsa/) shows the SLSA level each repository reaches and exports the attestations. [Delivery](/software-factory/evidence/delivery/) measures what the factory shipped, and marks each figure as measured, derived or assumed.
