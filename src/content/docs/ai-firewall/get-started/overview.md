---
title: AI Firewall overview
nav: Overview
description: The AI Firewall is a multi-provider LLM gateway at guardrails.vulnetix.com that applies your organisation's provider, model, guardrail and agent-capability policy to every request before forwarding it with your own provider key.
order: 1
sources:
  - ai-firewall/README.md
  - ai-firewall/internal/api/server.go
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/plan/plan.go
  - vdb-api/internal/handler/ai_firewall_rules.go
  - website/src/pages/resolve/ai-firewall-tabs.ts
checked: [ai-firewall@339de55, vdb-api@4145f0a, website@ad775f3]
updated: 02 Nov 2026
---

The AI Firewall is a gateway at `https://guardrails.vulnetix.com`. You point an LLM client's base URL at it instead of at the provider and give it your Vulnetix API key instead of the provider key. The gateway checks the request against your organisation's policy, swaps in the provider key it holds for you, and forwards the request. Streaming responses are relayed as server-sent events.

```text
https://guardrails.vulnetix.com/{provider}/{orgUuid}/v1      OpenAI-shaped SDKs
https://guardrails.vulnetix.com/anthropic/{orgUuid}          Anthropic SDKs (no /v1)
```

The whole configuration is a base URL and an API key, so any client that lets you change those two settings can be firewalled. No custom headers are needed.

## What happens to a request

Each step can end the request with its own status and `code`. All codes are on [Error reference](/ai-firewall/reference/errors/).

1. **Provider.** The first path segment names the provider. Unknown is `404 unknown_provider`; disabled in the catalog is `403 provider_disabled`.
2. **Surface.** The provider must serve the route you called (`chat/completions`, `responses` or `messages`). If not, `404 unsupported_api` with the route to use instead. This runs before authentication so a wrong base URL says so.
3. **Authentication.** The org UUID in the path and the Vulnetix API key in `Authorization: Bearer` or `x-api-key`. Failure is `401 invalid_api_key`. A backend outage is `503`; authentication never fails open.
4. **Provider policy.** `403 provider_denied` when the org denies the provider, `403 provider_key_missing` when no key is stored for it.
5. **Body.** Up to 8 MiB (`413 request_too_large`), valid JSON, with a `model`.
6. **Model policy.** `403 model_denied` for a denied model; `403 model_not_allowed` when the provider is in allowlist mode and the model is not listed.
7. **Inventory.** The tools, MCP servers and skills the request carries are recorded, whether or not the request is then allowed.
8. **Sealed blocks.** Harness blocks sealed with gateway [nonces](/ai-firewall/reference/nonces/) are verified.
9. **Guardrails.** Capability rules, then content rules in priority order. A `block` match is `403 request_blocked`; `redact` rewrites the request; `strip` removes a tool or MCP server; `flag` records and allows. A rule can also hold the request for review.
10. **Upstream.** The provider key is decrypted, your Vulnetix credential is removed, and the request is forwarded. Every response carries `X-Vulnetix-Firewall-*` headers saying what the firewall did.

> [!CAREFUL] Guardrails read the request, not the response
> Rules run on what the client sends: prompts, tool results and tool declarations. The model's reply is relayed without inspection. See [Limitations](/ai-firewall/policy/limitations/).

## What it does not do

- No rate limits, spend caps or budgets.
- No markup and no resale: requests go out on your own provider key, and your billing relationship with each provider is unchanged.
- No response inspection: only requests are screened.
- It cannot undo a tool call that already ran on a developer's machine; a tool rule removes or refuses the tool on later requests.
- It governs only traffic sent to it. A developer who unsets the base URL variable talks to the provider directly again, which is what `vulnetix ai-firewall status` reports as `bypasses_firewall` ([Status and checks](/ai-firewall/cli/status-and-checks/)).

The full list is on [Limitations and roadmap](/ai-firewall/reference/limitations-and-roadmap/), and a comparison with other gateways is on [Alternatives](/ai-firewall/reference/alternatives/).

## Plans

The gateway and the key vault are on every plan. Policy is what paid plans add. The API checks the plan when a rule is written, and the gateway checks it again on every request, so a rule stops being enforced after a downgrade.

| Feature | Minimum plan |
|---|---|
| Gateway, provider keys (BYOK), inventory | Community |
| Provider allow/deny, model allow/deny | Pro |
| Inference logging (metadata only) | Pro |
| Guardrails: content rules and capability rules | Teams |

## In the console

The console page is [Resolve > AI Firewall](https://www.vulnetix.com/resolve/ai-firewall). Its tabs, with their URL hashes:

| Group | Tab | Hash | Covers |
|---|---|---|---|
| Set up | Overview | `#overview` | Policy state, gateway endpoint, activity |
| Set up | Connect | `#connect` | Providers, keys, custom providers |
| Policy | Govern | `#govern` | Provider and model allow/deny |
| Policy | Guardrails | `#guardrails` | Content rules and the baseline |
| Agent capability | MCP | `#mcp` | MCP server rules and inventory |
| Agent capability | Tools | `#tools` | Tool rules and inventory |
| Agent capability | Clients | `#clients` | Client rules and inventory |
| Agent capability | Skills | `#skills` | Skill rules and inventory |

Older links keep working: `#usage` and `#byok` open Connect, `#providers` and `#models` open Govern, `#context` and `#agents` open MCP.

## Find the page for your task

| I want to | Read |
|---|---|
| Route my first request through the gateway | [Quickstart](/ai-firewall/get-started/quickstart/) |
| Understand the two keys and the two URL shapes | [Keys and base URLs](/ai-firewall/get-started/keys-and-base-urls/) |
| Set up Claude Code, Codex, Cursor or another agent | [Clients](/ai-firewall/clients/overview/) |
| Wire every client on my machine at once | [Wiring clients](/ai-firewall/cli/wiring-clients/) |
| Allow only some models | [Models](/ai-firewall/policy/models/) |
| Block secrets in prompts | [Block secrets](/ai-firewall/policy/block-secrets/) |
| Stop an agent being offered a tool | [Tools](/ai-firewall/policy/tools/) |
| Keep the policy in git | [Policy as code](/ai-firewall/cli/policy-file-workflow/) |
| Find out why a request was refused | [Error reference](/ai-firewall/reference/errors/) |
| See what the gateway records | [Data handling](/ai-firewall/security/data-handling/) |

## Platform IaC

The AI Firewall's config-as-code document is `.vulnetix/ai-firewall.yaml` with `apiVersion: vulnetix.com/v1` and `kind: AiFirewallPolicy`. `vulnetix ai-firewall export` writes it from the live policy and `vulnetix ai-firewall apply` reconciles the live policy to it; every field is on [Policy file reference](/ai-firewall/reference/policy-file/). A file is a Platform IaC document by its content, so `vulnetix config validate` checks this one too: it is a known kind (`AiFirewallPolicy`, in `Vulnetix/config-schemas` since CLI v3.157.0), and `.vulnetix/ai-firewall.yaml` is one of three well-known files it reads. The same document also works under `.vulnetix/config`; define it in one place. See [Platform IaC](/platform-iac/) and [Which files are Platform IaC documents](/platform-iac/cli/validate/#which-files-are-platform-iac-documents).
