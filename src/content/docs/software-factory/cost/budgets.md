---
title: Budgets
description: How factory budgets nest from the Pix allowance down to a single step, what happens at a limit, alerts, per-card agent limits, and the Budgets page.
order: 1
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-engine.md, vdb-site/api/internal/handler/factory_budgets.go, vdb-site/api/internal/handler/factory_engine_budget.go, vdb-site/api/internal/handler/factory_agent_budget.go, website/src/shared/factory-settings.ts]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

Budgets limit what the factory spends. They nest, and **the tightest one wins**: a step's budget inside its run's, inside its workflow's, inside the tenant's month, all inside your plan's Pix allowance. The engine checks before every model call and every step, and records what it spent in a ledger.

The Budgets page (`/resolve/factory-budgets`) shows the tiers as nested bars, every budget, model routing, providers and usage.

![The Budgets page with the nested tiers, budgets and routing](/img/sf-budgets-dark.webp)

## The tiers

| Tier | Limit |
|---|---|
| Pix allowance | The tokens your plan includes this month, and when they reset |
| Factory share | The part of the allowance the factory may use, `budget.factory_share` (75% by default). The rest is left for interactive sessions. |
| Workflow | A workflow's month budget, and its per-run budget |
| Run | One run |
| Step | One step, such as a decision's token budget or the System One daily cap |

## A budget

| Field | Values |
|---|---|
| Applies to | `tenant`, `org`, `workflow`, `node`, `repo` (the `reserve` row is read-only, set with `pix.reservePercent`) |
| Window | `run`, `day`, `week`, `month` for the tenant or a workflow; `node` for a node; `month` for a repo or org |
| Unit | `tokens`, `calls` (`usd` is refused as `unsupported` for now) |
| Provider | a provider, a comma list, or `all` |
| Alert at | percentages from 1 to 100, such as 50, 80 and 100 |
| At the limit | one of the actions below |

A child budget's limit cannot be above its parent's. The Budgets API refuses it with `limit_exceeds_parent`; in a workflow graph the same check is `budget_exceeds_parent` (a run budget larger than the month budget, or a step budget larger than the run budget).

A repository's **monthly token cap**, set on the Repos page, shows here as a `repo` budget. The tenant's **Factory** budget and the **reserve** for interactive sessions cannot be deleted.

### At the limit

| Action | Effect |
|---|---|
| `pause_run` | The run is parked as `paused` until someone resumes it or the budget changes. |
| `downgrade_to_fast` | The rest of the run uses the fast model route. |
| `switch_to_pix_allocation` | The rest of the run uses the Pix allocation instead of your own key. |
| `escalate_human` | An approval of kind `budget` is created. |
| `hard_stop` | The step fails, and so the run, with no retry. |
| `alert_only` | A `budget` event is emitted and the run continues. |

Every budget write is audited and emits a `budget` event. Alerts fire as events and notifications at each threshold.

## Tenant settings

| Setting | Default | Effect |
|---|---|---|
| `budget.month` | 30,000,000 tokens | The tenant's monthly factory budget, all providers |
| `budget.factory_share` | 75 | The percentage of the Pix allowance the factory may use |
| `budget.on_exceed` | `switch_to_pix_allocation` | The action when `budget.month` is reached: `pause_run`, `downgrade_to_fast`, `switch_to_pix_allocation`, `escalate_human` or `hard_stop` |
| `budget.alerts` | `[50, 80, 100]` | Alert thresholds, ascending |

> [!WHY] Why the factory gets a share, not the whole allowance
> Your own interactive sessions draw on the same allowance. Keeping a reserve means a busy week of automation never leaves you without tokens when you sit down to work.

## Per-card limits for agents

Every worker the factory starts claims one card at a time. These limits apply per card. Each is resolved from the crew step, then the workflow, then the organisation's setting. 0 at every level keeps the agent profile's own.

| Setting | Range | Effect |
|---|---|---|
| `agents.max_cost_usd_per_item` | 0 to 10,000 | Estimated cost in US dollars at which a worker's claim on one card ends. The built-in agents allow $8 to $25. |
| `agents.finalize_at` | 0 to 0.95 | The share of any per-card limit at which the worker is told to wrap up: commit, record findings, publish a draft pull request. A value under 0.5 is raised to 0.5. Built-in agents use 0.85. |
| `agents.max_attempts` | 0 to 10 | Failed attempts at one stage before Belai blocks the card. Not the same as `autonomy.max_attempts`, which retries a workflow step. |
| `agents.max_continuations` | 0 to 50 | Times a card may go back to be resumed after its budget ran out with progress made, before a person must decide. The agents' own default is 5. |
| `agents.max_passes_per_item` | 0 to 1,000 | Goal passes per card |
| `agents.max_wall_minutes` | 0 to 10,080 | Minutes per card |
| `agents.max_iterations` | 0 to 400 | Tool rounds per pass |

In a workflow these are `agentCostUsd`, `agentFinalizeAt`, `agentMaxAttempts`, `agentMaxContinuations`, `agentMaxPasses`, `agentMaxWallMinutes` and `agentMaxIterations`.

## API

| Method | Path | Who |
|---|---|---|
| GET | `/v1/factory/budgets` | member |
| POST | `/v1/factory/budgets` | owner, admin |
| PUT, DELETE | `/v1/factory/budgets/{id}` | owner, admin |
| GET | `/v1/factory/budgets/{id}/ledger` | member |
| GET | `/v1/factory/budgets/hosts` (per-host gauges and 7 day spend) | member |

## Related

- [Model routing](/software-factory/cost/model-routing/)
- [Usage and spend](/software-factory/cost/usage/)
- [Token budgets](/software-factory/belai/token-budgets/) in Belai itself, which inform but never block
