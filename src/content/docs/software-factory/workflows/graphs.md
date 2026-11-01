---
title: Workflow graphs, versions and publishing
nav: Workflow graphs
description: What a workflow is made of (nodes, edges, scope and limits), how drafts, versions and publishing work, what a dry run tells you, and the limits every graph must fit.
order: 1
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-engine.md, vdb-site/api/internal/handler/factory_workflow_graph.go, vdb-site/api/internal/handler/factory_workflows.go]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

A workflow is a directed graph of typed steps. It has a **scope** (the repositories it applies to), **limits** (tokens, concurrency, GitHub calls) and one or more triggers. You build it on the Workflows page (`/resolve/factory-workflows`), from scratch or from a [template](/software-factory/workflows/templates/).

## Nodes and edges

Every node has a `type`, a `title` of at most 200 characters, a `config` that depends on the type, and optionally a token `budget`, a GitHub call cap (`githubCalls.max`) and a position on the canvas.

| Type | Page |
|---|---|
| `trigger` | [Trigger node](/software-factory/workflows/nodes/trigger/) |
| `scan` | [Scan node](/software-factory/workflows/nodes/scan/) |
| `decision` | [Decision node](/software-factory/workflows/nodes/decision/) |
| `crew` | [Crew node](/software-factory/workflows/nodes/crew/) |
| `gate` | [Gate node](/software-factory/workflows/nodes/gate/) |
| `human` | [Human node](/software-factory/workflows/nodes/human/) |
| `output` | [Output node](/software-factory/workflows/nodes/output/) |
| `state` | [State node](/software-factory/workflows/nodes/state/) |

An **edge** joins two nodes. From a decision, each edge carries an `outcome`: one of the decision's outcomes, or the special paths `$below_threshold` and `$unknown`. Other edges may carry a `label` naming what passes along them.

A node with several incoming edges starts when one of them is taken and no other predecessor still has a step open.

## Scope

`scope.repos` lists repositories as `owner/name`, `owner/*` for every repository of an owner, or `*` for all of them. Starting a run by hand on a repository that is not managed, or not in the scope, is refused with `scope_unmanaged_repo`.

An **empty scope** is allowed and is often what you want:

- For an **event trigger**, the run starts on the repository of the event, as long as it is managed.
- For a **schedule or manual start**, the run fans out to the managed repositories that an online host has, up to 25.

A dry run tells you which of these applies.

## Limits

| Limit | Meaning |
|---|---|
| `runBudgetTokens` | Tokens one run may use. |
| `monthBudgetTokens` | Tokens the workflow may use in a month. |
| `concurrency` | Runs of this workflow that may be active at once, inside the tenant's `autonomy.concurrency`. |
| `githubCallsPerRun` | The GitHub calls one run may make. The steps' own caps must add up to no more, or publish fails with `github_calls_exceed_run_cap`. |
| `stopTheLineAttempts` | How many times a gate may send work back to a crew before the run stops. Default 3. |

A workflow's limits can also carry agent limits that apply to every crew step: `agentCostUsd`, `agentFinalizeAt`, `agentMaxAttempts`, `agentMaxContinuations`, `agentMaxPasses`, `agentMaxWallMinutes` and `agentMaxIterations`. See [Per-agent and per-card limits](/software-factory/cost/budgets/).

The builder shows an **estimate** of the tokens and GitHub calls per run, recomputed on every save.

## Drafts and versions

A workflow has one editable **draft** and any number of frozen **published versions**. Version numbers go up by one per draft: the header "v7 draft" means the next publish will be version 7.

| Status | Meaning |
|---|---|
| `draft` | Never published. Nothing runs. |
| `published` | A version is live. A newer draft may exist alongside it. |
| `archived` | Deleted. Its schedules are removed and its history is kept. |

- **Save** stores the draft. It checks only that each step's config is well formed. It never starts a run or creates a schedule.
- **Publish** runs every check, freezes the draft as a version and reconciles triggers: new schedules are created, removed ones deleted, changed ones recreated. Only owners and admins can publish.
- **Discard draft** goes back to the published version. With nothing published it is refused with `bad_state`.
- **Delete** archives the workflow. Only owners and admins can delete. It is refused with `bad_state` while a run is `queued`, `running`, `waiting_approval`, `paused` or `held`, unless you also cancel those runs.

