---
title: Autonomy levels
nav: Autonomy
description: The four levels of how far the factory may go on a repository, how the tenant maximum, the default and per-repository values combine, and the limits on concurrency, retries and waiting.
order: 4
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_settings_store.go, vdb-site/api/internal/handler/factory_defaults_gate.go, website/src/shared/factory-settings.ts]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

Autonomy is how far the factory may go on a repository without a person. It is a ladder: each level allows everything below it.

| Level | Resolve Platform | The factory may |
|---|---|---|
| `observe` | Observe | Read, decide and record. It writes nothing to GitHub. |
| `suggest` | Suggest | Comment and post reviews. |
| `draft_pr` | Draft PR | Open draft pull requests on its own branches. |
| `auto_merge_low_risk` | Approve when ready | Approve a pull request once it is ready. It never merges. |

> [!WHY] Why the top level is called "approve when ready"
> The stored name `auto_merge_low_risk` is kept for compatibility, but the factory has no permission to merge. At this level it submits an APPROVE review when a pull request is ready. Your branch protection and a person, or your merge queue, do the merge.

## How the level is chosen

Three values combine:

- **`autonomy.max`** (Maximum autonomy) caps everything. No repository and no workflow can exceed it. Default `draft_pr`.
- **`autonomy.default`** (Autonomy of a repository with no settings of its own) applies to every repository in a managed org that has no settings row. Default `draft_pr`.
- **A repository's own autonomy**, set on its panel on the Repos page.

The effective level of a repository is its own value if it has one, otherwise `autonomy.default`, and in both cases no higher than `autonomy.max`.

Lowering `autonomy.max` below a repository's stored value lowers that repository's effective level at once, but keeps the stored value. Raising the maximum later restores it. Saving a repository's autonomy above `autonomy.max` is refused with `autonomy_above_max`.

Each [default workflow](/software-factory/workflows/default-workflows/) needs a minimum level. `pr-review` needs `suggest`, the fix and sweep defaults need `draft_pr`, and `approve-ready` needs `auto_merge_low_risk`. A default skips a repository below its level and records a `trigger.skipped` event, at most once an hour per repository.

## Plan approval

`autonomy.plan_approval` (Plan approval required for belai:feature) is on by default. A run that dispatches the `belai:feature` crew, or the `issue-to-pr` default, stops after the planner and waits for a person to approve the plan before any code is written. Switch it off to let those runs go straight from plan to build.

## Concurrency, retries and waiting

These settings sit in the Autonomy section of Settings:

| Setting | Resolve Platform label | Range | Default | Effect |
|---|---|---|---|---|
| `autonomy.concurrency` | Max concurrent runs | 1 to 64 | 4 | Runs of the tenant that may be `running` at once. Others queue. |
| `autonomy.parked_concurrency` | Max runs waiting for a machine | 1 to 1000 | 50 | Runs that only wait for a host do not use a concurrent slot. This caps how many may wait. |
| `autonomy.no_host_ttl_hours` | Hours a step may wait for a machine | 1 to 168 | 6 | A crew step with no host to run on waits this long, then the run ends with `no_host_timeout`. |
| `autonomy.claim_ttl_minutes` | Minutes a dispatched card may go unclaimed | 1 to 1440 | 60 | A crew that starts but never opens a session for its card fails the attempt with `card_unclaimed` and retries, so the run does not hold a slot for hours. |
| `autonomy.max_attempts` | Stop the line after failed attempts | 1 to 10 | 3 | How many times a failed step is retried before the run stops. |

The same section also holds two Belai keys that every factory session reads: `belai.mode` (Default agent mode: `goal`, `agent`, `plan` or `auto`) and `belai.ask_permission`. See [Agents](/software-factory/workforce/agents/).

> [!CAREFUL] Unattended sessions do not stop for permission asks
> `belai.ask_permission` is off by default. Workers that a workflow or schedule starts, and sessions Pix starts on a call, run tools without stopping to ask. Guardrails still apply. Switch it on if you want workflow workers to stop for approval.

## Related

- [Managed orgs and repositories](/software-factory/control/managed-scope/) to set a repository's own level.
- [Default workflows](/software-factory/workflows/default-workflows/) for the level each default needs.
- [Settings reference](/software-factory/reference/settings/) for every key.
