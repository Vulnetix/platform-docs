---
title: FAQ
description: Short answers on plans, content handling, keys, latency, outages, bypass, rate limits and multi-team policy, each linked to the page with the detail.
order: 8
sources:
  - ai-firewall/internal/plan/plan.go
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/config/config.go
  - vdb-site/api/internal/handler/entitlements.go
  - vdb-api/internal/handler/ai_firewall_rules.go
checked: [ai-firewall@339de55, vdb-site@1a06d67, vdb-api@4145f0a]
updated: 02 Nov 2026
---

## What is free and what is paid?

| Feature | Community | Pro | Teams and Enterprise |
|---|---|---|---|
| Gateway on every built-in provider | yes | yes | yes |
| Stored provider keys | yes | yes | yes |
| Capability inventory | yes | yes | yes |
| Provider and model allow/deny | | yes | yes |
| Inference logging | | yes | yes |
| Custom providers | | yes | yes |
| Content guardrails, capability rules, hold for review | | | yes |

The API refuses to create a rule your plan does not include, and the gateway separately declines to enforce one after a downgrade. Rules are kept, and removing one is allowed on every plan.

## Do you see my prompts?

The gateway reads each request in memory to screen it and stores no prompt or completion, with logging on or off. See [Data handling](/ai-firewall/security/data-handling/).

## Can you read my provider key?

The gateway decrypts it to send it to the provider, and no API returns it. A database dump holds only ciphertext bound to your organisation. See [Key custody](/ai-firewall/security/key-custody/).

## Does it add latency?

The gateway reads the body, runs the rules (regex and glob matching) and makes one upstream call from AWS `ap-southeast-2`. Policy, provider and key lookups are cached. The network path through Sydney is usually the larger cost for clients and providers far from it.

## What happens if the gateway is down?

Requests through it fail. It is fail-closed: a gateway that cannot verify the key or load the policy answers `503` rather than forward unscreened traffic. Clients do not fall back to the provider unless you configure them to, which would bypass the firewall.

## Can a developer bypass it?

Only by sending traffic somewhere else, which needs a provider key. Store provider keys only in the gateway, and use `vulnetix ai-firewall status` on machines to find clients pointing elsewhere. See [Threat model](/ai-firewall/security/threat-model/).

## Are there rate limits or spend caps?

No. The gateway applies no rate limit, quota, budget or markup. A `429` comes from your provider account. `max_messages` caps the number of messages in a request, not tokens or cost.

## Can different teams have different policies?

Not within one organisation. Policy belongs to the organisation and applies to every principal's requests. Use separate organisations for separate policies. Vault bundles can limit which principals may use each provider key; see [Key custody](/ai-firewall/security/key-custody/).

## Does it scan what the model returns?

No. Only requests are screened, including tool results an agent sends back in its next request. See [Limitations and roadmap](/ai-firewall/reference/limitations-and-roadmap/).

## Does it stop prompt injection?

It flags common injection phrasing with patterns, can refuse tampered sealed blocks, and can strip tools and MCP servers. Patterns can be phrased around. See [Prompt injection](/ai-firewall/policy/prompt-injection/).

## Why did the model answer about "[REDACTED]"?

A `redact` rule replaced matched text with `[REDACTED]` before the request was forwarded. The `X-Vulnetix-Firewall-Redactions` header counts how many. See [Redact PII](/ai-firewall/policy/redact-pii/).

## Can I use a provider you do not list?

Yes, on Pro and above, as a custom provider: any `https` endpoint speaking OpenAI Chat, OpenAI Responses or Anthropic Messages. See [Provider catalog](/ai-firewall/reference/provider-catalog/#custom-providers).

## Do I need the CLI?

No. Everything can be done on the [AI Firewall page](https://www.vulnetix.com/resolve/ai-firewall). The CLI adds wiring local clients, local checks, code snippets and the [policy file](/ai-firewall/reference/policy-file/).

## How do I know it is working?

Add a canary rule and watch a request get a `403`, then read the `X-Vulnetix-Firewall-*` headers. See [Verify](/ai-firewall/get-started/verify/).
