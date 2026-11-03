---
title: How policy is evaluated
nav: Overview
description: The order in which the gateway checks a request against provider, model, capability and content policy, which plan enables each check, and where each one is configured.
order: 1
sources:
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/api/entitlements.go
  - ai-firewall/internal/plan/plan.go
  - ai-firewall/internal/policy/engine.go
  - ai-firewall/internal/policy/capability.go
  - ai-firewall/internal/policy/hold.go
  - ai-firewall/internal/config/config.go
  - vdb-api/internal/handler/ai_firewall_rules.go
  - website/src/pages/resolve/ai-firewall-tabs.ts
checked: [ai-firewall@339de55, vdb-api@4145f0a, website@ad775f3]
updated: 02 Nov 2026
---

An organisation's AI Firewall policy has four layers. The gateway checks them in a fixed order on every inference request, and the first refusal ends the request before anything reaches the provider.

| Layer | Decides | Configured as | Plan |
|---|---|---|---|
| [Providers](/ai-firewall/policy/providers/) | Which upstream vendors the organisation may reach | `allow`, `deny` or no entry per provider | Pro |
| [Models](/ai-firewall/policy/models/) | Which models at a provider | `allow` or `deny` per model | Pro |
| Capability rules ([tools](/ai-firewall/policy/tools/), [MCP servers](/ai-firewall/policy/mcp-servers/), [skills](/ai-firewall/policy/skills/), [clients](/ai-firewall/policy/client-identity/)) and [hold for review](/ai-firewall/policy/hold-for-review/) | What the agent sending the request can do | `*_allow` and `*_deny` guardrails with glob patterns | Teams |
| [Content guardrails](/ai-firewall/policy/guardrails/) | What the request says | `blocked_pattern`, `pii_redact`, `max_messages`, `delimiter_integrity` | Teams |

The gateway itself, the provider key vault and the [capability inventory](/ai-firewall/operations/inventory/) work on every plan, including community. A stored provider key is required at every plan: without one the request is refused with `provider_key_missing`.

## Request pipeline

Each step either passes the request on or answers it. Status codes and `code` values are the ones the client receives; the full list is on [Errors](/ai-firewall/reference/errors/).

| Step | Check | Refusal |
|---|---|---|
| 1 | The provider slug in the path resolves for this organisation | `404 unknown_provider` |
| 2 | The provider is enabled in the catalog | `403 provider_disabled` |
| 3 | The provider serves the surface the route speaks (chat, responses, messages, kiro) | `404 unsupported_api` |
| 4 | The Vulnetix API key is valid for the org UUID in the path | `401 invalid_api_key`, or `503` when the auth backend is unreachable |
| 5 | Provider policy: the tenant has not denied the provider (Pro and above) | `403 provider_denied` |
| 6 | A provider key (or Kiro sign-in) is stored | `403 provider_key_missing` |
| 7 | The body is at most 8 MiB and parses | `413 request_too_large`, `400` |
| 8 | A `model` is present | `400 model is required` |
| 9 | Model policy: not denied, and on the allowlist when the provider is in allowlist mode (Pro and above) | `403 model_denied`, `403 model_not_allowed` |
| 10 | Guardrails are loaded (Teams and above) | `503 policy backend unavailable` |
| 11 | The request's tools, MCP servers, skills and client are recorded in the inventory | never refuses |
| 12 | Sealed harness blocks are verified (see [Nonces](/ai-firewall/reference/nonces/)) | never refuses on its own |
| 13 | Capability rules: explicit denies in priority order, then allowlist gaps | `403 tool_denied`, `mcp_denied`, `skill_denied`, `client_denied` |
| 14 | Hold for review, when it is on | strips a tool or MCP server; `403 held_for_review` for a skill or client |
| 15 | Content rules in ascending priority | `403 request_blocked`, or `403 delimiter_tampered` |
| 16 | The (possibly rewritten) request is forwarded with the provider key | provider errors are relayed |

