---
title: Usage and activity
nav: Usage
description: Where the AI Firewall reports traffic, decisions, token use and guardrail hits, what each figure is built from, and why every figure needs inference logging on.
order: 4
sources:
  - vdb-site/api/internal/handler/ai_firewall_stats.go
  - vdb-site/api/internal/handler/ai_firewall_log_stats.go
  - vdb-site/api/internal/handler/logs_range.go
  - website/src/components/ai-firewall/OverviewTab.vue
  - website/src/components/ai-firewall/GuardrailsTab.vue
  - website/src/components/ai-firewall/GovernTab.vue
  - ai-firewall/internal/api/handlers.go
checked: [vdb-site@1a06d67, website@ad775f3, ai-firewall@339de55]
updated: 02 Nov 2026
---

Every usage figure the Resolve Platform shows is computed from [inference log](/ai-firewall/operations/logs/) rows. With logging off there are no rows and the charts are empty; turning logging on does not backfill. The [capability inventory](/ai-firewall/operations/inventory/) is the one view that fills without logging.

The gateway does not meter, bill or cap usage. Token counts are the provider's own usage report read off the response; your provider bills you directly on your own key.

## Where figures appear

| Place | Figures | Window |
|---|---|---|
| Overview tab of the [AI Firewall page](https://www.vulnetix.com/resolve/ai-firewall) | Weekly gateway activity: total, blocked, redacted and flagged inferences | 52 weeks |
| Govern tab | Requests refused by provider or model policy, per week | 52 weeks |
| Guardrails tab | Hits per guardrail with its action | 30 days |
| AI Firewall stream on the [Logs page](https://www.vulnetix.com/resolve/logs#aifw) | Decisions per bucket, top blocking or redacting rules, top providers and clients, totals | `24h`, `7d`, `30d`, `90d` |

## GET /ai-firewall/stats

Session-authenticated, `https://www.vulnetix.com/api/site/v1/ai-firewall/stats`. No parameters.

| Field | Content |
|---|---|
| `totalHistogram` | Inferences per ISO week, last 52 weeks |
| `blockedHistogram`, `redactedHistogram`, `flaggedHistogram` | The same, per decision. Kept apart so blocked is never inflated by softer interventions. |
| `refusedPolicyHistogram` | Weekly count of rows with `blockedBy` `model_policy` or `provider_policy`, zero-filled. Omitted if its query fails. |
| `guardrailHits` | Per guardrail over the last 30 days: `policyUuid`, `name`, `action`, `count`. Omitted if its query fails. |

A failing series is logged and left empty; the response is still `200`.

## GET /ai-firewall/logs/stats

`range` is `24h` (hourly buckets), `7d`, `30d` or `90d` (daily buckets); anything else is `30d`. `provider`, `client` and `model` filter as on the log list. The decision filter is ignored, because the decision split is what the chart shows.

| Field | Content |
|---|---|
| `buckets[]` | `t` (bucket start, epoch ms), `allow`, `flag`, `redact`, `block` |
| `guardrails[]` | Top 8 `blockedBy` values among `block` and `redact` rows, as `name`, `count` (`unnamed` when empty) |
| `providers[]`, `clients[]` | Top 8 each; a row without a client name counts as `unknown` |
| `totals` | `inferences`, `blocked`, `redacted`, `flagged`, `streamed`, `promptTokens`, `completionTokens`, `latencyP95` (ms) |

## Reading the figures

- **Blocked versus refused.** A guardrail block is a `block` decision with the rule name in `blockedBy`. A provider or model refusal is also `block`, with `blockedBy` `provider_policy`, `provider_key_missing` or `model_policy`; the Govern tab's series isolates the policy ones.
- **Token totals under-count streams.** Streamed Chat Completions without `stream_options.include_usage` report no tokens, and `count_tokens` calls are never logged.
- **Clients are self-reported.** The client split comes from request headers.

## Related

- [Inference logs](/ai-firewall/operations/logs/)
- [Limitations and roadmap](/ai-firewall/reference/limitations-and-roadmap/)
