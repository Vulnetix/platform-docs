---
title: Keys and base URLs
description: Which credential goes where, the two base URL shapes the OpenAI and Anthropic SDKs need, and the request surfaces each provider serves.
order: 3
sources:
  - ai-firewall/README.md
  - ai-firewall/internal/api/server.go
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/api/codec.go
  - cli/pkg/aifirewall/provider.go
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

Three credentials are involved and each goes to a different place. Most `401`s come from sending one where another belongs.

| Credential | Sent by | Sent to | Where it lives |
|---|---|---|---|
| Vulnetix API key | Your application or agent | The gateway | `VULNETIX_API_KEY` by convention |
| Provider key (OpenAI, Anthropic, ...) | The gateway | The provider | Stored once, encrypted. See [Provider keys](/ai-firewall/get-started/provider-keys/). |
| CLI login | You, at a terminal | The Vulnetix API, to manage policy | `vulnetix auth login` or `VULNETIX_API_KEY` with `VULNETIX_ORG_ID` |

## The Vulnetix API key

The gateway authenticates a request with two values: the org UUID in the URL path and the Vulnetix API key in a header.

- The key is `hex(HMAC-SHA256(secret, orgUuid))`, where `secret` is the HMAC secret of that org UUID. It is checked against the UUID in the URL, so the UUID and the key must belong together.
- Send it as `Authorization: Bearer <key>` or `x-api-key: <key>`. Both are accepted on every route, so OpenAI SDKs (Bearer) and Anthropic SDKs (`x-api-key` by default) both work.
- In a Business organisation each member signs in as their own principal with their own UUID and key, and all of them share the organisation's policy. Use your own UUID in the URL with your own key.
- A provider key in the `api_key` field is `401 invalid Vulnetix API key`. The gateway never passes a caller's credential upstream.

Both values are on [Resolve > AI Firewall](https://www.vulnetix.com/resolve/ai-firewall) when you are signed in.

| `401` message | Cause |
|---|---|
| `missing organisation: use https://guardrails.vulnetix.com/{providerSlug}/{orgUuid}/v1 as the base URL` | No UUID in the path and no `X-Organisation-UUID` header |
| `unknown organisation` | The UUID is malformed, unknown or inactive |
| `missing Vulnetix API key: send it as Authorization: Bearer or x-api-key` | No credential reached the gateway. Check the variable is exported where the client runs. |
| `invalid Vulnetix API key` | A credential arrived and it is not the key for that UUID. Often a provider key. |

All four carry `code: invalid_api_key`. A `503 authentication backend unavailable` is a gateway-side outage; authentication does not fail open.

## Base URLs

OpenAI's SDKs expect `/v1` in the base URL and append `/chat/completions`. Anthropic's SDKs expect the bare root and append `/v1/messages` themselves. The gateway follows the same split.

| Client | Base URL |
|---|---|
| OpenAI SDKs, LangChain, LlamaIndex, Codex, Cursor, Continue, aider, curl | `https://guardrails.vulnetix.com/{provider}/{orgUuid}/v1` |
| Anthropic SDKs, Claude Code, Claude Desktop | `https://guardrails.vulnetix.com/anthropic/{orgUuid}` |
| Kiro (through Belai) | `https://guardrails.vulnetix.com/kiro/{orgUuid}/v1` |

`{provider}` is a slug from the [Provider catalog](/ai-firewall/reference/provider-catalog/). An Anthropic base URL ending in `/v1` makes the SDK call `/v1/v1/messages`, which is a `404`.

The older form, `https://guardrails.vulnetix.com/{provider}/v1` with the org UUID in an `X-Organisation-UUID` header, still works. Prefer the URL form: most clients cannot send custom headers.

## Request surfaces

| Surface | Route under the base | Spoken by |
|---|---|---|
| `chat` | `POST /v1/chat/completions` | OpenAI SDKs and almost everything else |
| `responses` | `POST /v1/responses` | Codex CLI, whose config accepts no other `wire_api` |
| `messages` | `POST /v1/messages`, `POST /v1/messages/count_tokens` | Anthropic SDKs, Claude Code, Claude Desktop |
| `kiro` | `POST /v1/generateAssistantResponse`, `GET /v1/ListAvailableModels` | Belai's `kiro` provider |

Two more routes exist on every provider: `GET /v1/models`, which lists the models your policy allows (see [Models endpoint](/ai-firewall/policy/models-endpoint/)), and `GET /v1/nonces` (see [Nonces](/ai-firewall/reference/nonces/)).

Which surfaces a provider serves is part of its catalog entry. Today `openai` serves `chat` and `responses`, `anthropic` serves `messages`, `kiro` serves `kiro`, and the rest serve `chat`. A route a provider does not serve is a `404 unsupported_api` whose message names the route to use instead. Guardrails apply the same way on every surface.

## Errors come back in your client's dialect

The shape of an error follows the route you called, not the provider. `/v1/messages` answers with an Anthropic error object (`{"type": "error", "error": {...}}`), `/v1/chat/completions` and `/v1/responses` with an OpenAI one (`{"error": {...}}`), and the Kiro routes with the AWS shape (`{"__type": ..., "message": ..., "error": {...}}` plus an `x-amzn-ErrorType` header). All carry the same `code`. See [Error reference](/ai-firewall/reference/errors/).

## Model names pass through

The gateway does not rewrite the `model` field. Use the provider's own naming: `gpt-4o-mini` on `openai`, `openai/gpt-4o-mini` on `openrouter`, `claude-sonnet-4-5` on `anthropic`. An unknown model is the provider's own error, relayed as it is.

## Related

- [Provider keys](/ai-firewall/get-started/provider-keys/)
- [Clients](/ai-firewall/clients/overview/)
- [Headers](/ai-firewall/reference/headers/)
