---
title: Data handling and retention
nav: Data handling
description: What the gateway holds in memory, what it writes and where, what it never stores, and which retention promises belong to your provider instead.
order: 1
sources:
  - ai-firewall/internal/inference/inference.go
  - ai-firewall/internal/db/inference_log.go
  - ai-firewall/internal/api/middleware.go
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/api/proxy.go
  - ai-firewall/internal/inventory/inventory.go
  - ai-firewall/internal/guardian/guardian.go
  - ai-firewall/internal/policy/engine.go
  - ai-firewall/terraform/variables.tf
  - saas/prisma/models/ai-firewall.prisma
  - saas/prisma/migrations/20260713000004_ai_firewall_logs_no_content/migration.sql
checked: [ai-firewall@339de55, saas@50cedf3]
updated: 02 Nov 2026
---

The gateway has to read a request to screen it. It does not store request or response content anywhere: not in its database, not in its logs, not in the SIEM copy. What it does write is metadata, listed below with the switch that controls each store.

## What is in memory during a request

| Item | How long |
|---|---|
| The request body (up to 8 MiB) | One request: parsed, evaluated, rewritten if a redact, strip or sealed-block rule changed it, forwarded |
| The response | Relayed as it arrives. When logging is on it passes a scanner that keeps only the token counts. Streams are relayed frame by frame and never reassembled. |
| Your decrypted provider key | Cached in process memory for up to 15 minutes (`BYOK_KEY_CACHE_TTL`), keyed by its ciphertext |
| Your organisation's HMAC secret | Cached for up to 60 seconds (`ORG_SECRET_CACHE_TTL`) |
| Your guardrails | Cached for up to 30 seconds (`POLICY_CACHE_TTL`) |

## What is written, and where

| Store | Written when | Contents | Never contains |
|---|---|---|---|
| Operational request log | Every request | Method, path, status, duration | Bodies, headers, keys |
| `AiFirewallLog` ([inference log](/ai-firewall/operations/logs/)) | Only with logging on and a Pro or higher plan | Provider, model, decision, matched rule names and types, token counts, latency, status, client name, capability hash and counts | Prompt or completion text, matched text, tool arguments or results |
| `AiFirewallInventory` ([inventory](/ai-firewall/operations/inventory/)) | Every organisation, once per configuration per hour | Tool, MCP server and skill names, MCP server URLs, client name and version | Any conversation content |
| `AiFirewallHold` | Hold for review on, when something is held | Kind, identity, client, state, times | Content |
| Software Factory source events | First sighting of a capability, each hold, each hold expiry | Kind, identity, client | Content |
| Guardian (SIEM) | Each logged inference (logging on) and each hold | The same metadata as the log row | Content |

The `AiFirewallLog` table has no prompt or completion column. A migration (`20260713000004_ai_firewall_logs_no_content`) removed them, so a future bug has no field to write content into.

A recorded violation is `policy_uuid`, `policy_name`, `rule_type`, `action` and a generic `detail` such as `content matched pattern for policy "AWS access key id"`. It never holds the text that matched, which also means a `flag` rule tells you that it matched, not what it matched.

## Retention

| Store | Retention |
|---|---|
| Request content | None; never written |
| `AiFirewallLog` | No automatic deletion. Turning logging off stops new rows; existing rows remain until the organisation is deleted. |
| `AiFirewallInventory` | Until cleared with **Clear** on the Resolve Platform or `vulnetix ai-firewall inventory --clear` |
| Guardian copy | Governed by the SIEM's own retention; see [SIEM](/siem/) |

> [!CAREFUL] The provider still has your request
> Once a request passes policy it is sent to the provider on your own account. What the provider keeps, for how long, and whether it trains on it is set by your agreement with that provider. Zero retention at the gateway does not change it. For end-to-end zero retention, you need it in the provider contract as well.

## Where the gateway runs

The hosted gateway runs on AWS ECS Fargate in `ap-southeast-2` (Sydney). Its DNS record is not proxied: TLS terminates at the AWS load balancer, so no CDN sees the traffic. Requests transit Sydney on the way to the provider. There is no regional choice; see [Jurisdictional control](/ai-firewall/security/jurisdictional-control/).

## Checking it yourself

- The log viewer and `GET /ai-firewall/logs` return every stored field. There is no prompt field to show.
- `vulnetix ai-firewall status` shows whether logging is on.
- The `X-Vulnetix-Firewall-*` response headers carry rule names and counts, never matched text.

## Related

- [Key custody](/ai-firewall/security/key-custody/)
- [Threat model](/ai-firewall/security/threat-model/)
