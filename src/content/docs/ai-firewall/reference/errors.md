---
title: Error reference
nav: Errors
description: Every HTTP status, error type and code the gateway returns, the envelope each request surface gets, and what to change for each one.
order: 3
sources:
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/api/codec.go
  - ai-firewall/internal/api/proxy.go
  - ai-firewall/internal/api/nonces.go
  - ai-firewall/internal/api/kiro.go
  - ai-firewall/internal/api/vaultbundle.go
  - ai-firewall/internal/api/evaluate.go
  - ai-firewall/internal/policy/engine.go
  - ai-firewall/internal/policy/capability.go
  - ai-firewall/internal/policy/hold.go
  - ai-firewall/internal/anthropic/types.go
  - ai-firewall/internal/openai/types.go
checked: [ai-firewall@339de55]
updated: 02 Nov 2026
---

Every refusal the gateway writes carries a machine-readable `code`. Branch on the code, not the message: messages are for people and change. Errors from the provider itself (a `429` against your account, a `400` for a bad parameter) are relayed unchanged with the provider's own body.

## Envelopes

The envelope follows the route you called, not the provider, so an SDK always gets a shape it can parse.

| Route | Envelope |
|---|---|
| `/v1/chat/completions`, `/v1/responses`, `/guardrails/{org}/v1/evaluate` | OpenAI: `{"error": {"message", "type", "code"}}` |
| `/v1/messages`, `/v1/messages/count_tokens` | Anthropic: `{"type": "error", "error": {"type", "message", "code"}}` |
| `/v1/generateAssistantResponse` (Kiro) | AWS JSON: `{"__type", "message", "error": {"type", "message", "code"}}`, with the same `__type` in the `x-amzn-ErrorType` header |
| `/v1/models`, `/v1/nonces` | Anthropic envelope for an Anthropic provider, OpenAI otherwise |
| Panic in any handler | OpenAI envelope, `500 internal error` |

The Anthropic `error.type` is derived from the status, never copied from the OpenAI type:

| Status | Anthropic `error.type` | Kiro `__type` |
|---|---|---|
| 400 | `invalid_request_error` | `ValidationException` |
| 401 | `authentication_error` | `UnauthorizedException` |
| 403 | `permission_error` | `AccessDeniedException` |
| 404 | `not_found_error` | `ResourceNotFoundException` |
| 413 | `request_too_large` | `ValidationException` |
| 429 | `rate_limit_error` | `ThrottlingException` |
| other | `api_error` | derived from the status |

## Blocked by policy (403)

A guardrail or capability rule that blocks adds `blocked_by` (the rule name) and `violations` (every rule that matched) to the error object:

```json
{
  "error": {
    "message": "request blocked by AI firewall policy: content matched pattern for policy \"Private key material\"",
    "type": "policy_violation",
    "code": "request_blocked",
    "blocked_by": "Private key material",
    "violations": [
      {"policy_uuid": "…", "policy_name": "Private key material", "rule_type": "blocked_pattern", "action": "block", "detail": "content matched pattern for policy \"Private key material\""}
    ]
  }
}
```

A violation names the rule, its type, its action and a generic detail. It never contains the text that matched.

| `code` | Raised by | Fix |
|---|---|---|
| `request_blocked` | A content guardrail (`blocked_pattern`, `pii_redact` or `max_messages`) with action `block` | Change the request, or the rule. See [Guardrails](/ai-firewall/policy/guardrails/). |
| `tool_denied` | A `tool_deny` match, or a tool outside a `tool_allow` list, with action `block` (or a `strip` that had to escalate because the tool was already used in the conversation) | [Tool rules](/ai-firewall/policy/tools/) |
| `mcp_denied` | An MCP server denied, or outside the MCP allowlist | [MCP servers](/ai-firewall/policy/mcp-servers/) |
| `skill_denied` | A skill denied, or outside the skill allowlist | [Skills](/ai-firewall/policy/skills/) |
| `client_denied` | The calling client denied, or outside the client allowlist. A client the gateway cannot name is `unknown`. | [Client identity](/ai-firewall/policy/client-identity/) |
| `delimiter_tampered` | A `delimiter_integrity` rule with action `block`, when a sealed block failed its integrity check | [Nonces and sealed blocks](/ai-firewall/reference/nonces/) |
| `held_for_review` | Hold for review is on and a skill or client no rule or review has decided yet. Held tools and MCP servers are stripped instead. | [Held requests](/ai-firewall/operations/held-requests/) |

## Provider, model and key (403)

These are written in the plain error envelope with `type: "policy_violation"` or `"permission_error"`.

