---
title: Search syntax
description: The Guardian search language, its pipeline stages, predicates, aggregates and time buckets, the round trip to Sigma, and the search API.
order: 1
sources: [siem/worker/src/dsl/parse.ts, siem/worker/src/dsl/lex.ts, siem/worker/src/dsl/compile.ts, siem/worker/src/dsl/sigma.ts, siem/worker/src/dsl/help.ts, siem/worker/src/sqlgen/render.ts, siem/worker/src/api/search.ts, siem/worker/wrangler.jsonc, siem/docs/dsl.md]
checked: [siem@e0f71fa]
updated: 02 Nov 2026
---

A search is a table name followed by stages separated by `|`. Searches, saved searches, alert rules, triggers and scheduled sends all compile to the same SQL and run under your organisation's scope.

```
dns_events
| where qname endswith ('.duckdns.org', '.no-ip.org', '.ddns.net') and src_ip in 10.0.0.0/8
| stats count() as hits, dc(src_ip) as sources, max(ts) as last_seen by qname, host
| where hits >= 5
| project qname, host, hits, sources, last_seen
| sort -hits
| limit 50
```

The range picker sets the time window, not the query. Searches window on event time (`ts`) and cover at most 30 days.

## Stages

| Stage | Does |
|---|---|
| `<table>` | Starts the query. One of `net_events`, `dns_events`, `waf_events`, `http_events`, `cloud_audit`, `product_events`. See [Tables](/siem/search/tables/). |
| `\| where <predicate>` | Keeps matching rows. After `stats` it filters the aggregates by their names. |
| `\| stats <agg> [as name], ... [by f, ...]` | Groups and aggregates. |
| `\| timechart <bucket> <agg> [as name], ... [by f]` | Groups by time bucket for the chart. At most one `by` field. Needs `ts`. |
| `\| project f [as name], ...` | Chooses and renames columns. |
| `\| sort [-]f, ...` | Orders. `-` is descending. |
| `\| limit n` | Caps the rows. Values above 10,000 are cut to 10,000. |
| `\| join ioc_indicators on f` | Keeps rows whose `f` is on the Vulnetix indicator list (the last two days of the snapshot). A field with `ip` in its name is matched against address indicators, any other against domains. Must come before `stats` and `project`. |

### Aggregates

| Function | Default name |
|---|---|
| `count()` | `count` |
| `dc(f)` (distinct count) | `dc_f` |
| `sum(f)`, `min(f)`, `max(f)`, `avg(f)` | `sum_f`, `min_f`, `max_f`, `avg_f` |
| `p50(f)`, `p95(f)` (approximate percentiles) | `p50_f`, `p95_f` |

A name used twice in one `stats` is an error.

### Time buckets

A bucket is a number and a unit: `s`, `m`, `h` or `d`, for example `5m`, `1h`, `1d`. `1m`, `1h` and `1d` truncate to the minute, hour or day; any other size is aligned to the Unix epoch. The bucket column is called `time`.

## Predicates

| Operator | Example | Notes |
|---|---|---|
| `==`, `!=` | `rcode == 'NXDOMAIN'` | Text comparison ignores case. |
| `>`, `>=`, `<`, `<=` | `status >= 500` | |
| `contains`, `startswith`, `endswith` | `path contains 'login'` | Case-insensitive. On a list column, `contains` matches an element. |
| `matches` | `qname matches '^[a-z0-9]{20,}\\.'` | Regular expression, case-insensitive. An invalid pattern is an error. |
| `in (list)` | `dst_port in (22, 3389)` | Any of the values. |
| `in <cidr>` | `src_ip in 10.0.0.0/8` | IPv4 only. A list of CIDRs works too. |
| `exists`, `missing` | `dst_host exists` | Not null, null. |

- Combine with `and`, `or`, `not` and parentheses.
- A list after an operator means any of them: `qname endswith ('.a', '.b')`. `!=` over a list means none of them.
- Strings are single or double quoted. A bare IPv4 address is a string.
- `_text` searches every text column of the table at once, with `==` or `contains`, before `stats` only.
- `raw.<key>` reads a field the normaliser kept in `raw`: `raw.rule_uuid == '...'`.
- A missing value never matches a comparison, and `not` of a comparison matches rows where the value is missing: `not dst_port == 22` keeps rows with no port.

## Examples

The help panel offers these and more, each with a note on what it finds. Every template compiles.

| Finds | Query |
|---|---|
| NXDOMAIN bursts (DGA) | `dns_events \| where rcode == 'NXDOMAIN' \| stats count() as misses, dc(qname) as names by src_ip, host \| where misses >= 50 \| sort -misses` |
| Indicator hits in DNS | `dns_events \| join ioc_indicators on qname \| stats count() as hits, min(ts) as first_seen by qname, host, src_ip` |
| Inbound to admin ports | `net_events \| where direction == 'ingress' and action == 'ACCEPT' and dst_port in (22, 3389, 5432, 3306, 6379, 27017) \| stats count() as flows, dc(src_ip) as sources by dst_ip, dst_port, eni` |
| WAF actions per hour | `waf_events \| timechart 1h count() by action` |
| Console login without MFA | `cloud_audit \| where source == 'cloudtrail' and event_name == 'ConsoleLogin' and mfa == false \| project ts, actor, src_ip, user_agent, error_code` |

## Switching to Sigma

The editor converts a query to Sigma and back (`POST /v1/guardian/translate`):

- A leading run of `where` stages becomes the Sigma `detection`. A plain AND over different fields is one selection; anything else is one selection per comparison with a condition of the same shape.
- `stats count()` or `stats dc(f)` followed by `where <name> >= N` becomes an `event_count` or `value_count` correlation grouped by the `by` fields, with the rule's window as its `timespan`.
- Stages Sigma has no form for (`project`, `sort`, `limit`, `timechart`, other aggregates, `join`) are kept as `# dsl: | <stage>` comment lines and restored on the way back.
- Sigma wildcards `*` and `?` in a value are escaped going to Sigma. A Sigma wildcard pattern comes back as `contains`, `startswith`, `endswith` or an anchored `matches`.
- These have no DSL form, so the rule stays Sigma and the editor says why: `|base64`, `|base64offset`, `|windash`, `|fieldref`, `N of` with N above 1, `temporal` correlations, correlations over several rules.

The answer says whether the translation was lossless and lists notes.

## API

| Method and path | Body | Returns |
|---|---|---|
| `POST /v1/guardian/search` | `{ text, mode: "dsl" \| "sigma", rangeMs \| from, to, limit }`. `rangeMs` 60,000 to 30 days, default 1 day. `limit` 1 to 10,000, default 500. `text` at most 16 KiB. | Rows, columns, shape (`rows`, `grouped`, `timechart`), chart, bytes scanned |
| `POST /v1/guardian/compile` | `{ text, mode }` | The SQL the search would run (**Show SQL**) |
| `POST /v1/guardian/translate` | `{ text, to: "sigma" \| "dsl", title, level, timespan }` | The other language, whether it was lossless, notes |
| `GET /v1/guardian/help` | | Templates, syntax and the columns of each table |

Each search is charged to the daily query budget. When the budget is used up, search answers `429` until 00:00 UTC. A query that does not compile answers `400` with the reason.
