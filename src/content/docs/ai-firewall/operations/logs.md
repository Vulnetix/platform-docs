---
title: Inference logs
nav: Logs
description: "The opt-in, metadata-only inference log: how to turn it on, every field a row holds, what is never recorded, and how to read it in the Resolve Platform and the API."
order: 2
sources:
  - ai-firewall/internal/inference/inference.go
  - ai-firewall/internal/db/inference_log.go
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/api/evaluate.go
  - ai-firewall/internal/guardian/guardian.go
  - ai-firewall/internal/openai/usage.go
  - vdb-site/api/internal/handler/ai_firewall_logs.go
  - vdb-site/api/internal/handler/ai_firewall_log_stats.go
  - vdb-site/api/internal/handler/logs_range.go
  - vdb-api/internal/handler/v2_cli_ai_firewall_settings.go
  - cli/cmd/ai_firewall_policy.go
  - saas/prisma/models/ai-firewall.prisma
  - website/src/components/ai-firewall/OverviewTab.vue
  - website/src/pages/resolve/logs.vue
checked: [ai-firewall@339de55, vdb-site@1a06d67, vdb-api@4145f0a, cli@4c8c3b7, saas@50cedf3, website@ad775f3]
updated: 02 Nov 2026
---

With inference logging on, the gateway writes one `AiFirewallLog` row per inference: the model, the policy decision, which rules matched, token counts and latency. It is off by default. Prompts and completions are never recorded, with logging on or off: the table has no column for them.

## Turning it on

| Where | How |
|---|---|
| Resolve Platform | **Inference logging** card on the Overview tab of the [AI Firewall page](https://www.vulnetix.com/resolve/ai-firewall) |
| CLI | `vulnetix ai-firewall settings --logs` (on), `--no-logs` (off) |
| Policy file | `spec.settings.logsEnabled: true` in [`.vulnetix/ai-firewall.yaml`](/ai-firewall/reference/policy-file/#specsettings) |
| Check | `vulnetix ai-firewall status` prints `Inference logging  on` or `off` |

Turning it on needs a paid plan. The CLI API answers `403 inference logging requires a paid plan`; the Resolve Platform answers with a plan-locked marker and the setting stays off. Turning it off is never gated. The gateway checks the plan again on every request, so an organisation that downgrades with the flag still on stops writing rows.

## What a row holds

| Field | Value |
|---|---|
| `providerSlug` | Provider the request went to; `workers-ai` for [evaluate](/ai-firewall/reference/api/#evaluate) calls |
| `model` | Model id as sent. Empty for a provider refusal, which happens before the body is read. |
| `decision` | `allow`, `flag`, `redact` or `block` |
| `blockedBy` | The blocking rule's name, or `provider_policy`, `provider_key_missing`, `model_policy`, `upstream_blocked`, `upstream_redirect` |
| `violations` | JSON array of matched rules: `policy_uuid`, `policy_name`, `rule_type`, `action`, `detail`. Never the matched text. |
| `wire` | `chat`, `responses`, `messages` or `kiro` |
| `inspected` | How many text units the guardrails read. `0` against a non-empty rule set means the request was parsed but nothing in it was screened. |
| `statusCode` | Status returned to the client |
| `promptTokens`, `completionTokens` | From the provider's usage report, when it sent one |
| `stream` | Whether the request streamed |
| `latencyMs` | Gateway to provider and back |
| `clientName`, `clientVersion` | The calling agent from its headers. Attribution, not proof. |
| `contextHash` | The capability set the request declared; joins to the [inventory](/ai-firewall/operations/inventory/) |
| `toolCount`, `mcpCount` | How many tools and MCP servers the request declared |
| `createdAt` | Epoch milliseconds |

`count_tokens` requests and refusals before the model is known (bad org, bad key, unknown provider, unparseable body) write no row. Provider refusals do, with an empty model.

> [!CAREFUL] Streamed chat requests have no token counts by default
> A Chat Completions stream reports usage only when the client sends `"stream_options": {"include_usage": true}`. The gateway does not add it, so rows for streams without it have empty token counts.

## What is never recorded

- Prompt or completion text, tool arguments or tool results.
- The text a guardrail matched or redacted.
- Request or response headers, including keys.

The gateway's own operational log line for each request holds method, path, status and duration.

## Where rows also go

While logging is on, each row is also forwarded, best effort, to Guardian, the Vulnetix SIEM, as a `product_events` row. Every capability the hold for review holds is forwarded too, whether or not logging is on. Rows wait in a bounded in-memory buffer and are dropped if a post fails; the database row stays the record. Guardian drops rows for organisations below its own plan. See the [SIEM docs](/siem/).

## Reading logs

The Resolve Platform's [Logs page](https://www.vulnetix.com/resolve/logs#aifw) has an AI Firewall stream with decision charts, the top blocking rules, providers and clients, and a paged table. The range is `24h`, `7d`, `30d` (default) or `90d`.

Resolve Platform API, session-authenticated, under `https://www.vulnetix.com/api/site/v1`:

| Request | Parameters | Returns |
|---|---|---|
| `GET /ai-firewall/logs` | `page` (from 1), `per_page` (1 to 50, default 10), `decision` (`allow`, `block`, `redact`, `flag`), `provider`, `client` (`unknown` matches rows with no client), `model` (substring) | `{"entries": [...], "pagination": {"page", "perPage", "totalRows", "totalPages"}}`, newest first |
| `GET /ai-firewall/logs/stats` | `range` (`24h`, `7d`, `30d`, `90d`; anything else is `30d`), `provider`, `client`, `model` | `buckets` (hourly for 24h, daily otherwise, counts per decision), `guardrails` (top 8 blocking or redacting rules), `providers`, `clients` (top 8 each), `totals` (`inferences`, `blocked`, `redacted`, `flagged`, `streamed`, `promptTokens`, `completionTokens`, `latencyP95`) |

Rows exist only for the time logging was on.

## Retention

No job in the gateway, the Resolve Platform API or the schema deletes `AiFirewallLog` rows. Rows are deleted with the organisation (`ON DELETE CASCADE`). There is no per-organisation retention setting.

## Related

- [Usage and activity](/ai-firewall/operations/usage/)
- [Data handling](/ai-firewall/security/data-handling/)
- [Policy file reference](/ai-firewall/reference/policy-file/)
