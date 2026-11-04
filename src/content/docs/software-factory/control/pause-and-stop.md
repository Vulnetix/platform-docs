---
title: Pause, stop and resume
nav: Pause and stop
description: The factory's kill switch, where pause holds new work, stop cancels running work and revokes tokens, and resume releases it, plus pausing or cancelling one run.
order: 5
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-operations.md, vdb-site/api/internal/handler/factory_state.go, vdb-site/api/internal/handler/factory_runs_actions.go]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

The factory has one switch for all automation. It has three states: `running`, `paused` and `stopped`. Only owners and admins can change it.

## Pause

**Pause all automations** is on the cockpit.

- Every trigger is held and no new step starts.
- Steps already running finish.
- Schedule fires that arrive while paused start no run: the scheduler is answered `held`. No held-fire count is stored yet (see Resume).
- It makes no GitHub calls.

Use pause when you want the factory to stop taking on work but let what it is doing finish, for example before a release freeze.

## Stop

**Stop the factory** is in Settings. It does everything pause does, and also:

- cancels every open run (`queued`, `running`, `waiting_approval`, `paused`, `held`) and its open steps, with reason `factory stopped`
- clears the step leases and withdraws the crew dispatches those runs started, stopping the factory's own sessions

The response also carries `revokedTokens` and `githubCalls` for revoking the GitHub tokens the factory minted, but no revocation hook is wired yet, so both are 0. The Settings page describes the stop as also revoking forge tokens and cancelling pending wakes; the API does not do either today.

Interactive Belai sessions are never touched. A session a person started in a terminal or on the session page keeps running.

> [!CAREFUL] Stop cancels work in flight
> A crew halfway through a fix loses that attempt, and uncommitted work on the host is not kept. Use pause unless you need everything to stop now.

Both actions ask for a reason of up to 500 characters. The reason, who acted and when are shown on the cockpit and written to the [audit ledger](/software-factory/evidence/audit-ledger/) as a `crew_control` entry.

## Resume

**Resume** takes the factory back to `running`, with an optional note of up to 500 characters. Held runs are queued again. `schedules.missed` is the policy for held schedule fires:

| Value | On resume |
|---|---|
| `run_once` | One run for each trigger that had held fires. The default. |
| `skip` | No run. The held fires are discarded. |
| `run_all` | One run per held fire, up to 24. |

The response reports `heldFires` and the policy in `applied`. The trigger table has no held-fire counter yet, so `heldFires` is always 0 and no fire is replayed.

## The state on the cockpit

`GET /v1/factory/state` returns:

- the state, since when, by whom and why
- whether a maintenance window or schedule blackout is active now, and the next window
- whether the engine is on
- the [A2A blackout](/software-factory/workforce/a2a-messaging/), which is a separate switch beside the kill switch

The response is sent `private, no-cache`, so every read is revalidated.

## Pausing or cancelling one run

To stop one run, not the whole factory, open it on the Runs page:

| Action | Allowed when the run is |
|---|---|
| Pause | `queued`, `running`, `waiting_approval` |
| Cancel | `queued`, `running`, `waiting_approval`, `paused`, `held` |

Cancelling withdraws the crew dispatches the run started. Trying either action from any other state is refused with `bad_state`. See [Runs and steps](/software-factory/runs/runs-and-steps/) for resume and retry.

> [!PIX] Stop work by phone
> On a call, say "stop the session on payments-api" and Pix reads back exactly what it will stop before it does. Pix can stop sessions. Pausing all automations and the kill switch are on the cockpit and in Settings. See [Stopping work](/software-factory/pix/stopping-work/) for all five ways to stop, from one session to destroying a sandbox.

## API

| Method | Path | Body |
|---|---|---|
| GET | `/v1/factory/state` | |
| POST | `/v1/factory/stop` | `{"mode": "pause" or "stop", "reason": "..."}` |
| POST | `/v1/factory/resume` | `{"note": "..."}` |

Asking for the state the factory is already in, or pausing a stopped factory, is refused with `409 bad_state`. Stopping a paused factory is allowed.

## Related

- [Holds and blackouts](/software-factory/control/holds-and-blackouts/) for the windows that hold work without the switch.
- [A2A messaging](/software-factory/workforce/a2a-messaging/) for the relay blackout.
