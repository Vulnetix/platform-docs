---
title: Alert rules
description: Where Guardian alert rules come from, how often they run and over which window, their settings and limits, tuning with thresholds and suppressions, statuses, and testing and backfill.
order: 1
sources: [siem/worker/src/api/rules.ts, siem/worker/src/rules/run.ts, siem/worker/src/rules/model.ts, siem/worker/src/rules/compile.ts, siem/worker/src/rules/alerts.ts, siem/worker/src/sigma/tune.ts, siem/worker/src/sigmahq.ts, siem/worker/migrations/0001_init.sql, siem/docs/rules.md]
checked: [siem@e0f71fa]
updated: 02 Nov 2026
---

An alert rule is a query that runs on a schedule over your events. Each match becomes an [alert](/siem/alerts/alerts/), sent to your messaging routes, to named connections, or by email.

## Rule sources

| `source` | What it is | Editable text |
|---|---|---|
| `tenant` | Sigma YAML you wrote or uploaded, or a saved search in Sigma mode | Yes |
| `search` | A copy of a saved search in the search language. A search with `stats` alerts per group. | No; make a new rule |
| `sigmahq` | A rule from the SigmaHQ catalogue | No; tune it |
| `countermeasure` | A Vulnetix detection rule of kind Sigma, by reference (see [Virtual patching](/virtual-patching/)) | No; tune it |
| `ioc` | `ioc-dns` (**Indicator domain resolved**, `dns_events.qname`) or `ioc-net` (**Connection to an indicator address**, `net_events.dst_ip`) against the indicator snapshot. Both `critical`. | No |

The **catalogue** on the Rules page lists the SigmaHQ rules that compile and the two indicator rules (`GET /v1/guardian/catalogue?q=`). Each Monday at 04:00 UTC Guardian imports the latest SigmaHQ commit (up to 600 files, Detection Rule License 1.1) from these folders: `rules/network/dns`, `rules/network/firewall`, `rules/network/zeek`, `rules/web/proxy_generic`, `rules/web/webserver_generic`, `rules/cloud/aws/cloudtrail`. Only rules that compile are offered. Turning on the same catalogue rule twice is refused with code `exists`.

A countermeasure rule re-reads its body on every run. When the upstream body changes, Guardian replaces the base text and keeps your suppressions and threshold.

### Upload

**Upload** (`POST /v1/guardian/rules/upload`) takes 1 to 200 Sigma files as `{ files: [{ name, text }], enabled }`. Uploaded rules are off unless `enabled` is `true`. Each file comes back with its status and, if it does not compile, the reason. A file may hold several YAML documents (a correlation and the rules it names).

## Settings

| Setting | Range | Default | Meaning |
|---|---|---|---|
| `level` | `informational`, `low`, `medium`, `high`, `critical` | from the rule, else `medium` | |
| `severityOverride` | `info`, `notice`, `warning`, `critical`, or empty | empty | Messaging severity instead of the one mapped from `level` |
| `intervalSec` | 60 to 3600 | 60 | How often the rule runs |
| `latenessSec` | 0 to 3600 | 300 | Overlap with the previous window, for rows that arrive late |
| `suppressSec` | 0 to 604800 | 900 | Quiet period for a group alert |
| `maxAlertsPerRun` | 1 to 1000 | 50 | Alerts per run. Past it, one extra alert says how many more matched. |
| `threshold` | `{ count: 1-1000000, windowSec: 60-86400, by: [up to 5 fields] }` or `null` | none | Wraps the detection as an `event_count` correlation |
| `target` | `{ connections: [up to 10], emails: [up to 20] }` | none | Send alerts straight to these, as well as through your messaging routes |
| `enabled` | | `true` on create | A rule that does not compile cannot be turned on |

Your pack caps how many rules are enabled at once: 50, 200, 500 or 2000 ([Packs and limits](/siem/reference/packs-and-limits/)). Turning on one more is refused with code `limit`.

## When a rule runs

