---
title: Alerts
description: What a Guardian alert is, row and group alerts, statuses, the messaging events and their payload, severity mapping, and email delivery.
order: 1
sources: [siem/worker/src/rules/alerts.ts, siem/worker/src/rules/run.ts, siem/worker/src/api/alerts.ts, siem/docs/rules.md]
checked: [siem@e0f71fa]
updated: 02 Nov 2026
---

An alert is a match of an [alert rule](/siem/detection/rules/). Alerts are listed on **Guardian > Rules** and sent as messaging events.

## Row and group alerts

| Kind | From | One alert per |
|---|---|---|
| `row` | A rule with no correlation or threshold | Matching row (keyed on rule and `event_id`) |
| `group` | A correlation, a threshold, or a search with `stats` | Open group. Inside the rule's quiet period (`suppressSec`, default 900 s) the open alert grows: its count and last seen update. After it, the old alert closes and a new one opens. |
| overflow | Any rule that matched more than `maxAlertsPerRun` in one run | Run. Says how many more matched (`<n>+`). The loudest groups are alerted first. |

## Statuses

| Status | Set by |
|---|---|
| `open` | New alerts |
| `acked` | A person acknowledged it |
| `closed` | A person closed it, or a group alert's quiet period ended |

Reopening a group alert while another is open for the same group is refused with `409`.

## Messaging events

Each new alert is a `siem.alert.<severity>` event through your organisation's messaging routes, and also straight to the rule's target connections when it has any.

| Rule `level` | Event | Severity |
|---|---|---|
| `informational` | `siem.alert.info` | `info` |
| `low` | `siem.alert.notice` | `notice` |
| `medium` | `siem.alert.warning` | `warning` |
| `high`, `critical` | `siem.alert.critical` | `critical` |

A rule's `severityOverride` replaces the mapped severity.

The payload carries:

| Key | Meaning |
|---|---|
| `headline` | Rule name and up to three identifying values, e.g. `Dynamic DNS lookup: qname x.duckdns.org, host web-1` |
| `detail` | One line on what matched |
| `alertUuid`, `ruleUuid`, `ruleName`, `sigmaId` | Identifiers |
| `level`, `logsource`, `table`, `kind` | The rule's level and source table; `row` or `group` |
| `count`, `firstSeen`, `lastSeen` | Matches and event-time span |
| `host` | From the row, when present |
| `subject` | The row or group, reduced: no `raw`, at most 16 keys, values cut at 200 characters |
| `link` | The alert in the Resolve Platform |

The event's dedupe key is the alert's key, so a repeat delivery is dropped.

## Rule health events

| Event | When |
|---|---|
| `siem.rule.failed` | Third refused run in a row (rule goes `erroring`), and again at the eighth (rule turned off) |
| `siem.rule.recovered` | A clean run after `erroring` |
| `siem.rule.budget_exhausted` | The day's query budget is used up. Once per day. |

## Email

A rule with email targets sends one email per run listing that run's new alerts. Emails come from the Vulnetix mail sender.

## API

| Method and path | Notes |
|---|---|
| `GET /v1/guardian/alerts?status=&rule=&before=&since=` | 100 a page, newest first. `next` is the `before` value for the next page. `last24h` counts alerts by level. |
| `PATCH /v1/guardian/alerts/{id}` | `{ "status": "open" \| "acked" \| "closed" }` |
