---
title: Trigger node
description: The step a run starts at. The seven kinds of trigger, the keys each one takes, and how one node can carry several triggers.
order: 10
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_workflow_graph.go, vdb-site/api/internal/handler/factory_trigger_conditions.go]
checked: [vdb-site@284f1d6]
updated: 28 Oct 2026
---

Every workflow needs at least one trigger node. When a run starts, the engine begins at the trigger that fired. The step writes the run's starting facts to `trigger/run.json` and succeeds at once.

## Kinds

| `kind` | Starts a run when | Keys |
|---|---|---|
| `webhook` | A GitHub delivery matches the event and conditions | `event`, `conditions`, `debounceSeconds`, `maxRunsPerHour`, `ref` (`default` or `tags`), `priority` |
| `cron` | A schedule fires | `cron` (five fields), `tz`, `runsOn` (`aws` or `cloudflare`), `overlap` |
| `label` | A label is added to an issue or pull request, or a `/sf` command asks for it | `label`, `allowBots` |
| `finding` | A scanner reports a finding of the listed severities | `severity` list: `critical`, `high`, `medium`, `low` |
| `kanban` | A card moves from one board list to another | `fromList`, `toList` |
| `firewall` | The Package Firewall, AI Firewall or sandbox egress sees something new | `source`, `events`, `newTo`, filters, `ticketRepo` |
| `manual` | A person starts the run, in the Resolve Platform or on a Pix call | none |

`finding` and `kanban` triggers validate and publish, but the engine has no code path that fires them yet: GitHub deliveries match only `webhook` and `label` triggers.

Each kind has its own page:

- [Triggers and webhook conditions](/software-factory/workflows/triggers/) covers `webhook` events, every condition, and the safeguards against storms and forks.
- [Schedules](/software-factory/workflows/schedules/) covers `cron`.
- [Labels and commands](/software-factory/workflows/labels-and-commands/) covers `label` and the `sf:` labels.
- [Source events](/software-factory/workflows/source-events/) covers `firewall`.

## Several triggers on one node

A trigger node can list more triggers under `also`. Each becomes its own trigger, and any of them starts the same graph:

```json
{ "id": "n1", "type": "trigger", "title": "Weekday dependency sweep",
  "config": { "kind": "cron", "cron": "0 3 * * 1-5", "tz": "Australia/Melbourne", "runsOn": "aws",
              "overlap": "skip_if_running",
              "also": [ { "kind": "finding", "severity": ["critical", "high"] },
                        { "kind": "webhook", "event": "push", "ref": "default" },
                        { "kind": "label", "label": "belai:security" } ] } }
```

`also` entries cannot nest.

## Priority

When one GitHub delivery matches several triggers, they fire in `priority` order, 1 first to 5, default 3. At most 6 runs start per delivery by default (`factory.fanoutCap`, 1 to 50). See [Labels and commands](/software-factory/workflows/labels-and-commands/).

## What a run keeps of its trigger

A run started by an event keeps the event's facts: the event and action, repository, pull request or issue number, head commit, branch, author, labels and whether it came from a fork. It does not keep titles, bodies or comment text, so a crew is never handed text an outsider wrote. The facts are on the run page and in the crew's card.
