---
title: SIEM troubleshooting
nav: Troubleshooting
description: The Guardian errors you are most likely to meet when shipping logs, searching, and running rules, triggers and sends, with the cause and the fix.
order: 50
sources: [siem/worker/src/ingest/gate.ts, siem/worker/src/ingest/routes.ts, siem/worker/src/api/context.ts, siem/worker/src/billing/entitlement.ts, siem/worker/src/api/search.ts, siem/worker/src/api/searches.ts, siem/worker/src/api/rules.ts, siem/worker/src/api/triggers.ts, siem/worker/src/api/sends.ts, siem/worker/src/api/sources.ts, siem/worker/src/dsl/compile.ts, siem/worker/src/sqlgen/render.ts, siem/worker/src/sigma/compile.ts]
checked: [siem@7420fbebd]
updated: 04 Nov 2026
---

Guardian's console API answers errors as `{ "error": "<message>", "code": "<code>" }`; the Resolve Platform shows the message. Ingest answers senders with a status code that Firehose and Logpush act on, and records the reason as the token's **Last error** on **Guardian > Sources**. The codes are listed on [API](/siem/reference/api/#access).

## Access and plan

| Symptom or message | Cause | Fix |
|---|---|---|
| `Guardian is an add-on to Business. Choose an ingest pack to start.` (`402`, `needs: pack`), or `Guardian needs the Business plan.` (`needs: business`) | No active ingest pack, or the plan is below Business | An owner or admin presses **Start Guardian**. See [Packs and limits](/siem/reference/packs-and-limits/#buy-change-cancel). |
| `Sign in again.` (`401`, code `sign_in`) | The Resolve Platform session's access token is missing, invalid or expired | Sign in to the Resolve Platform again. Vulnetix API keys are not accepted on the Guardian API. |

## Shipping logs

| Symptom or message | Cause | Fix |
|---|---|---|
| `401` at ingest (Firehose parks batches; Logpush marks the job failing) | The token is unknown, revoked, or of another kind. An `aws` token on the Cloudflare or events route is refused. | Create a token of the matching kind and update the stack parameter or the job destination. See [Kinds](/siem/sources/ingest-tokens/#kinds). |
| Last error: `Today's ingest is over one and a half times the pack's daily cap. ...` (`429`, `ingest_cap`) | Today's ingest passed 150% of the pack's cap | Wait until 00:00 UTC, choose a larger pack, or drop a high-volume dataset such as `http_requests`. See [The daily ingest cap](/siem/reference/packs-and-limits/#the-daily-ingest-cap). |
| Last error: `<n> flow records were not in a format Guardian reads` | The flow log uses a custom format Guardian does not parse | Use the stack's flow log format or the default 14-field format. See [Flow log format](/siem/sources/aws/#flow-log-format). |
| `cloud_audit` is empty or has no read calls | EventBridge gets CloudTrail events only while a trail logs them, and never read-only calls | Make sure a trail logs management events in the region, and deploy the stack with `SendCloudTrail=true` in every region. See [CloudTrail needs a trail](/siem/sources/aws/#the-delivery-stack). |
| Cloudflare: `The zone's <plan> plan does not include Logpush for <dataset>. ...` | Cloudflare refused the job, often worded as "exceeded max jobs allowed" | Push only datasets your Cloudflare plan offers. See [Datasets](/siem/sources/cloudflare/#datasets). |

## Searching

| Symptom or message | Cause | Fix |
|---|---|---|
| `field: "<name>" is not a column here; available: ...` | A misspelt column, or a column dropped by an earlier `stats` or `project` | Use a listed column, or read a non-column field with `raw.<key>`. See [Search syntax](/siem/search/syntax/). |
| `Today's query budget is used up. It resets at 00:00 UTC.` (`429`, `budget`) | Searches, rules, triggers and sends have scanned the pack's daily budget | Wait for 00:00 UTC, narrow ranges, or choose a larger pack. **Usage** shows what scanned the most. See [The query budget](/siem/reference/packs-and-limits/#the-query-budget). |

## Rules, triggers and sends

| Symptom or message | Cause | Fix |
|---|---|---|
| A rule is `invalid`, or the save fails with code `compile` | The rule no longer compiles, or uses something Guardian refuses: a field the table does not store, an unsupported aggregation, a chained correlation | Read the reason beside the rule. See [What is refused](/siem/detection/sigma/#what-is-refused). |
| `the plan runs at most <n> rules at once` (code `limit`; also triggers, and `the plan keeps at most <n> scheduled sends`) | The pack's cap on enabled rules, triggers or sends is reached | Turn one off, or choose a larger pack. See [Packs](/siem/reference/packs-and-limits/#packs). |
| `a trigger still uses this rule; remove it first`, or `a scheduled send or a trigger still uses this search; remove those first` (code `in_use`) | The rule or search is a trigger's or send's source | Delete or repoint the trigger or send first |
| A rule goes `erroring`, then `disabled_error`; `siem.rule.failed` arrives | The warehouse refused the rule's query three, then eight, times in a row | Open **Runs** for the error, fix the rule, and turn it on again. See [Statuses](/siem/detection/rules/#statuses). |
| A trigger never fires | No group reached `minRows` in `windowSec`, or it is in `cooldownSec`, outside `hours`, or past `maxPerHour` | Run **Dry run** to see how often the levers would have fired in the last 24 hours. See [Dry run](/siem/alerts/triggers/#dry-run). |
| A scheduled send never arrives | `whenEmpty` is `skip` and the search returned no rows | Set `whenEmpty` to `all_clear`, or **Preview** the next message. See [Rows](/siem/alerts/scheduled-reports/#rows). |

## Still stuck

Collect the exact error message and `code`, the request id Firehose recorded for a failed batch, the token prefix and **Last error** from **Guardian > Sources**, and for a rule its last entries from **Runs** (`GET /v1/guardian/rules/{id}/runs`). For a search, **Show SQL** gives the query Guardian ran.