- **Window end.** Each run reads up to now minus 120 seconds, so it never reads data that may not be committed yet.
- **Row rules** (no correlation) window on `ingested_at`, from the last run's end minus `latenessSec`, up to one hour per run.
- **Group rules** (correlations and thresholds) window on event time `ts`, reaching back their timespan.
- **Exactly once.** A row alert is keyed on the rule and the row's `event_id`, so the lateness overlap and a re-run never alert twice. A group alert is one open alert per group: inside `suppressSec` it grows (count and last seen), after it the old alert closes and a new one opens.
- **Cost.** Each run is charged to the daily query budget. A rule whose runs scan more than 512 MiB on average runs proportionally less often, up to hourly. When the budget is used up, runs are skipped (`skipped_budget`, checked again every 10 minutes) until 00:00 UTC, and Guardian sends `siem.rule.budget_exhausted` once that day.

## Statuses

| Status | Meaning |
|---|---|
| `active` | Compiles and runs |
| `invalid` | No longer compiles (or its countermeasure was deleted). The reason is shown beside the rule. |
| `no_table` | Its Sigma logsource has no Guardian table (`process_creation`, `file_event`, `registry_*`). Never runs. |
| `erroring` | Three warehouse refusals in a row. Guardian sends `siem.rule.failed`. Still retried. |
| `disabled_error` | Eight in a row. Turned off, and `siem.rule.failed` is sent again. |
| `paused_budget` | Guardian is not active for the organisation. Retried hourly. |

A refused query backs off 30 s, then four times longer each time, at most 6 hours. A warehouse outage (`429`, `5xx`, timeout) is retried in a minute and does not count. When a rule runs cleanly after `erroring`, Guardian sends `siem.rule.recovered`.

## Tuning

Tune a catalogue or countermeasure rule without forking it, so it keeps following its upstream:

| Lever | Effect |
|---|---|
| Threshold | Alert only when `count` rows match in `windowSec`, grouped by `by` |
| Suppression | `{ field, value, until }`. Written into the rule text as a `filter_<n>` selection with `and not filter_<n>` on the condition, and a `# tuning:` comment naming who added it and when. `until` is a date like `2026-12-31`. At most 50 per rule. |
| Quiet period, interval, cap | The settings above |

Only `tenant` rules accept a new `rawText`. Editing any other kind is refused with "tune a catalogue rule with suppressions and a threshold".

## Test and backfill

| Action | Does |
|---|---|
| **Test** (`POST /rules/{id}/test`, `{ minutes }`) | Runs the rule over the last 1 to 1440 minutes (default 60) and returns the rows. Writes no alerts. |
| **Backfill** (`POST /rules/{id}/backfill`, `{ from }`) | Moves the rule's watermark back to `from` (epoch ms; at most 7 days back, default 1 day) so the next runs cover that span. Writes alerts, still deduplicated. |
| **Runs** (`GET /rules/{id}/runs`) | The last 50 runs: window, status (`ok`, `error`, `skipped_budget`, `skipped_nothing_new`), rows returned, alerts created and merged, overflow, bytes scanned or estimated, duration, error |

A rule a trigger uses cannot be deleted (`in_use`).

## Create with the API

```sh
curl -sS https://guardian.vulnetix.com/v1/guardian/rules \
  -H "Authorization: Bearer $GUARDIAN_ACCESS_TOKEN" -H 'Content-Type: application/json' \
  --data @- <<'EOF'
{
  "source": "tenant",
  "rawText": "title: Dynamic DNS lookup\nid: 6f3e0c52-0d4b-4c8e-9a51-2a6b9a0e7d10\nlevel: medium\nlogsource:\n  category: dns_query\ndetection:\n  selection:\n    QueryName|endswith:\n      - .duckdns.org\n      - .no-ip.org\n  condition: selection\n"
}
EOF
```

Other sources take `{ "source": "search", "searchId": "..." }`, `{ "source": "sigmahq" | "countermeasure", "ruleRef": "..." }` or `{ "source": "ioc", "ruleRef": "ioc-dns" }`. `$GUARDIAN_ACCESS_TOKEN` is a Resolve Platform sign-in access token; see [API](/siem/reference/api/#authentication).
