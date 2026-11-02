---
title: Saved searches
description: Save a Guardian search with a name and a default range, use it as the source of a rule, trigger or scheduled report, and the limits that apply.
order: 2
sources: [siem/worker/src/api/searches.ts, siem/worker/src/api/rules.ts, siem/worker/src/source.ts]
checked: [siem@e0f71fa]
updated: 02 Nov 2026
---

A saved search is a named query, in the search language or Sigma, with a default time range. Save one from the search page with **Save**.

A saved search is the source of:

| Used by | How |
|---|---|
| [Scheduled reports](/siem/alerts/scheduled-reports/) | Read each time the report runs. Edits apply to the next send. |
| [Triggers](/siem/alerts/triggers/) | Read each time the trigger runs. Edits apply to the next run. |
| [Alert rules](/siem/detection/rules/) | Copied into the rule when you create it. Later edits to the search do not change the rule. A search-language search becomes a rule with source `search`; a Sigma search becomes a rule with source `tenant`. |

## Fields

| Field | Rule |
|---|---|
| `name` | Required, at most 160 characters |
| `text` | Required, at most 16 KiB. Must compile, or the save is refused with code `compile` and the reason. |
| `mode` | `dsl` (default) or `sigma` |
| `rangeMs` | Default range when opened, 60,000 ms to 30 days. Default 1 day. |

The list also shows who saved it, when it last ran and how many rows it returned.

## Limits

- An organisation keeps at most 500 saved searches. The list shows the 200 most recently changed.
- A search that a scheduled report or a trigger uses cannot be deleted (`400`, code `in_use`). Remove those first. A rule made from it does not block deletion, because the rule holds its own copy.

## API

| Method and path | Body |
|---|---|
| `GET /v1/guardian/searches` | |
| `POST /v1/guardian/searches` | `{ name, text, mode, rangeMs }`. `201 { id }` |
| `PATCH /v1/guardian/searches/{id}` | Any of `name`, `text`, `mode`, `rangeMs` |
| `DELETE /v1/guardian/searches/{id}` | |
