---
title: Runs and steps
description: What a run is, the statuses it and its steps move through, the run page and its trace, and how to start, pause, resume, cancel and retry a run.
order: 1
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-engine.md, vdb-site/api/internal/handler/factory_runs.go, vdb-site/api/internal/handler/factory_runs_actions.go, vdb-site/api/internal/handler/factory_run_detail.go]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

A run is one execution of a published workflow version, for one repository or one card. Each node the run reaches becomes a **step**. The Runs page (`/resolve/factory-runs`) lists runs and sessions; opening a run (`/resolve/factory-run`) shows its trace.

Runs are named by a display key, `run_` and the first eight hex characters of the run's id (such as `run_3f9a2c1e`), which also works in filters and URLs.

## Run statuses

| Status | Meaning |
|---|---|
| `queued` | Waiting to start. The tenant or workflow is at its concurrency limit, or the run is next in line. |
| `running` | At least one step has started. |
| `waiting_approval` | A person has to approve something. See [Checkpoints](/software-factory/decisions/checkpoints/). |
| `paused` | Paused by a person, or by a budget's `pause_run` action. |
| `held` | A pause, stop, maintenance window or blackout is holding it. See [Holds](/software-factory/control/holds-and-blackouts/). |
| `succeeded` | Finished. Also used when a decision ended the run on purpose (reason `ended:<node>`). |
| `failed` | A step failed that nothing handled. |
| `cancelled` | Cancelled by a person, a label, or a rejection at a human step (reason `declined:<node>`). |

`queued`, `running`, `waiting_approval`, `paused` and `held` are the active statuses.

A failed run carries a reason. The most common:

| Reason | Meaning |
|---|---|
| `stopped_line:<node>` | A step failed more times than allowed, or a gate looped back to its crew more than `stopTheLineAttempts`. |
| `no_host:<node>` | A step pinned to a target had no host, with `runOnFallback: none`. |
| `no_host_timeout:<node>` | A step waited for a machine longer than `autonomy.no_host_ttl_hours`. |
| `rejected:<node>` | A person rejected an escalated decision. |

A failed run's notice says in words which step failed and why, for example "Sweep the tests: No worker claimed the card, on the last attempt."

## Step statuses

| Status | Meaning |
|---|---|
| `pending` | Not started. |
| `running` | Started. |
| `waiting` | Parked: for a host, a person, checks, quota, a window, or a scan upload. The step says what for. |
| `succeeded` | Done. |
| `failed` | Failed. It may be retried. |
| `skipped` | Not needed, for example a crew at autonomy `observe`, or no machine has the repository. |
| `cancelled` | Cancelled with its run. |

A crew step with several replicas is one step listing all of its sessions.

## How concurrency works

A queued run starts when the tenant has fewer than `autonomy.concurrency` runs `running` or `waiting_approval`, and the workflow fewer than its own `concurrency` limit. A run that is only waiting for a machine does not take a slot. See [Waiting for a machine](/software-factory/runs/waiting-for-a-machine/).

## The run page

The run page shows:

- **The header**: workflow and version, repository, trigger, commit, card, start and elapsed time.
- **Totals**: tokens and the share of the run budget, an estimated cost, decisions made against those planned, handoffs.
- **The trace**: every step in order, who did it, its status, attempt, tokens and duration, and what it wrote. A decision step shows its question, outcome, confidence, threshold and adapter, and its reasons when retention kept them.
- **The pull request** with its checks, when there is one. This comes from webhooks.
- **Evidence**: SLSA provenance, the SBOM, the sandbox image, the decision ledger, gate evidence and the TEA release, each with a state: `verified`, `ok`, `signed`, `pending`, `failed` or `n/a`.
- **Network**: the hosts the run's sandbox reached and was refused, with request counts, and the secrets granted to it.
- **Where it is stored**: the storage folders and database rows that belong to the run, kept 400 days.
- **The event** that started it, when a webhook did.

## Actions

The run page shows each action only when it is allowed, with its GitHub price.

| Action | Allowed when | What it does | GitHub calls |
|---|---|---|---|
| Start | the workflow is published and enabled | Starts a run of the published version. **Send to workflow** on the board starts one per repository of the chosen cards. | 0 to start |
| Pause | `queued`, `running`, `waiting_approval` | Stops new steps for this run. | 0 |
| Resume | `paused` | Continues. | 0 |
| Cancel | `queued`, `running`, `waiting_approval`, `paused`, `held` | Closes open steps and approvals, withdraws dispatches, releases leases. | 0 |
| Retry | `failed` (including a stopped line) or `cancelled` | Retries from a chosen step (`fromStepId`), by default the first that failed, and every step after it, returning the run to `queued`. Earlier steps and their outputs are reused. | up to the GitHub caps of the steps that run again |
| Re-check on GitHub | the run has a pull request | Reads the pull request and its checks live and updates the mirror. | 1 |
| Download evidence | anything to export | A zip of the run's `evidence/` files, its decision ledger rows and a manifest. | 0 |

An action from the wrong state is refused with `bad_state`. Starting, retrying, pausing or resuming while the factory is stopped is refused with `factory_stopped` (cancel still works).

> [!PIX] Runs by phone
> Ask Pix "what runs failed today?" (`list_runs`) or "what happened on run 8812?" (`run_facts`). Pix reads the same records as this page.

## Filtering the list

| Filter | Takes |
|---|---|
| status | one or more statuses |
| workflow | id or slug |
| repo | `owner/name` |
| trigger | the trigger kind |
| card | card id |
| from, to | start time |
| fact | `kind:value`, repeatable, all must match. See [Facts](/software-factory/evidence/facts/). |
| q | run id, workflow, repository or card key |

The first page also gives today's runs, live sessions, sessions and tokens in the last 7 days, the median run length and runs ended today.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/runs` |
| POST | `/v1/factory/runs` with `{workflowId, repo, trigger, cardIds, inputs}` |
| GET | `/v1/factory/runs/{id}` |
| POST | `/v1/factory/runs/{id}/cancel`, `/pause`, `/resume`, `/retry`, `/recheck-pr` |
| GET | `/v1/factory/runs/{id}/evidence.zip` |

`POST /v1/factory/runs` accepts an `Idempotency-Key` header. A replay with the same key returns the first answer, marked `Idempotent-Replay: true`.
