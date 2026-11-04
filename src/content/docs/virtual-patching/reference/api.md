---
title: API reference
description: The Resolve Platform API routes for detection rule feeds, the defence catalogue and the runtime sensor, with bodies, limits and status codes.
order: 2
nav: API
sources: [vdb-site/api/main.go, vdb-site/api/internal/handler/detection_rule_feeds.go, vdb-site/api/internal/handler/detection_rule_feeds_publish.go, vdb-site/api/internal/handler/defences.go, vdb-site/api/internal/handler/entitlements.go, vdb-site/docs/runtime-sensor-api.md]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

Base URL: `https://www.vulnetix.com/api/site/v1`. Every route here needs a signed-in Resolve Platform session or an organisation API key. Errors are `{"error": "<message>"}`.

Below the required plan, list and read routes answer `200` with an empty result and:

```json
{ "planLocked": true, "feature": "…", "requiredPlan": "pro", "proOnly": true }
```

## Detection rule feeds

| Method and path | Body | Answer |
|---|---|---|
| `GET /detection-rule-feeds` | | `{feeds: [...]}` |
| `POST /detection-rule-feeds` | `{name, description?, feedType, schemaVersion?}` | `{uuid, feedType}`. New feeds are `DRAFT`. |
| `GET /detection-rule-feeds/{uuid}` | | `{feed, entries}` |
| `PATCH /detection-rule-feeds/{uuid}` | any of `{name, description, schemaVersion}` | `{ok: true}`. The type cannot change. |
| `DELETE /detection-rule-feeds/{uuid}` | | `{ok: true}` |
| `POST /detection-rule-feeds/{uuid}/entries` | `{items: [{ruleTable, ruleType, ruleUuid, matchedCve?}]}` | `{added, skipped: ["<uuid> (<reason>)"]}` |
| `PATCH /detection-rule-feeds/{uuid}/entries/{id}` | `{disabled: true \| false}` | `{ok: true}` |
| `DELETE /detection-rule-feeds/{uuid}/entries/{id}` | | `{ok: true}` |
| `POST /detection-rule-feeds/{uuid}/publish` | | `{publicBaseUrl, manifestUrl, …}` |
| `POST /detection-rule-feeds/{uuid}/revoke` | | `{ok: true}`. Files are deleted at once. |

| Field | Values |
|---|---|
| `feedType` | `SNORT`, `SURICATA`, `MODSECURITY`, `NGINX`, `AWS_WAF`, `CLOUDFLARE_WAF`, `REGEX_L7`, `SIGMA`, `YARA`, `STIX`, `OPENIOC`, and legacy `SNORT_YARA`. Case-insensitive. |
| `ruleTable` | `virtual_patch`, `countermeasure`, `snort_rule`, `yara_rule`. Required except in a `SNORT_YARA` feed. |
| `ruleType` | The rule's format, from the `feedType` list. Must be one the feed accepts. |
| `schemaVersion` | `1` |

### Feed status codes

| Code | Message | When |
|---|---|---|
| 400 | `name is required` | Create without a name |
| 400 | `feedType is required` | Create without a type |
| 400 | `unsupported feed type` | A type not in the list |
| 400 | `unsupported schema version` | Anything but `1` |
| 400 | `items is required` | Empty entries body |
| 400 | `a feed holds at most 500 rules; this feed already has <n>` | Over the entry cap |
| 400 | `add at least one rule before publishing` | Publish an empty feed |
| 400 | `remove or replace rules no longer available: <names>` | A rule was removed from the catalogue |
| 400 | `no rule content could be built for this feed` | Every rule's body was empty or unusable |
| 401 | `not authenticated` | No session or key |
| 403 | `<plan> plan allows <n> <type> feed(s); you already have <n>` | Over the per-type cap |
| 404 | `not found` | Not your organisation's feed |
| 500 | `failed to publish <file>` | A storage write failed. The previous files were already cleared, so publish again before subscribers fetch. |

Skipped entries name the reason: `<TYPE> cannot go in a <FEEDTYPE> feed`, `ruleTable is required for a <FEEDTYPE> feed`, `unsupported rule type`, `not found`. Adding a rule already in the feed is a no-op.

## Defence catalogue

| Method and path | Query | Answer |
|---|---|---|
| `GET /defences` | `lane` (`block` or `detect`; both by default), `kind` (repeatable), `cve` (repeatable), `q` (title or description), `page` (default 1), `perPage` (1 to 200, default 25) | Virtual patches and countermeasures. Counts for any plan; `rawText` only on Pro. |
| `GET /defences/{lane}/{uuid}` | | One rule with its body (Pro) |
| `GET /scanner-results/finding/{findingUuid}/defences` | | The defences for one finding |

`lane` also accepts `virtual-patch`, `virtual-patches`, `countermeasure` and `countermeasures`. A bad `lane` is `400 lane must be block or detect`.

The CLI's `vulnetix defend` uses the VDB API instead (`/v2/defences/counts`, `/v2/vuln/{id}/{virtual-patches|countermeasures}`, `/v2/{virtual-patches|countermeasures}/{uuid}/archive`); see the [VDB API](/vdb-api/).

## Runtime sensor

| Method and path | Who | Does |
|---|---|---|
| `POST /runtime/sensors/register` | sensor | Register and report facts and rule load results |
| `POST /runtime/events` | sensor | Report matches and holds |
| `GET /runtime/decisions?since=&sensorKey=&wait=` | sensor | Long-poll for decisions |
| `POST /runtime/inventory` | sensor | Report loaded packages |
| `GET /runtime/sensors` | console | The fleet, most recently seen first, with compiled, rejected and blocking rule counts |
| `GET /runtime/events?resolution=pending&ruleUuid=&limit=` | console | Holds and matches. `resolution=pending` is live holds, soonest to expire first. `limit` 1 to 500, default 100. |
| `POST /runtime/decisions` | person | Decide; add `eventUuid` to resolve a hold. `404`, `400` or `409` when the event is not yours, not about that rule, or no longer pending. |
| `POST /runtime/decisions/{uuid}/revoke` | person | Withdraw a decision; sensors drop it on their next poll |
| `GET /runtime/rule-stats?ruleUuid=a,b` | console | Per rule (1 to 200 ids): sensors compiling, blocking or rejecting it, and 30 days of hits, blocks and false positives |
| `GET /runtime/packages?name=&version=` | console | Where a package is loaded across the fleet. Stale-loaded first. |

Decision POSTs need a signed-in person, so a sensor's credentials can never release its own hold.

| Decision | Event resolution |
|---|---|
| `block` | `confirmed_block` |
| `allow` with a subject | `allowed_once` |
| `allow` with `*` | `false_positive` |