Only the published version's triggers fire. A draft's triggers do nothing.

Drafts carry a revision, like the settings document. If someone saved the draft since you opened it, your save is refused with `revision_conflict`. If the draft was published or replaced since you opened it, publish is refused with `version_conflict`.

**View as YAML** shows the draft, or any published version, as YAML.

## Dry run

**Dry run** walks the draft, or a chosen version, statically with no side effects: no crew is dispatched, no model called, no output written, no GitHub call made and no schedule created. It returns:

- whether the graph is valid: a graph with errors is refused with every problem found, and warnings such as `agent_not_dispatchable` are listed while the graph stays valid
- the plan: each step it would run, with token and GitHub call estimates
- for each decision, a simulated outcome: the first outcome listed (`source: static_walk`)
- where a real run would start: the scope, any managed repository an online host has, or the repository of the event

The body accepts a repository, a trigger and inputs, but the static walk does not use them yet. **Call models** is not available yet: `callModels: true` is refused with a 400. A dry run never leaves a run behind: `?keep=1` is accepted and `runId` stays null.

## Publish checks

Publish refuses a graph that breaks a rule. Each problem names the step by its title and says what to do. The common ones:

| Code | Means |
|---|---|
| `no_trigger` | Add a trigger. A workflow needs something to start it. |
| `cycle` | A step is connected to itself, or the steps loop back on themselves. Only a gate or decision may send work back to a crew. |
| `invalid_loop` | An edge marked `loop` is not a gate or decision sending work back to a crew. |
| `outcome_without_route` | A decision outcome leads nowhere. Connect it, or mark it as ending the run. |
| `unknown_node` | An edge starts or ends at a step that is not in the graph. |
| `duplicate_edge` | Two edges join the same steps for the same outcome. |
| `duplicate_id`, `invalid_id` | Step ids must be unique, 1 to 40 letters, digits, dashes or underscores. |
| `too_many_nodes`, `too_many_edges` | At most 60 steps and 120 edges. Split the work into two workflows. |
| `too_long` | A title over 200 characters, or a brief over 2,000. |
| `too_many` | A list with too many entries. |
| `required`, `invalid_type`, `invalid_enum`, `out_of_range` | A field is missing, the wrong type, not one of the allowed values, or out of range. |
| `invalid_repo` | A repository is not `owner/name`, `owner/*` or `*`. |
| `scope_unmanaged_repo` | A manual start names a repository that is not managed, or not in the scope. The run start returns it, not publish. |
| `github_calls_exceed_run_cap` | The steps' GitHub call caps add up to more than the run's cap. |

[Error codes](/software-factory/reference/validation-codes/) lists every code with its message.

> [!WHY] Why saving is lenient and publishing is strict
> You can save a half-built graph and come back to it. Only a published version can run, so that is where every rule is enforced.

## The graph as a whole

| Limit | Value |
|---|---|
| Steps | 60 |
| Edges | 120 |
| Graph size | 512 KiB |
| Cycles | none, except a gate or decision looping back to a crew, bounded by `stopTheLineAttempts` |

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/v1/factory/workflows?status=&q=&repo=` | Newest change first. |
| POST | `/v1/factory/workflows` | `{name, slug, templateId}` or `{name, slug, graph}`. Neither gives one manual trigger. |
| GET | `/v1/factory/workflows/{id}` | `?format=yaml`, `?version=6` |
| PUT | `/v1/factory/workflows/{id}` | Save the draft, with `revision`. |
| DELETE | `/v1/factory/workflows/{id}` | Archive. Owner or admin. `?cancelRuns=1` to cancel live runs first. |
| DELETE | `/v1/factory/workflows/{id}/draft` | Discard the draft. |
| GET | `/v1/factory/workflows/{id}/versions` | Every version, and `/versions/{v}` for one. |
| POST | `/v1/factory/workflows/{id}/publish` | `{version, revision, note}`. Owner or admin. |
| POST | `/v1/factory/workflows/{id}/dry-run` | `{version, repo, trigger, callModels, inputs}`. `callModels` must be false. `?keep=1` is accepted; no run is kept. |

A workflow can be named by its id or its `slug` anywhere a path takes one.
