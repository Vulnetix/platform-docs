---
title: Request and response headers
nav: Headers
description: The X-Vulnetix-Firewall-* headers the gateway sets on responses, the headers it reads from clients, and which headers are never forwarded to the provider.
order: 4
sources:
  - ai-firewall/internal/api/headers.go
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/api/proxy.go
  - ai-firewall/internal/api/nonces.go
  - ai-firewall/internal/delimiters/delimiters.go
  - ai-firewall/internal/client/client.go
checked: [ai-firewall@339de55]
updated: 02 Nov 2026
---

The response headers carry facts about what the firewall did: a decision, rule names, counts and a request id. They never carry the text a rule matched, so a client can show the user what happened without the gateway repeating what it caught.

## Response headers

| Header | Set on | Value |
|---|---|---|
| `X-Vulnetix-Firewall-Request-Id` | Inference routes (chat, responses, messages, count_tokens, Kiro generate), `GET /v1/nonces`, `GET /v1/ListAvailableModels`, `POST /guardrails/{org}/v1/evaluate`, refusals included | A random UUIDv4. Quote it to support. Not set on `GET /v1/models`, `/healthz` or `/readyz`. |
| `X-Vulnetix-Firewall-Decision` | Every request the guardrails evaluated | `allow`, `flag`, `redact` or `block`. `redact` wins over `flag` when both matched. Absent on refusals that happen before evaluation (auth, provider, model, body errors). |
| `X-Vulnetix-Firewall-Rules` | When at least one named rule matched | Matched rule names, each percent-encoded (commas as `%2C`), comma-joined. At most 8 names and 512 bytes; names that do not fit are left out. |
| `X-Vulnetix-Firewall-Redactions` | When at least one violation had action `redact` | Count of redacting violations |
| `X-Vulnetix-Firewall-Stripped` | When a `strip` rule or the hold removed capabilities | Count of tools and MCP servers removed from the forwarded request |
| `X-Vulnetix-Firewall-Nonce` | When the request carried at least one sealed harness block | `mode=<observe\|enforce\|canonical>;verified=N;unknown=N;tampered=N;stripped=N`, plus `;canonical=N` in canonical mode. See [Nonces and sealed blocks](/ai-firewall/reference/nonces/). |

Decode a rule list in a shell:

```bash
curl -s -D - -o /dev/null \
  "https://guardrails.vulnetix.com/openai/$VULNETIX_ORG_ID/v1/chat/completions" \
  -H "Authorization: Bearer $VULNETIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hello"}]}' \
  | grep -i '^x-vulnetix-firewall'
```

The provider's own `X-Vulnetix-*` headers, if it sent any, are dropped from the relayed response so they cannot pose as the gateway's.

## Request headers the gateway reads

| Header | Purpose |
|---|---|
| `Authorization: Bearer <key>` | Vulnetix API key (OpenAI SDKs, curl) |
| `x-api-key: <key>` | Vulnetix API key (Anthropic SDKs) |
| `X-Organisation-UUID` | Legacy: the org UUID when the URL has no org segment (`/{provider}/v1/...`). The URL form wins when both are present. |
| `X-Vulnetix-Nonce-Mode` | `enforce` or `canonical` (case-insensitive). Anything else, or absent, is `observe`. |
| `User-Agent` and client headers | Client identification (`claude-code`, `codex-cli`, `curl`, `unknown` and others). Attribution only; see [Client identity](/ai-firewall/policy/client-identity/). |

## Headers never forwarded upstream

| Header | Why |
|---|---|
| `Authorization`, `x-api-key` | They hold your Vulnetix credential. The provider gets the org's stored key, rendered into the provider's own credential headers. |
| `Accept-Encoding` | Removed so the gateway can read token counts off the response |
| Any `X-Vulnetix-*` | Gateway control headers, such as `X-Vulnetix-Nonce-Mode` |
| Hop-by-hop headers | RFC 7230 |
| `x-amz-*` headers (Kiro only) | The gateway signs the Kiro request itself |

Every other client header is forwarded. A provider credential template can define headers that hold no key, such as Anthropic's `anthropic-version: 2023-06-01`. Those are defaults: the gateway sets them only when the client did not, so a client asking for a newer API version keeps its value.

## Related

- [API reference](/ai-firewall/reference/api/)
- [Error reference](/ai-firewall/reference/errors/)
