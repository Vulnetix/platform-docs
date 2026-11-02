---
title: Alternatives
description: How the AI Firewall compares with LiteLLM, Portkey, OpenRouter and Cloudflare AI Gateway, when one of them fits better, and how to run them together.
order: 10
sources:
  - ai-firewall/internal/api/proxy.go
  - ai-firewall/internal/policy/engine.go
  - ai-firewall/internal/client/client.go
  - ai-firewall/internal/inventory/inventory.go
  - ai-firewall/website/content/docs/reference/alternatives.md
checked: [ai-firewall@e5b028f]
updated: 02 Nov 2026
---

The AI Firewall is a security gateway: it decides what may leave for a model provider and records which agent capabilities are in use. Most of the products it is compared with are operations gateways, built for routing, retries, budgets and caching, with some security features added. That difference explains most of the table below.

## Comparison

| Capability | AI Firewall | LiteLLM | Portkey | OpenRouter | Cloudflare AI Gateway |
|---|---|---|---|---|---|
| Content guardrails (block, redact) | Yes | Through plugins | Yes | Yes | No |
| Provider and model allow/deny | Yes | Yes | Yes | Yes | No |
| Tool and MCP server allow/deny | Yes | Not documented | Not documented | Not documented | Not documented |
| Inventory of agent capabilities | Yes | Not documented | Not documented | Not documented | Not documented |
| Client identification (Claude Code, Codex, Cursor) | Yes | Not documented | Not documented | Not documented | Not documented |
| Request content retention | None; no content is ever written | Self-hosted: your choice | Configurable | Opt-out | Logs by default |
| Bring your own key, never returned | Yes | Self-hosted: your choice | Yes | Yes | Yes |
| Rate limits, budgets, spend caps | No | Yes | Yes | Yes | Yes |
| Retries and provider fallback | No | Yes | Yes | Yes | Yes |
| Response inspection | No | Through plugins | Yes | Yes | No |
| Caching | No | Yes | Yes | No | Yes |
| Self-hosted | No | Yes | Yes | No | No |
| Price | Gateway on every plan; policy on Pro and Teams | Free (open source) | Paid | Markup on tokens | Paid |
| Markup on tokens | No | No | No | Yes | No |

"Not documented" means the product's published documentation, checked in August 2026, describes no tool-level policy, no agent capability inventory and no client identification. It does not mean the feature cannot exist or cannot be built from a plugin hook. Check before relying on it.

For what each AI Firewall plan includes, see [Plans](/ai-firewall/#plans).

## When another product fits better

### LiteLLM: you must self-host

LiteLLM is open source and runs on your infrastructure, so nothing leaves it. That is the only option if your threat model excludes trusting an operator. It also has routing, retries and budgets, which the AI Firewall does not. In exchange you run and maintain the proxy and its guardrails yourself.

### Portkey: you need output filtering and budgets

Portkey is the closest product to the AI Firewall. It inspects responses, enforces spend caps, caches semantically and has more observability. If output filtering is a hard requirement, use it: the AI Firewall reads requests only.

### OpenRouter: one key for many models

OpenRouter is a router. It gives one account access to many models with failover, takes a markup on tokens, and holds the provider relationship instead of you.

You can put OpenRouter behind the AI Firewall as the `openrouter` provider. Provider policy then sees only `openrouter`, not the vendor that serves each model, so allowing it opens every vendor OpenRouter fronts. See [OpenRouter is a router](/ai-firewall/reference/provider-catalog/#model-names).

### Cloudflare AI Gateway: caching and analytics

Cloudflare AI Gateway caches, rate-limits and reports on traffic, and costs little if you already use Cloudflare. It has no content guardrails and no allow/deny policy, and it logs by default.

## When the AI Firewall fits

- **What leaves matters most.** Secrets, personal data and credentials in prompts and tool results are what the guardrails are built to stop. See [Block secrets](/ai-firewall/policy/block-secrets/) and [Redact PII](/ai-firewall/policy/redact-pii/).
- **No content retention, with nothing to configure.** The gateway has no code path that stores a prompt. See [Data handling](/ai-firewall/security/data-handling/).
- **Your provider relationship stays yours.** Requests go out on your own provider key, with no key pooling and no markup. Your contract, quota and data processing agreement still apply. See [Key custody](/ai-firewall/security/key-custody/).
- **You govern coding agents.** Claude Code, Codex, Cursor and Continue are identified, the CLI wires them up, and the tool results they send back (file contents, command output) are screened. See [Client identity](/ai-firewall/policy/client-identity/) and [Tools](/ai-firewall/policy/tools/).
- **Policy is enforced, not requested.** One organisation-wide policy, with no per-user exceptions and no bypass token.

## When it does not fit

- **Spend caps or rate limits.** There are none. Use LiteLLM or Portkey.
- **Output filtering.** Responses are not inspected.
- **Provider failover or retries.** One request goes to one provider.
- **Per-team policy.** Policy is per organisation.
- **You cannot trust an operator.** Self-host LiteLLM.
- **Caching.** There is none, and a redaction rule that rewrites a cached prefix breaks the provider's prompt caching.

The full list is on [Limitations and roadmap](/ai-firewall/reference/limitations-and-roadmap/).

## Running more than one

The products compose. A common arrangement:

- The **AI Firewall** first, for security policy: what may leave, which providers and which models.
- **LiteLLM or Portkey** behind it as a custom provider, for routing, retries and budgets.

The gateway does not care what is upstream of it, as long as it speaks one of the three API surfaces (Chat Completions, Responses or Messages). See [Custom providers](/ai-firewall/reference/provider-catalog/#custom-providers).