Every response, refusals included, carries `X-Vulnetix-Firewall-Request-Id`. An evaluated request also carries `X-Vulnetix-Firewall-Decision` (`allow`, `flag`, `redact` or `block`) and, when rules matched, `X-Vulnetix-Firewall-Rules`. See [Response headers](/ai-firewall/reference/headers/).

> [!CAREFUL] Priority orders rules within a plane, not across planes
> All capability rules run before any content rule. A content rule at priority `1` still runs after a capability rule at priority `999`. Within each plane, rules run in ascending `priority`, ties broken by name.

## Actions

| Action | Effect | Applies to |
|---|---|---|
| `block` | Refuse the request with `403`, naming the rule. Evaluation stops. | every rule type |
| `redact` | Replace every match with the literal `[REDACTED]` and continue. Later rules see the rewritten text. | content rules (`delimiter_integrity` excepted) |
| `strip` | Remove the matched tool or MCP server from the request and continue. The model is never offered it. | `tool_*` and `mcp_*` rules |
| `flag` | Record the match and continue. | every rule type |

The decision header reports the strongest outcome: `block` if anything blocked, otherwise `redact` if anything redacted, otherwise `flag` if anything matched. A `strip` is reported in `X-Vulnetix-Firewall-Stripped`, not in the decision.

## Plan enforcement

The plan is resolved for the tenant, not for the member who sent the request, so every member of a Teams organisation is judged by the same policy and the same entitlements. Each layer is checked twice: the API refuses to create a rule the plan does not include, and the gateway skips rules the plan does not include at request time.

| Minimum plan | Gateway constant | What it enables |
|---|---|---|
| community | | The gateway, BYOK keys, the inventory, nonces |
| Pro | `MinProviderPolicy`, `MinModelPolicy`, `MinInferenceLogging` | Provider deny, model allow and deny, inference logging, the filtered `/v1/models` list |
| Teams | `MinContentGuardrails`, `MinCapabilityRules` | Content guardrails, capability rules, hold for review |

An organisation that downgrades keeps its rules. The gateway stops applying them, and deleting or clearing a rule stays available on every plan.

## When a policy change takes effect

Guardrails, capability rules, hold settings and review approvals are cached per tenant for 30 seconds (`POLICY_CACHE_TTL`). Provider and model policy are read on every request. Allow up to 30 seconds after saving a guardrail before you test it.

## Failure behaviour

| Backend failure | Result |
|---|---|
| Authentication | `503`. Never fails open. |
| Provider or model policy lookup | `503`. Never fails open. |
| Guardrail load | `503 policy backend unavailable`. The hosted gateway runs with `FAIL_OPEN=false`; with `FAIL_OPEN=true` the request would proceed with no guardrails. |

## Where to configure each layer

| Layer | Resolve Platform tab (`https://www.vulnetix.com/resolve/ai-firewall`) | CLI | Policy file |
|---|---|---|---|
| Providers | Govern (`#govern`) | `vulnetix ai-firewall policy provider` | `spec.providers` |
| Models | Govern (`#govern`) | `vulnetix ai-firewall policy model` | `spec.models` |
| Content guardrails | Guardrails (`#guardrails`) | `vulnetix ai-firewall policy guardrail` | `spec.guardrails` |
| MCP, tool, client and skill rules | MCP (`#mcp`), Tool calls (`#tools`), Clients (`#clients`), Skills (`#skills`) | `vulnetix ai-firewall policy guardrail --rule-type tool_deny` and so on | `spec.guardrails` |
| Hold for review | Govern (`#govern`) | none | none |
| Recommended baseline | Blueprints panels on Guardrails and the capability tabs | `vulnetix ai-firewall baseline`, `apply` | `spec.baseline` |

The policy file is described field by field on [Policy file reference](/ai-firewall/reference/policy-file/).
