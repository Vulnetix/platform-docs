---
title: API reference
nav: API
description: The gateway's routes, authentication, request limits, streaming, the models, count_tokens and evaluate endpoints, and the APIs that manage policy.
order: 2
sources:
  - ai-firewall/internal/api/server.go
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/api/evaluate.go
  - ai-firewall/internal/api/proxy.go
  - ai-firewall/internal/api/codec.go
  - ai-firewall/internal/config/config.go
  - ai-firewall/internal/plan/plan.go
  - vdb-site/api/main.go
  - vdb-api/main.go
checked: [ai-firewall@339de55, vdb-site@1a06d67, vdb-api@4145f0a]
updated: 02 Nov 2026
---

There are three APIs. The **gateway** at `https://guardrails.vulnetix.com` carries inference and enforces policy; it has no policy-editing routes. Policy is written through the **console API** that the [AI Firewall page](https://www.vulnetix.com/resolve/ai-firewall) calls, and the **CLI API** that `vulnetix ai-firewall` calls.

## Gateway routes

`{provider}` is a provider slug from the [provider catalog](/ai-firewall/reference/provider-catalog/). `{org}` is your organisation UUID (strictly the UUID of the principal whose key you send; see [Authentication](#authentication)).

| Method and path | Surface | Notes |
|---|---|---|
| `POST /{provider}/{org}/v1/chat/completions` | `chat` | OpenAI Chat Completions |
| `POST /{provider}/{org}/v1/responses` | `responses` | OpenAI Responses, what Codex CLI speaks |
| `POST /{provider}/{org}/v1/messages` | `messages` | Anthropic Messages |
| `POST /{provider}/{org}/v1/messages/count_tokens` | `messages` | Guarded like an inference, never logged as one |
| `GET /{provider}/{org}/v1/models` | any | Served from the catalog, never proxied |
| `GET /{provider}/{org}/v1/nonces` | any | Issues sealed-block nonces; see [Nonces](/ai-firewall/reference/nonces/) |
| `POST /{provider}/{org}/v1/generateAssistantResponse` | `kiro` | Kiro, AWS event-stream response |
| `GET /{provider}/{org}/v1/ListAvailableModels` | `kiro` | Fetched from Kiro with the vault login, filtered by model policy |
| `POST /guardrails/{org}/v1/evaluate` | `chat` | Guardrails without forwarding; see [Evaluate](#evaluate) |
| `GET /healthz` | | Liveness: `{"status": "ok"}` |
| `GET /readyz` | | Readiness: `{"status": "ready"}`, or `503` when the database ping fails |

The legacy form drops the org segment (`/{provider}/v1/chat/completions` and so on for chat, responses, messages, count_tokens, models and nonces) and takes the UUID from an `X-Organisation-UUID` header. Most LLM clients cannot send custom headers, so use the URL form.

A provider serves only the surfaces in its `wireApis`. Calling another is `404 unsupported_api`, checked before authentication so a wrong base URL gets the message that says so.

### Base URLs

| Client family | Base URL |
|---|---|
| OpenAI SDKs, Codex, LangChain, most others | `https://guardrails.vulnetix.com/{provider}/{org}/v1` |
| Anthropic SDKs, Claude Code | `https://guardrails.vulnetix.com/anthropic/{org}`. No `/v1`: the SDK appends `/v1/messages`. |

A `/v1/v1/` in a 404 path is the sign of the wrong one. See [Keys and base URLs](/ai-firewall/get-started/keys-and-base-urls/).

## Authentication

Every gateway route except the health probes needs the Vulnetix API key in one of:

```text
Authorization: Bearer <vulnetix api key>
x-api-key: <vulnetix api key>
```

`Authorization` is used when it starts with `Bearer `; otherwise `x-api-key` is read. The key is `hex(HMAC-SHA256(key = principal's secret, message = principal UUID))`, compared case-insensitively. It is verified against the UUID in the URL, so the URL must carry the UUID the key was derived from: for a Business member or service account that is its own principal UUID, not the team's. The policy that applies is the tenant's (the organisation the principal belongs to).

Authentication never fails open. A transient failure to resolve the secret is `503 authentication backend unavailable`, whatever `FAIL_OPEN` says. Resolved secrets are cached for `ORG_SECRET_CACHE_TTL` (60 s), which is how long a regenerated key can take to stop working.

Your provider's own key never appears in a request. It is stored once per organisation and provider; see [Provider keys](/ai-firewall/get-started/provider-keys/).

## Request pipeline

For an inference request, in order:

1. Request id assigned.
2. Provider resolved from the slug (`404 unknown_provider`, `403 provider_disabled`); surface checked (`404 unsupported_api`).
3. Caller authenticated (`401`, `503`).
4. Provider policy: `deny` (Pro and above) is `403 provider_denied`; no stored key is `403 provider_key_missing`.
5. Body read (8 MiB limit) and parsed; `model` required.
6. Model policy (Pro and above): `403 model_denied` or `model_not_allowed`.
7. Guardrails and capability rules loaded (Business and above), cached per tenant for `POLICY_CACHE_TTL` (30 s). A load failure is `503` unless `FAIL_OPEN=true`.
8. Capabilities recorded in the [inventory](/ai-firewall/operations/inventory/), before the decision, so blocked requests are recorded too.
9. Sealed blocks checked; the engine evaluates; holds recorded.
10. Block: `403` with the rule's code. Otherwise the decision headers are set and the possibly rewritten body is forwarded with the decrypted provider key.

A policy change can therefore take up to 30 seconds to reach every request.

## Streaming

`"stream": true` is relayed as the provider sends it: Server-Sent Events for chat, responses and messages, AWS event-stream frames for Kiro. Nothing reassembles the stream. A streamed request is not cut off by its client disconnecting mid-stream, and is not bound by the upstream timeout.

Token counts for the log are read off the stream as it passes. For Chat Completions a stream carries usage only when the client sets `"stream_options": {"include_usage": true}`; without it the log row has no token counts. The gateway does not add the option.

## count_tokens

`POST /v1/messages/count_tokens` runs the full pipeline, guardrails included, because it ships the whole prompt upstream. It writes no inference log row.

## Models

`GET /v1/models` lists the provider's active catalog models, in the provider's own shape:

| Provider speaks | Shape |
|---|---|
| `messages` (Anthropic) | `{"data": [{"type": "model", "id", "display_name", "created_at": RFC 3339}], "has_more": false, "first_id", "last_id"}` |
| anything else | `{"object": "list", "data": [{"id", "object": "model", "created": epoch seconds, "owned_by": slug}]}` |

On Pro and above the list is filtered by the organisation's model policy, so a picker shows only models that will pass. Below Pro the unfiltered catalog is returned, because the model policy is not enforced. No provider key is needed; only a provider `deny` refuses it. The catalog is synced from providers hourly. See [Models endpoint](/ai-firewall/policy/models-endpoint/).

## Evaluate

`POST /guardrails/{org}/v1/evaluate` applies the organisation's guardrails to an OpenAI Chat Completions request without forwarding it. It exists for inference the gateway cannot proxy, such as the Workers AI models a Pix sandbox calls; its log and inventory rows use the provider slug `workers-ai`. No provider or model policy runs.

```bash
curl -s "https://guardrails.vulnetix.com/guardrails/$VULNETIX_ORG_ID/v1/evaluate" \
  -H "Authorization: Bearer $VULNETIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"@cf/meta/llama-3.1-8b-instruct","messages":[{"role":"user","content":"my email is a@example.com"}]}'
```

| Field | Value |
|---|---|
| `decision` | `allow`, `flag`, `redact` or `block` |
| `blocked_by`, `code`, `reason` | Set on a block |
| `violations` | Every matched rule, never the matched text. `[]` when none. |
| `inspected` | How many text units the engine read |
| `body` | The request to send, re-serialised with redactions applied. Absent on a block. |

The status is `200` whatever the decision.

## Limits and runtime settings

| Limit | Value |
|---|---|
| Request body | 8 MiB, else `413 request_too_large` |
| Upstream timeout, non-streaming | `REQUEST_TIMEOUT`, 120 s |
| Rate limits, quotas, spend caps | None. A `429` comes from the provider. |
| Policy cache | `POLICY_CACHE_TTL`, 30 s |
| Provider catalog cache | `PROVIDER_CACHE_TTL`, 5 min |
| Decrypted provider key cache | `BYOK_KEY_CACHE_TTL`, 15 min, keyed by ciphertext |
| Org secret cache | `ORG_SECRET_CACHE_TTL`, 60 s |
| Inventory write window | `INVENTORY_CACHE_TTL`, 1 h, up to `INVENTORY_CACHE_MAX` 50,000 configurations |
| Capabilities recorded per observation | `INVENTORY_MAX_CAPS`, 512 |
| Fail open on policy load error | `FAIL_OPEN`, `false` |

These are the hosted gateway's settings, listed so their effect is predictable. They are not configurable per organisation.

## Plan enforcement at request time

| Feature | Minimum plan | Below it |
|---|---|---|
| Proxy, provider keys, inventory | Community | |
| Provider `deny` | Pro | Not applied |
| Model allow/deny | Pro | Not applied; `/v1/models` unfiltered |
| Inference logging | Pro | No rows written, even with the flag on |
| Content guardrails, capability rules, hold for review | Business | Rules not loaded |

An organisation that downgrades keeps its rules; the gateway stops applying them.

## Resolve Platform API

The Resolve Platform calls `https://www.vulnetix.com/api/site/v1` with the signed-in session cookie. It is not a public API and has no token authentication. The AI Firewall routes:

| Method and path | Purpose |
|---|---|
| `GET /ai-firewall` | Providers, model policies, guardrails, settings |
| `PUT /ai-firewall/settings` | `{"logsEnabled": bool}` |
| `GET /ai-firewall/logs`, `GET /ai-firewall/logs/stats` | [Inference logs](/ai-firewall/operations/logs/) |
| `GET /ai-firewall/stats` | [Usage](/ai-firewall/operations/usage/) history |
| `POST /ai-firewall/providers/test`, `POST /ai-firewall/providers`, `DELETE /ai-firewall/providers/{uuid}` | Custom providers |
| `POST`, `DELETE /ai-firewall/providers/{uuid}/policy` | Provider allow/deny |
| `PUT`, `DELETE /ai-firewall/providers/{uuid}/key` | Provider key |
| `GET /ai-firewall/models`, `POST /ai-firewall/models/policy`, `DELETE /ai-firewall/models/policy/{modelUuid}` | Model catalog and policy |
| `GET /ai-firewall/baseline` | Recommended guardrails |
| `POST /ai-firewall/guardrails`, `PUT`, `DELETE /ai-firewall/guardrails/{uuid}` | Guardrails |
| `GET`, `PUT /ai-firewall/hold-policy`, `GET /ai-firewall/holds`, `POST /ai-firewall/capabilities/review` | [Held requests](/ai-firewall/operations/held-requests/) |
| `GET /ai-firewall/inventory`, `GET /ai-firewall/inventory/clients`, `DELETE /ai-firewall/inventory` | [Inventory](/ai-firewall/operations/inventory/) |

## CLI API

`vulnetix ai-firewall` calls `POST https://api.vdb.vulnetix.com/v2/cli.<route>` with the CLI's credential:

| Route | Used by |
|---|---|
| `cli.ai-firewall-get` | `get`, `status`, `install`, `snippet`, `apply`, `export` |
| `cli.ai-firewall-provider` | `policy provider`, `apply` |
| `cli.ai-firewall-model` | `policy model`, `apply` |
| `cli.ai-firewall-guardrail` | `policy guardrail`, `apply` |
| `cli.ai-firewall-key` | `key set`, `key remove`, `apply` |
| `cli.ai-firewall-settings` | `settings`, `apply` |
| `cli.ai-firewall-baseline` | `baseline`, `apply` |
| `cli.ai-firewall-inventory` | `inventory` |

See [Commands](/ai-firewall/cli/commands/). A plan-locked write answers `200` with `{"planLocked": true, "feature", "requiredPlan"}`, which the CLI reports as an error.

## Related

- [Error reference](/ai-firewall/reference/errors/)
- [Headers](/ai-firewall/reference/headers/)
- [Policy file reference](/ai-firewall/reference/policy-file/)
