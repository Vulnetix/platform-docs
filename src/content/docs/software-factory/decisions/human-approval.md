---
title: Human approval
description: What an approval is, its kinds and states, who can decide one, how deadlines work, and how to decide from the Resolve Platform, a notification or a Pix call.
order: 3
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-engine.md, vdb-site/api/internal/handler/factory_approvals.go, vdb-site/api/internal/handler/factory_engine_approval.go]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

An approval is a decision a run waits for. It is created by a [human step](/software-factory/workflows/nodes/human/), by a decision that escalates, by a gate whose `onFail` is `human_approval`, by a budget whose limit action is `escalate_human`, and by a GitHub quota guard set to `escalate`. While any approval on a run is pending, the run is `waiting_approval`.

## Kinds

| Kind | Asks |
|---|---|
| `plan` | Approve an agent's plan before it builds. Skipped when `autonomy.plan_approval` is off. |
| `merge` | Approve a change as ready to merge. |
| `escalation` | Decide what a decision step could not: approve takes the model's pick (or the safest outcome), reject fails the run. |
| `suppression` | Approve suppressing a finding. |
| `budget` | Approve going past a budget. |

## States

| State | Meaning |
|---|---|
| `pending` | Waiting for someone. |
| `approved` | Approved. The step continues. |
| `rejected` | Rejected. A human step ends the run as cancelled; other steps fail it. |
| `expired` | The deadline passed with `onTimeout: end_run`. |
| `cancelled` | No longer needed, for example the run was cancelled or the decision was overridden. |

## Who can decide

The first member or role (`owner`, `admin`, `member`) the step names, and always the organisation's owners and admins. A step that names only a team or the repository's admins leaves the decision to owners and admins. Anyone else is refused.

A decision can carry a note of up to 1,000 characters. It is written to the audit ledger (kind `approval`) with the approver, and a `gate` event is emitted. Deciding an approval someone else already decided is refused with `already_decided`. Approvals carry a revision, so two people deciding at once cannot both win.

## Deadlines

A step's `slaHours` (1 to 720) sets the deadline. When it passes, with `park_and_renotify` (the default) the approvers are told again and get another deadline; with `end_run` the approval expires and the run fails. Below-threshold escalations from a decision default to the organisation's owners and admins with a 24 hour deadline.

## Where to decide

- **Checkpoints** and the cockpit's **Needs you** list every pending approval. See [Checkpoints](/software-factory/decisions/checkpoints/).
- **A notification** can carry Approve and Reject buttons that act straight away. See [Notifications](/software-factory/workforce/notifications/).
- **On a Pix call**, Pix reads you what is waiting with `needs_attention` and `oldest_checkpoints`.

> [!CAREFUL] Approving a fork's run runs outside code
> An approval in front of a crew on a fork's pull request lets an agent check out and run that code on your host. Read the change first.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/approvals?state=pending&run=&mine=1` (`state` is `pending`, `decided` or `all`) |
| POST | `/v1/factory/approvals/{id}/decide` with `{decision: "approve" or "reject", note, revision}` |

Deciding is refused with `factory_stopped` while the factory is stopped.
