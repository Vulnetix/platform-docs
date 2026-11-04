---
title: Host schedules
description: Schedules a host keeps for its own workers, managed from the Resolve Platform. What a schedule can start, how it syncs, and what each run outcome means.
order: 22
sources: [belai/docs/remote-control.md, vdb-site/api/internal/handler/belai_schedules.go, vdb-site/api/internal/handler/belai_schedules_store.go, belai/internal/schedule, belai/internal/cron]
checked: [belai@35506b9, vdb-site@284f1d6]
updated: 28 Oct 2026
---

While `belai rc` runs, it fires the host's stored schedules. A schedule is a worker profile, a cron expression (five fields, or `@hourly`, `@daily`, `@weekly`, `@monthly`), one of the directories the host offers, and an on/off switch. The Pix Sandboxes page lists each host's schedules and lets you add, edit, pause and delete them; a change reaches the host within about 30 seconds. They also appear on the Workflows page's Schedules tab, as agent schedules. See [Schedules](/software-factory/workflows/schedules/).

## How they run

- **Every 30 seconds** the daemon fires each enabled schedule that is due, then syncs. Firing comes first, so an unreachable website never delays a run.
- **Local time.** Times are the host's local time. A schedule fires at most once per cron tick.
- **No late runs.** A run that came due while `belai rc` was not running is skipped, not fired late.
- **What it can start** is exactly what a worker request can: the daemon checks the directory against its own list and the profile against its own catalogue, then starts the worker with `-drain`, so it exits once the board has nothing for it. The website supplies no prompt, model or permission.
- **Never twice.** The daemon records the run before it fires, so a crash can skip a run but never fire it twice.

## Sync

The host keeps the durable copy. Each side's change carries a version, and the definition (profile, cron, directory, on/off) is last-writer-wins. The run record (when it last ran, how it went, when it runs next) is the host's alone, so an edit on the page can never lose a run. A delete reaches every host.

## Outcomes

| Outcome | Means |
|---|---|
| `started` | The worker started |
| `worked` | The worker ran and worked cards |
| `drained` | The worker ran and found nothing to do |
| `skipped_busy` | A worker of that profile was still running |
| `refused_cap` | The host was at its worker cap |
| `refused_cron` | The cron expression is not valid |
| `refused_dir` | The directory is not one the host offers |
| `refused_profile` | The host does not have the profile |
| `refused_disabled` | The schedule is switched off |
| `worker_failed` | The worker failed |
| `error` | Something else went wrong |

## API

| Method | Path |
|---|---|
| GET, POST | `/v1/belai/hosts/{hostId}/schedules` |
| PATCH, DELETE | `/v1/belai/hosts/{hostId}/schedules/{sid}` |
| GET | `/v1/belai/schedules` (every host's) |
