---
title: Holds, maintenance windows and blackouts
nav: Holds and blackouts
description: Maintenance windows and schedule blackouts that hold factory work on a recurring basis, what a held run looks like, and what happens to work held meanwhile.
order: 6
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_engine_state.go, website/src/shared/factory-settings.ts]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

Four things hold factory work. Held work is never dropped: it waits, shows up on the cockpit and in Checkpoints, and starts again when the hold lifts.

| Hold | Set by | Holds |
|---|---|---|
| Pause | The cockpit's **Pause all automations** | Every trigger. Running steps finish. |
| Stop | Settings' **Stop the factory** | Every trigger. Running steps are cancelled. |
| Maintenance window | `pix.maintenance` | Every new step while the window is open. |
| Schedule blackout | `schedules.blackout` | Every new step while the window is open. |

Pause and stop are covered in [Pause, stop and resume](/software-factory/control/pause-and-stop/). This page covers the windows.

## Maintenance windows

A maintenance window is a recurring time when your Pix Sandbox may be updated and restarted. While it is open the factory starts no new step. A queued run becomes `held` and is queued again when the window closes; a run already running starts no new step until then.

```json
[{ "days": ["sun"], "start": "02:00", "end": "04:00", "tz": "Australia/Melbourne" }]
```

This is the factory's own setting. The sandbox's page has a separate relaunch window, stored on the sandbox in a different shape, and saving one does not change the other. Each `pix.maintenance` window is evaluated in its own `tz`, not `schedules.tz`.

## Schedule blackouts

A blackout is a recurring time when the factory starts no new work, such as a release freeze or a weekend. Runs that schedule fires or events start during the window wait as `held` until it ends.

```json
[{ "from": { "day": "fri", "time": "16:00" }, "to": { "day": "mon", "time": "08:00" }, "label": "release freeze" }]
```

`day` is `mon` to `sun`, and `time` is `HH:MM`. Blackouts use `schedules.tz`, the timezone for every schedule. It defaults to `UTC`, so set it to your own zone before you rely on a blackout.

> [!CAREFUL] A window does not stop work already running
> Like pause, a window stops new steps from starting. A step that started before the window opened runs to the end. Stop the factory if work in flight must end now.

## What happens to held fires

A schedule fire that arrives while the factory is paused or stopped starts no run; the scheduler is answered `held` with reason `stopped`. (The documented reasons are `paused`, `stopped`, `maintenance` or `blackout`, but a fire during a window is not held at the scheduler: it starts its run, which waits as `held`.) `schedules.missed` is the policy for held fires:

| Value | When the hold lifts |
|---|---|
| `run_once` | One run per trigger that had held fires. The default. |
| `skip` | No run. |
| `run_all` | One run per held fire, up to 24. |

The trigger table has no held-fire counter yet, so resume answers `heldFires: 0` and reports the policy in `applied` without replaying any fire.

> [!WHY] Why the default is one run
> A nightly sweep held over a three-day weekend should run once on Tuesday, not three times in a row against the same code. Pick `run_all` only for schedules where each fire covers a different period.

## Seeing a hold

- The cockpit shows the factory state and whether a window is active now, with the next window and when it starts and ends.
- A held run has status `held` on the Runs page.
- The [event stream](/software-factory/evidence/event-stream/) records a `run` event `held` with the reason, and the audit log a `gate.held` entry.

## Settings

| Setting | Default | Format |
|---|---|---|
| `pix.maintenance` | none | list of `{days, start, end, tz}`. Stored on the sandbox. |
| `schedules.blackout` | none | list of `{from: {day, time}, to: {day, time}, label}` |
| `schedules.tz` | `UTC` | IANA timezone name |
| `schedules.missed` | `run_once` | `run_once`, `skip`, `run_all` |

## Related

- [Schedules](/software-factory/workflows/schedules/)
- [Pix Sandboxes](/software-factory/workforce/pix-sandboxes/)
