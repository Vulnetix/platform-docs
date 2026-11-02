---
title: Threat model
description: What the AI Firewall guarantees, what it does not, and which compromise exposes what, for security review and audit.
order: 4
sources:
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/api/proxy.go
  - ai-firewall/internal/netguard/netguard.go
  - ai-firewall/internal/config/config.go
  - ai-firewall/internal/client/client.go
  - ai-firewall/internal/policy/engine.go
  - ai-firewall/terraform/kms.tf
checked: [ai-firewall@339de55]
updated: 02 Nov 2026
---

## Guarantees

| Property | Enforced by |
|---|---|
| Prompts and completions are not stored | No content column in the log table; responses are relayed, not buffered. See [Data handling](/ai-firewall/security/data-handling/). |
| A database dump does not yield provider keys | Keys are KMS ciphertext bound to organisation and provider by encryption context. See [Key custody](/ai-firewall/security/key-custody/). |
| Your Vulnetix key never reaches the provider | `Authorization` and `x-api-key` are stripped before the provider's own credential headers are added |
| Authentication fails closed | A failure to resolve the secret is `503`, whatever `FAIL_OPEN` says |
| Policy fails closed | A failure to load guardrails is `503` while `FAIL_OPEN` is `false`, the hosted default |
| No bypass for a valid key | Every inference route runs the same pipeline, including `count_tokens`. There is no exemption list or bypass header. |
| Guardrail matches never record content | A violation holds rule name, type, action and a generic detail |
| Custom provider endpoints cannot reach internal networks | `https` only; the resolved address is checked on every connection; redirects are not followed |

## Not guaranteed

| Gap | Detail |
|---|---|
| The gateway sees plaintext in memory | It has to, to screen it. You trust the operator to run the published code. |
| The gateway can decrypt provider keys | It has to, to use them. The console API can also decrypt, for vault verification. |
| The provider | Retention, training and region are set by your provider contract |
| Responses are not inspected | Guardrails read the request only. What the model sends back is relayed unscreened. |
| Tool calls already run | A coding agent runs a tool on the developer's machine before its result reaches the gateway. A tool rule can remove the tool from the next request or refuse it; it cannot undo a run. |
| Guardrails are patterns | RE2 regex and name globs, not semantic analysis. An attacker who knows the rules can phrase around them. |
| Client identity is self-reported | `client_allow` and `client_deny` read request headers that any caller can set. Treat them as inventory and hygiene, not a security boundary. |
| Coverage | Only traffic sent to the gateway is screened. A client pointed straight at the provider is not, and a developer with the provider key can do that. Keep provider keys out of developers' hands: store them only in the gateway. |
| No region pinning | See [Jurisdictional control](/ai-firewall/security/jurisdictional-control/) |

## Blast radius

| Compromise | Prompts | Provider keys | Policy |
|---|---|---|---|
| The gateway database | Not present | Ciphertext only | Readable |
| A developer's laptop | That developer's traffic | Not present; the laptop holds a Vulnetix key | Unchanged |
| A leaked Vulnetix API key | Attacker can send requests as that principal and spend your provider quota, still under your policy | Not exposed | Unchanged; the CLI also needs it to edit policy, so treat it as an admin credential |
| A leaked provider key | Not through the gateway | That provider key | Bypassed: the key works directly at the provider. Rotate it with `key set`. |
| The provider | Whatever it retains | Its own copy | n/a |
| The gateway operator | In flight | Decryptable | Writable |

A leaked Vulnetix key is revoked by regenerating the secret; the gateway stops accepting it within 60 seconds. One revocation cuts off every client using it.

## Related

- [Data handling](/ai-firewall/security/data-handling/)
- [Key custody](/ai-firewall/security/key-custody/)
- [Limitations and roadmap](/ai-firewall/reference/limitations-and-roadmap/)
