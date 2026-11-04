---
title: Schedules
description: Cron triggers for workflows and agent schedules on hosts, in one list. Cron syntax, timezones, where each schedule runs, what happens when runs overlap, and what a missed or held fire does.
order: 23
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_schedules.go, vdb-site/api/internal/handler/factory_cron.go, vdb-site/api/internal/handler/factory_internal.go]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

The **Schedules** tab on the Workflows page lists every schedule in one place:

- **Workflow schedules** are cron trigger nodes in published workflows, owned by the factory.
- **Agent schedules** are crons a host keeps for its own background agents. They are listed here read-only and edited with the host schedule editor (**New agent schedule** opens it). The host fires them, not the factory.

The list is ordered by next run, with disabled schedules last.

## A cron trigger

```json
{ "kind": "cron", "cron": "0 3 * * 1-5", "tz": "Australia/Melbourne", "runsOn": "aws", "overlap": "skip_if_running" }
```

### Cron syntax

Five fields: minute, hour, day of month, month, day of week. Day of week `0` and `7` are both Sunday.

| Example | Runs |
|---|---|
| `0 3 * * 1-5` | 03:00 on weekdays |
| `*/30 * * * *` | every 30 minutes |
| `0 2 * * 0` | 02:00 every Sunday |

Not accepted:

| Code | Why |
|---|---|
| `cron_invalid` | Not a valid five-field cron. |
| `cron_unsupported` | Both day of month and day of week are restricted, so "either day" is meant. The scheduler cannot express that. Also `L`, `W` and `#`. |
| `cron_granularity` | Seconds. The finest schedule is one minute. |
| `tz_invalid` | Not an IANA timezone name such as `UTC` or `Australia/Melbourne`. |

Daylight saving is handled by the scheduler, in the trigger's `tz`.

### Where it runs

| `runsOn` | Fired by | Valid for |
|---|---|---|
| `aws` | AWS EventBridge Scheduler. The default. | any workflow |
| `cloudflare` | A Cloudflare Durable Object alarm | workflows with a scan, crew, or decision on a Clef model, which is work that runs in the sandbox or on Workers AI |
| `host` | The host's own schedule | agent schedules only |
| `engine` | Nothing on a timer: the factory starts the run when the event arrives | webhook, finding, label, kanban, manual and firewall triggers. Not valid on a cron trigger. |

The builder offers only the values valid for the workflow. Anything else is refused with `runs_on_invalid`. Moving a schedule between `aws` and `cloudflare` keeps its next run time.

### When runs overlap

| `overlap` | If the previous run is still going when the schedule fires |
|---|---|
| `skip_if_running` | Skip this fire. |
| `queue` | Queue a new run behind it. |
| `cancel_previous` | Cancel the running one and start fresh. |

## Sync state

A trigger row and its scheduler entry change together or not at all: a scheduler failure rolls the write back and the API returns the error. Each workflow schedule shows a state:

| State | Meaning |
|---|---|
| `synced` | The scheduler has it, or the trigger needs no AWS schedule. |
| `pending` | An `aws` cron with no AWS schedule recorded yet. |

## Editing schedules

On the Schedules tab you can add, change, pause and delete schedules.

- **Adding or re-timing** a workflow schedule changes its trigger node and publishes a new version of the workflow, so the graph stays the one source of truth. It is refused with `bad_state` if the workflow has an unpublished draft. Publish or discard it first, so a schedule edit never publishes someone else's work.
- **Pausing** (switching `enabled` off) changes only the schedule, not the workflow version.
- **Deleting** publishes a version without the trigger node and removes it from the scheduler.
- **Agent schedules** cannot be changed here: `PATCH` and `DELETE` refuse a `host_` id and point to the host's own routes.

## Fan-out is staggered

A cron trigger that reaches many repositories, such as the weekly test and lint sweeps over every managed repository, does not start every run at the tick. Each repository's run starts at a fixed offset inside a 6-hour window, worked out from a hash of the repository's name, so the same repository runs at the same time each week and hosts receive the sweep a few runs at a time. A cron that reaches one repository starts at once. A run waiting for its offset holds no concurrency slot.

## Holds and missed fires

The factory never polls a clock to decide what is due. The scheduler calls the factory's internal trigger endpoint with a signed request. If the factory is paused or stopped, the fire is answered as held and no run starts. During a maintenance window or blackout the fire's runs are created and wait as `held` until the window ends. The `schedules.missed` setting names what to do with fires held by a pause or stop: one run (`run_once`, the default), none (`skip`), or one per held fire (`run_all`). This build keeps no held-fire count, so `POST /v1/factory/resume` reports `heldFires: 0` and no held fire is replayed yet. See [Holds and blackouts](/software-factory/control/holds-and-blackouts/).

A fire that is not due yet, a duplicate, a disabled schedule, or an overlap that `skip_if_running` skips is ignored.

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/v1/factory/schedules?kind=&host=&workflow=&runsOn=&enabled=` | Up to 500, not paged. |
| POST | `/v1/factory/schedules` | `{kind: "workflow", workflowId, nodeId, cron, tz, runsOn, overlap}` |
| PATCH | `/v1/factory/schedules/{id}` | Any of `enabled`, `cron`, `tz`, `runsOn`, `overlap` |
| DELETE | `/v1/factory/schedules/{id}` | |

Workflow schedule ids are the trigger's uuid. Agent schedule ids look like `host_<hostId>_<sid>`. Hosts manage their own agent schedules at `/v1/belai/hosts/{hostId}/schedules`. See [Host schedules](/software-factory/workforce/host-schedules/).

A schedule fires its run from the Vulnetix side, so no machine of yours needs to be awake for it.
