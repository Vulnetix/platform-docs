---
title: Other clients
description: The two values any OpenAI-compatible client needs, which clients are known to work, which are unverified, and which cannot be routed.
order: 10
sources: [ai-firewall/internal/api/server.go, ai-firewall/internal/api/handlers.go, cli/pkg/aifirewall/clients.go, ai-firewall/website/content/docs/coding-agents/other-clients.md]
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

A client with a custom **OpenAI-compatible provider** setting (a base URL field and an API key field) can be pointed at the gateway.

| Field | Value |
|---|---|
| Base URL | `https://guardrails.vulnetix.com/<provider>/<uuid>/v1` |
| API key | Your Vulnetix API key |
| Model | The provider's own model name: `gpt-4o-mini` on `openai`, `openai/gpt-4o-mini` on `openrouter` |

Conditions:

1. Include `/v1`. Only Anthropic-shaped clients leave it off.
2. `<provider>` must serve `chat`. Every built-in provider except `anthropic` and `kiro` does. An OpenAI-shaped client cannot reach `anthropic`.
3. The organisation must have a stored key for `<provider>`, or the gateway answers `403 provider_key_missing`.
4. The key field is often labelled "OpenAI API key". It still takes your Vulnetix key.

## Known to take this recipe

Cline, Roo Code and Zed each have a custom OpenAI-compatible provider with base URL and key fields. The CLI does not detect or write them, and `status` does not list them.

> [!CAREFUL] Check for built-in models
> An editor that ships its own models (inline completion, quick edit, indexing) may keep using them whatever provider you configure. That traffic does not reach the gateway. This is why [Cursor](/ai-firewall/clients/cursor/) and [Windsurf](/ai-firewall/clients/windsurf/) cannot be fully routed. Cline, Roo Code, aider and Continue ship no models of their own.

## Unverified

OpenCode, Hermes Agent (Nous Research) and OpenClaw appear to support a custom OpenAI-compatible provider in their config files. They have not been tested against the gateway, so no configuration is published for them. The recipe above is the place to start.

## Cannot be routed

| Client | Why |
|---|---|
| Junie (JetBrains) | Its provider is fixed by the vendor (it reads `JUNIE_OPENROUTER_API_KEY`) and it has no base-URL override. Its traffic always goes to its vendor. [Continue](/ai-firewall/clients/continue/) runs in the same IDEs and can be routed. |

## Verify any client

A client the CLI does not know about does not appear in `vulnetix ai-firewall status`, and its absence says nothing. Send a request that a guardrail blocks: a `403` with `code: request_blocked` and `blocked_by` naming the rule, shown in the client, proves that request went through. The [capability inventory](/ai-firewall/operations/inventory/) lists what the gateway saw, with the client name it inferred (often `openai-sdk` or `unknown`).

| Error | Usually means |
|---|---|
| `404 unsupported_api` | The base URL is wrong: missing `/v1`, or a provider that does not serve `chat` |
| `404 unknown_provider` | The slug is not in the provider catalogue |
| `401 invalid_api_key` | The key field holds a provider key, or the UUID in the URL is not the one the key belongs to |
| `403 provider_key_missing` | No key in the vault for that provider |

More in [Errors](/ai-firewall/reference/errors/).
