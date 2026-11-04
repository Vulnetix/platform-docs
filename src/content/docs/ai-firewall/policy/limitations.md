---
title: Policy limitations
nav: Limitations
description: What content guardrails and capability rules do not inspect, cannot prevent, or report imperfectly, stated so nobody relies on a control for something it does not do.
order: 18
sources:
  - ai-firewall/internal/policy/engine.go
  - ai-firewall/internal/policy/capability.go
  - ai-firewall/internal/client/client.go
  - ai-firewall/internal/wire/wire.go
  - ai-firewall/internal/api/handlers.go
  - cli/pkg/aifirewall/checks.go
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

## What is not inspected

| Not inspected | Consequence |
|---|---|
| Responses | An injected model's output, PII the model produces, and exfiltration through output all pass. There is no output filtering. |
| Tool call arguments the model generates | A content rule cannot see what the model passes to a tool. Tool results coming back are inspected. |
| Images, documents and other non-text parts | Text inside an image is not read. |
| Traffic that does not go through the gateway | A client pointed at the provider directly is outside policy. `vulnetix ai-firewall status` reports such clients as `bypasses_firewall`. |

## Matching is strings, not meaning

- A secret described in words rather than pasted is not matched.
- Injection that avoids the matched phrases passes. There is no machine-learning classifier. See [Prompt injection](/ai-firewall/policy/prompt-injection/).
- There is no normalisation: base64, homoglyphs, zero-width characters and spaced-out letters are matched as written.
- The built-in PII detectors match shapes, not validated values, and do not detect names or addresses.

## Capability rules act on requests, not on the machine

- A tool runs on the developer's machine before the gateway sees its result. A rule can stop the tool being offered on later turns, and refuse a request whose history shows it ran. It cannot stop the command that already ran, approve individual calls, or sandbox a process.
- Local MCP servers are only reachable through their tools' naming convention. A client that names tools differently is not matched by a prefix rule.
- Skills are read from a `Skill` tool's schema and from calls to it, on the Anthropic Messages and Kiro surfaces only.
- Client identity comes from headers the caller sets. It is attribution, never authentication.

## No exception list

A rule applies to every request the organisation sends. You cannot exempt a phrase, user, repository, model or client from a content rule. See [Rollout and tuning](/ai-firewall/policy/rollout/#tuning) for what to do instead.

## Quantity

There are no rate limits, token budgets or spend caps. `max_messages` bounds how many messages a request carries, not their size or cost. The only size limit is the 8 MiB request body ceiling (`413 request_too_large`).

## Rewriting has side effects

- **Silence.** A redacted or stripped request returns the provider's normal response. The `X-Vulnetix-Firewall-*` headers say what happened, but most clients do not show them.
- **Prompt caching.** Redaction and strip both change the request. When they fire inside a cached prefix, the turn misses the cache and is billed at the uncached rate.
- **Stale descriptions.** An agent's system prompt may still describe a stripped tool, so the model can refer to a capability it no longer has.

## Rules that look enabled and do nothing

| Case | How to catch it |
|---|---|
| A pattern the gateway cannot compile is skipped | `apply` and both APIs refuse such patterns on create, but an API update that sends a pattern without its rule type is not checked. `vulnetix ai-firewall status` reports stored ones as `guardrail_pattern_invalid`. |
| A content rule on a plan below Business, or a provider or model rule below Pro | The gateway skips it. `vulnetix ai-firewall get -o json` and the Resolve Platform show the plan. |
| An allowlist built only from console Allow buttons | It flags unlisted capabilities and never blocks them. See [Tool rules](/ai-firewall/policy/tools/#allowlist-mode). |
| A request that parses but exposes no text | With logging on, the log row shows `inspected: 0`. |

> [!CAREFUL] status reports some capability globs as invalid
> `vulnetix ai-firewall status` compiles every enabled rule's pattern as a regex, including capability globs. A glob that starts with `*`, such as the baseline's `*` (`agent-remote-mcp-server`), `*deploy*` and `*shell*`, fails as a regex and is reported as `guardrail_pattern_invalid` even though the gateway enforces it correctly. Ignore that warning for capability rules.

## The provider

Once a request passes policy and is forwarded, the provider's retention, training use and jurisdiction apply. See [Threat model](/ai-firewall/security/threat-model/).

## Related

- [Limitations and roadmap](/ai-firewall/reference/limitations-and-roadmap/)
- [Hold for review](/ai-firewall/policy/hold-for-review/)
