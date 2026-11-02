---
title: Scheduled reports
description: Send a saved search on a schedule to email or messaging connections; schedule options, time zones, row windows, empty results, formats and limits.
order: 3
nav: Scheduled reports
sources: [siem/worker/src/api/sends.ts, siem/worker/src/sends/run.ts, siem/worker/src/sends/render.ts, siem/worker/src/schedule.ts, siem/docs/triggers.md]
checked: [siem@e0f71fa]
updated: 02 Nov 2026
---

A scheduled send runs a [saved search](/siem/search/saved-searches/) on a schedule and sends one message with what it returns. Manage them on **Guardian > Sends**.

## Schedule

| Field | Values | Default |
|---|---|---|
| `repeat` | `hourly`, `every_6h`, `daily`, `weekly`, `monthly` | `daily` |
| `at` | `HH:MM`, 24-hour | `08:00` |
| `zone` | An IANA time zone, e.g. `Australia/Melbourne` | `UTC` |
| `weekday` | 0 (Sunday) to 6, for `weekly` | 1 |
| `monthday` | 1 to 28, for `monthly` | 1 |

`hourly` runs on the hour. Daylight saving is handled in `zone`.

## Rows

| Field | Meaning | Default |
|---|---|---|
| `rowsWindowMs` | How far back the search reads, on event time. 1 hour to 31 days. | 1 day |
| `sincePrevious` | Read from the previous send instead, so no row is reported twice | `false` |
| `whenEmpty` | `skip` sends nothing; `all_clear` sends a message saying there were no rows | `skip` |

## Format

`format` is `{ layout, rows, csv, link, query }`.

| Key | Values | Default |
|---|---|---|
| `layout` | `table_chart`, `table`, `summary` | `table_chart` |
| `rows` | Rows in the message, 1 to 100 | 20 |
| `csv` | Attach a CSV of up to 1,000 rows (email only) | `true` |
| `link` | Link to the search in the console | `true` |
| `query` | Include the query text | `false` |

## Destinations

`destination` is `{ kind, connections, emails, subject }`.

| `kind` | Sends | Limits |
|---|---|---|
| `email` | HTML with an inline bar chart of the first measure, the table and the CSV | 1 to 20 addresses |
| `messaging` | One `siem.report` event at severity `info`, with the first 20 rows | 1 to 10 of your connections |

`subject` (at most 160 characters) defaults to the send's name.

Values in HTML are escaped. A CSV cell that starts with `=`, `+`, `-`, `@`, a tab or a carriage return is prefixed with `'` so a spreadsheet does not run it as a formula.

## Limits

Your pack caps enabled sends at 25, 100, 250 or 1000. Each send is charged to the daily query budget like any search.

## API

| Method and path | Notes |
|---|---|
| `GET /v1/guardian/sends` | |
| `POST /v1/guardian/sends` | `{ name, searchId, repeat, at, zone, weekday, monthday, rowsWindowMs, sincePrevious, whenEmpty, destination, format, enabled }`. `201 { id }` |
| `PATCH /v1/guardian/sends/{id}` | Any of the fields |
| `DELETE /v1/guardian/sends/{id}` | |
| `POST /v1/guardian/sends/{id}/preview` | The next message, without sending it |
| `POST /v1/guardian/sends/{id}/send-now` | Sends within a minute |

```json
{
  "name": "Weekly WAF blocks",
  "searchId": "<saved search id>",
  "repeat": "weekly", "weekday": 1, "at": "08:00", "zone": "Australia/Melbourne",
  "rowsWindowMs": 604800000,
  "whenEmpty": "all_clear",
  "destination": { "kind": "email", "emails": ["secops@example.com"] },
  "format": { "layout": "table_chart", "rows": 20, "csv": true }
}
```
