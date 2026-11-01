---
title: Human node
description: A step that waits for a person to approve. Who can approve, how they are told, how long they have, and the fork rule that makes some workflows need one.
order: 15
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-engine.md, vdb-site/api/internal/handler/factory_engine_node_human.go]
checked: [vdb-site@284f1d6]
updated: 28 Oct 2026
---

A human step stops the run until a person approves or rejects. The step creates an [approval](/software-factory/decisions/human-approval/), notifies the approvers, and waits. The approval shows on the Checkpoints page and the cockpit's Needs you list.

The approval's kind depends on where the step sits in the graph: `plan` after a planner agent step, `suppression` when a decision routed to it on a suppress outcome, `merge` when an output step follows it, or `escalation`.

## Config

| Key | Values | Default |
|---|---|---|
| `approvers` | at least one | |
| `notifyVia` | `slack`, `teams`, `google_chat`, `discord`, `webhook`, `email`, `push` | your notification routes |
| `slaHours` | 1 to 720 | 24 |
| `onTimeout` | `park_and_renotify`, `end_run` | `park_and_renotify` |

An approver is one of:

| Kind | Example |
|---|---|
| `team` | `{"kind": "team", "ref": "@acme-platform/ops-leads"}` |
| `member` | a member of your organisation |
| `role` | a role, such as admin |
| `repo_admins` | the repository's admins on GitHub |

Owners and admins can always decide. A human step with no approver is refused with `approver_missing`.

## Telling people

The approval goes to the chat providers named in `notifyVia` through your organisation's connections, and otherwise to your notification routes. `push` follows each person's own push preferences.

## Deadlines

When `slaHours` runs out:

| `onTimeout` | Effect |
|---|---|
| `park_and_renotify` | The approvers are told again and get another `slaHours`. |
| `end_run` | The approval expires and the run fails. |

A rejection ends the run as `cancelled` with reason `declined:<node>`. A person saying no is not counted as a failure, retried or reported as one.

## The fork rule

A pull request from a fork contains code an outsider wrote. A workflow whose `pull_request` or `pull_request_review` trigger accepts forks must put a human step on every path from that trigger to a crew or a draft pull request. Otherwise publish fails with `fork_pr_needs_human`. The same rule is checked again when a run fires, for every untrusted event, including issues opened by people outside your team.

> [!CAREFUL] Approve what you have read
> Approving a fork's run lets an agent check out and run that code on your host. Read the change first.

## Plan approval

When `autonomy.plan_approval` is off, a human step that follows a planner succeeds at once without asking anyone.

## Related

- [Human approval](/software-factory/decisions/human-approval/) for deciding approvals and their states.
- [Checkpoints](/software-factory/decisions/checkpoints/)
