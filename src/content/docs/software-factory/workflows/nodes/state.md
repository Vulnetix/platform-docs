---
title: State node
description: A step that names where a run's data lives, so later steps and people can find it. An S3 object, a Postgres table or a kanban card.
order: 17
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_workflow_graph.go]
checked: [vdb-site@284f1d6]
updated: 28 Oct 2026
---

A state step points at data the run reads or writes. It makes the data part of the graph, so the builder, the run trace and the evidence pack all show where the run kept its state.

| Key | Values |
|---|---|
| `kind` | `s3_object`, `postgres_table`, `kanban_card` |
| `ref` | the object name, table name or card name, at most 300 characters |

`kind` is required.

| Kind | What the step does |
|---|---|
| `s3_object` | Writes `state/<ref>.json` under the run's storage folder, holding the run, repository, node and time. |
| `postgres_table` | Not available. A graph that uses it saves, but the step is skipped when it runs, which ends its branch. Use `s3_object` or `kanban_card`. |
| `kanban_card` | Makes the card named by `ref` (or finds it if it exists), labelled `factory` and `wf-<slug>`. |

The run page lists the storage folders that hold a step's output and the rows that belong to the run, under Storage.

## Related

- [Runs and steps](/software-factory/runs/runs-and-steps/)
- [Run artifacts](/software-factory/runs/artifacts/)
