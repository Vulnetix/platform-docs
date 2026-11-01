---
title: How the engine walks a graph
nav: How runs advance
description: What moves a run from one step to the next, how loops and joins work, leases and recovery, and why a run can sit still without anything being wrong.
order: 3
sources: [vdb-site/docs/factory-engine.md, vdb-site/docs/factory-operations.md, vdb-site/api/internal/handler/factory_engine.go, vdb-site/api/internal/handler/factory_engine_walker.go]
checked: [vdb-site@284f1d6]
updated: 28 Oct 2026
---

This page explains what the engine does between steps. You do not need it to use the factory, but it helps when a run is not doing what you expect.

## Nothing polls

The engine has no timer that scans for work. A run moves only when something tells the engine it can:

| Event | Wakes |
|---|---|
| A run is queued (a schedule fired, a person started it, an event matched) | that run |
| A host acknowledges a dispatch | the crew step that dispatched it |
| A card changes list on the board | runs whose crew step watches that card |
| A session reports in or ends | runs whose step watches that session. A live session also extends the step's lease. |
| A GitHub webhook arrives | gate and output steps of that repository |
| Scanner results are uploaded | scan steps of that repository |
| A person decides an approval | that run |
| The factory resumes, or a window ends | held runs |
| A budget changes | runs parked for budget |
| A one-shot wake falls due: an approval deadline, a quota reset, a retry backoff, a window end, a host or capacity recheck | that step |

So a run that is `waiting` is not stuck. It is waiting for one of these, and the step says which.

## Walking the graph

The engine works out which edges were taken from the history of steps. It stores no extra state.

- A run starts at the trigger that fired.
- When a step finishes, the edges it allows are taken: a decision's outcome, a gate's pass or its loop back, or every plain edge.
- A node with several incoming edges starts when one is taken and no other predecessor still has a step open.
- A loop, such as a gate sending work back to a crew, runs the crew again and the steps after it again.
- The run succeeds when nothing is open and nothing more can start. It fails when a step failed that nothing handles.
- A node whose next attempt would go past `stopTheLineAttempts` (3 by default) is not started, and the run fails with `stopped_line:<node>`.

## Leases

A step is leased while it starts, so two engine tasks never run it twice. A crew step parks with a 45 minute lease, which a live session keeps extending. If an engine task dies, a recovery pass releases expired leases, wakes queued runs older than two minutes, held runs, steps past their backoff, and approvals past their deadline. The same pass deletes events older than 30 days.

## Retries

A failed attempt is retried with a backoff, up to the step's `maxAttempts` (or `autonomy.max_attempts`, 3 by default). Some failures are never retried: a person's rejection, a hard budget stop, a GitHub 4xx on an output.

## What is written with each step

Each change of a step writes, in the same transaction, the step row, an audit entry and an event. A step's error is a short machine reason, never prompt text. Some reasons tell the engine what to do next: `deferred:<why>` (wait and start again), `gate_failed`, `attempts_exhausted`, `budget_hard_stop`, `route:$below_threshold`, `route:$unknown`, `ended:end_run`.

## Related

- [Runs and steps](/software-factory/runs/runs-and-steps/)
- [Waiting for a machine](/software-factory/runs/waiting-for-a-machine/)
- [The event stream](/software-factory/evidence/event-stream/)