| `code` | `type` | Message | Fix |
|---|---|---|---|
| `provider_denied` | `policy_violation` | `provider <slug> is denied by organisation policy` | `vulnetix ai-firewall policy provider <slug> --clear` or `--allow`. Enforced on Pro and above only. |
| `provider_disabled` | `policy_violation` | `provider <slug> is disabled` | Disabled for every organisation by Vulnetix. Use another provider. |
| `provider_key_missing` | `policy_violation` | `no <Name> API key configured for your organisation: …` | `vulnetix ai-firewall key set <slug>`. For Kiro: `vulnetix ai-firewall kiro login`. |
| `model_denied` | `policy_violation` | `model <model> is denied by organisation policy` | Remove the deny entry, or use another model. |
| `model_not_allowed` | `policy_violation` | `model <model> is not in the organisation allowlist` | The provider has at least one `allow` entry, so only listed models pass. Add this one. See [Models](/ai-firewall/policy/models/). |
| `vault_no_grant` | `permission_error` | `no <slug> key in the secrets vault is allowed for this API key owner` | The provider's key is a vault bundle and none of its keys is granted to the principal whose Vulnetix key made the call. Grant it in the [secrets vault](https://www.vulnetix.com/resolve/vault). |
| `vault_key_expired` | `permission_error` | `the <slug> key for this API key owner has expired; …` | Extend or replace the key in the vault. |
| `vault_kiro_relogin` | `permission_error` | AWS no longer accepts the stored Kiro sign-in | Run `vulnetix ai-firewall kiro login` again. |

> [!CAREFUL] The provider_key_missing message names an old Resolve Platform path
> The message points at `https://www.vulnetix.com/vdb-ai-firewall#byok`. The Resolve Platform page is now [/resolve/ai-firewall](https://www.vulnetix.com/resolve/ai-firewall), and keys are stored on its Connect tab.

## Authentication (401)

All four use `type: "invalid_request_error"` and code `invalid_api_key`.

| Message | Cause |
|---|---|
| `missing organisation: use https://guardrails.vulnetix.com/{providerSlug}/{orgUuid}/v1 as the base URL` | No org UUID in the path and no `X-Organisation-UUID` header |
| `unknown organisation` | The org segment is not a UUID, or no active organisation has it |
| `missing Vulnetix API key: send it as Authorization: Bearer or x-api-key` | No credential header |
| `invalid Vulnetix API key` | The key is not the HMAC of this org UUID. Most often a provider key (`sk-…`) sent instead of the Vulnetix key, or a key for a different principal than the UUID in the URL. |

## Routing and request shape (400, 404, 413)

| Status | `code` | Message | Cause |
|---|---|---|---|
| 404 | `unknown_provider` | `unknown provider <slug>` | The first path segment is not a provider slug, or it is another organisation's custom provider. The two answers are identical on purpose. |
| 404 | `unsupported_api` | names the route the provider does serve | You called a surface the provider does not speak, for example `/v1/messages` on `openai`. Usually a wrong base URL. |
| 404 | `unsupported_api` | `provider <slug> does not serve the Kiro model listing` | `ListAvailableModels` on a non-Kiro provider |
| 400 | `unsupported_api` | `provider <slug> does not serve the Kiro API` | A Kiro request reached a custom provider |
| 413 | `request_too_large` | `request body exceeds the 8 MiB limit` | Body over 8 MiB (8,388,608 bytes) |
| 400 | none | `could not read request body` | Connection error while reading |
| 400 | none | `invalid JSON body: …` | Body is not valid JSON for the surface |
| 400 | none | `model is required` | No `model` field |

## Gateway and upstream (5xx)

| Status | `code` | Message | Cause |
|---|---|---|---|
| 500 | none | `internal error` | A panic. Report it with the request id. |
| 500 | none | `failed to encode request` / `failed to build upstream request` | A bug. Report it. |
| 500 | none | `failed to mint nonces` | Random source failure while minting |
| 502 | none | `upstream request failed` | The provider could not be reached |
| 502 | none | `provider key decryption failed` | KMS refused the stored ciphertext. Store the key again. |
| 502 | none | `provider credential configuration invalid` | The provider's credential template is broken. Report it. |
| 502 | none | `could not sign in to Kiro with the login in the secrets vault` | Kiro token mint failed |
| 502 | `upstream_blocked` | `provider endpoint not permitted` | A custom provider's URL is not `https`, or resolves to a loopback, private or other non-public address |
| 502 | `upstream_redirect` | `provider endpoint redirected; redirects are not followed` | A custom provider answered 301, 302, 303, 307 or 308 |
| 503 | none | `authentication backend unavailable` | The org secret could not be resolved. Authentication never fails open. |
| 503 | none | `policy backend unavailable` | Policy could not be loaded and `FAIL_OPEN` is off (the default) |
| 503 | none | `provider backend unavailable` | The provider catalog could not be loaded |
| 503 | none | `model catalog unavailable` | `GET /v1/models` could not read the catalog |

## Evaluate endpoint

`POST /guardrails/{org}/v1/evaluate` answers `200` whatever the decision; a block is `{"decision": "block", "code": "…", "blocked_by": "…", "reason": "…"}` in the body. Only authentication, body and backend failures use the error envelope. See [API reference](/ai-firewall/reference/api/#evaluate).

## CLI exit codes

`vulnetix ai-firewall` commands exit `0` on success and `1` on any error, including `status --strict` with an error-level check. See [Commands](/ai-firewall/cli/commands/).

## Related

- [Response headers](/ai-firewall/reference/headers/)
- [Troubleshooting](/ai-firewall/reference/troubleshooting/)
