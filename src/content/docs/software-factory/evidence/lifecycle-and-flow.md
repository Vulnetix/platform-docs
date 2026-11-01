---
title: Lifecycle and flow
description: How the factory measures its queues as work in against work done. The stages a piece of work passes through, what the flow figures mean, and how capture is checked.
order: 7
sources: [vdb-site/docs/factory-lifecycle.md, website/.repo/factory-lifecycle.md, vdb-site/api/internal/lifecycle/catalogue.go, vdb-site/api/internal/lifecycle/flow.go]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

Every queue the factory reports, from runs waiting to start to pull requests waiting for review, is measured the same way: **arrivals** (work in) against **completions** (work done). The lifecycle ledger records each piece of work entering and leaving each stage.

## Stages

| Group | Stages |
|---|---|
| Sessions | `session.queued` (asked for, not started), `session.live` |
| Runs | `run.queued`, `run.running`, `run.held` |
| Steps | `step.running` |
| Checkpoints | `checkpoint.approval`, `checkpoint.question`, `checkpoint.card_held`, `checkpoint.card_blocked`, `checkpoint.card_confirm`, `checkpoint.pr_ready`, `checkpoint.pr_draft`, `checkpoint.issue_external`, `checkpoint.claim_lapsed`, `checkpoint.host_offline` |
| Cards | `card.backlog`, `card.review`, `card.in_progress`, `card.blocked`, `card.done` |
| GitHub | `pr.open`, `pr.draft`, `issue.open` |
| Hosts | `host.offline`, `host.full` |
| Results | `outcome` |

Each record is one subject in one stage: when it entered, when it left, and why it left.

## Flow figures

For any stage and period:

| Figure | Meaning |
|---|---|
| Depth | How many are in the stage now |
| Arrivals | How many entered |
| Completions | How many left |
| Wait | How long they stayed, as a median and a spread |
| Trend | Whether the queue is growing or shrinking |

A queue whose arrivals outrun its completions is growing, however short it looks today. The **open** view lists what is in a stage right now, oldest first.

## Coverage

The ledger is built from the factory's own tables by a sweep every five minutes. **Coverage** checks each stage against its source and reports anything the ledger missed, so you can trust a flow figure before you act on it.

`lifecycle` events (`entered`, `exited`) stream changes from the last hour.

> [!PIX] Queues by phone
> Ask "is the review queue growing?". Pix answers from this ledger with `queue_flow`, and `lifecycle_coverage` tells it whether the figures are complete.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/flow` |
| GET | `/v1/factory/flow/open` |
| GET | `/v1/factory/lifecycle/coverage` |
