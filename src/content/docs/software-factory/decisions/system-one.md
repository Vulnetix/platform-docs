---
title: System One decisions
nav: System One
description: The fast classifier models that decision steps call, when each is available, tenant defaults, the daily cap, the decision ledger, overrides and retention.
order: 1
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-systemone.md, vdb-site/api/internal/systemone/decide.go, vdb-site/api/internal/systemone/guard.go, vdb-site/api/internal/handler/factory_systemone.go, website/src/shared/factory-settings.ts]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

System One is the set of fast classifier models that [decision steps](/software-factory/workflows/nodes/decision/) call. A decision asks a closed question and gets back one of the outcomes you listed and a confidence. The model never writes free text into the path of a run.

## The models

| Adapter | Model | Available when |
|---|---|---|
| `clef-flash` | Workers AI Clef Flash | Vulnetix's Cloudflare connection is configured. The tenant default. |
| `clef` | Workers AI Clef | Same as `clef-flash` |
| `jev` | Jev | Jev is configured and enforcing. Shadow mode counts as not configured, because the factory acts on what it is told. |
| `tev1` | stub | Never. It always answers "not configured". |

Adapters that are not available still appear in Settings, marked unavailable. A step that names one gets no answer.

Every call goes through a guard that applies the daily cap, size limits and a timeout, and records usage. A request is limited to 1 to 64 questions, a 256 KiB body and 100 KB of state, and is refused before it leaves if it is larger.

### When a call fails

Errors are grouped into classes: `unavailable`, `rate_limited`, `quota`, `invalid`, `auth`, `timeout`, `protocol`, `cap_exceeded` and `not_configured`. The first three, `unavailable`, `timeout` and `rate_limited`, are worth retrying. Every error counts as no answer, so the step's `onAbstain` applies.

## Tenant defaults

Settings › System One decisions holds the defaults every decision step inherits. A step can override each one.

| Setting | Resolve Platform label | Values | Default |
|---|---|---|---|
| `systemone.model` | Default decision model | `clef-flash`, `clef`, `jev`, `tev1` | `clef-flash` |
| `systemone.min_confidence` | Minimum confidence | 0 to 1 | 0.80 |
| `systemone.min_confidence.adapter` | | the adapter the threshold was set for. Read-only. | `clef-flash` |
| `systemone.below_threshold` | | `escalate_human`, `route_to_fallback_model`, `take_safest_outcome`, `end_run` | `escalate_human` |
| `systemone.on_abstain` | | `escalate_human`, `retry_once_then_escalate`, `end_run` | `escalate_human` |
| `systemone.fallback` | | `jev`, `pix-fast`, `none` | `jev` |
| `systemone.retention` | | `full_400d`, `hash_only`, `days_30` | `full_400d` |
| `systemone.override` | | on, off. Whether a person may override any decision. | on |
| `pix.jevDailyCap` | | decisions a day, shared with the sandbox's own classifier | 2000 |

Changing `systemone.model` needs a new `systemone.min_confidence` in the same save, or it is refused with `threshold_required`. The server then records which model the threshold is for.

> [!WHY] Why a new model needs a new threshold
> Each model is calibrated differently. A confidence of 0.8 from Clef Flash and 0.8 from Jev are not the same claim, so a threshold is only meaningful for the model it was set for.

## The daily cap

`pix.jevDailyCap` (2,000 by default) limits decisions per tenant per day. A decision over the cap gets no answer, and the step's `onAbstain` applies. The Settings page shows today's use against the cap for each adapter. A decision step's `dailyCapShare` is recorded but not enforced per workflow yet; the tenant cap is the guard.

## The decision ledger

Every decision writes a ledger row: the run, workflow and step, the adapter and model identity, the outcome, confidence, threshold, the action taken (`proceed`, `escalate`, `stop`, `route_fallback`, `take_safest` or `end_run`), whether it fell back or got no answer, latency, tokens, and a hash of the input. It never stores the input text.

What the model gave as its reasons is kept according to `systemone.retention`:

| Value | Keeps |
|---|---|
| `full_400d` | The reasons, for 400 days |
| `hash_only` | Only a hash |
| `days_30` | The reasons, for 30 days |

A decision step can set its own `rationaleRetention`. With `audit.sign` on, the default, the ledger is signed.

## Overrides

While `systemone.override` is on, a person can override a decision: open it on the run page and choose another of the step's outcomes, with a note. The override is recorded on the decision's own ledger row (the new outcome, who and when), with its own audit entry and a `decision` event. If the run is still parked on that decision, it is re-routed. An outcome that is not one of the step's is refused with `invalid_outcome`. A run already past that step, and not retryable, is refused with `bad_state`.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/systemone/adapters` (each adapter, whether it is available, its capabilities, and today's use against the cap) |
| GET | `/v1/factory/decisions?run=&workflow=&node=&outcome=&action=&adapter=&before=` |
| POST | `/v1/factory/decisions/{id}/override` with `{outcome, note}` |

## Related

- [Decision node](/software-factory/workflows/nodes/decision/)
- [Model routing](/software-factory/cost/model-routing/) for the `systemone_decisions` route and its budget.
