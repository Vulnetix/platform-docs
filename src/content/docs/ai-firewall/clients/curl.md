---
title: curl and raw HTTP
nav: curl
description: "The gateway's wire format with no SDK in the way: one request per surface, streaming, the response headers, and handling a refusal in a shell script."
order: 12
sources: [ai-firewall/internal/api/server.go, ai-firewall/internal/api/handlers.go, ai-firewall/internal/api/codec.go, ai-firewall/internal/api/headers.go, ai-firewall/internal/policy/engine.go, cli/pkg/aifirewall/templates/sh-curl.tmpl, ai-firewall/website/content/docs/sdks/curl-http.md]
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

Every example reads two variables:

```bash
export VULNETIX_API_KEY="<your Vulnetix API key>"
export VULNETIX_ORG_ID="<the UUID the key belongs to>"
```

`vulnetix ai-firewall snippet --lang sh --sdk curl` prints the first example with your values filled in.

## One request per surface

Chat Completions (any `chat` provider):

```bash
curl -sS "https://guardrails.vulnetix.com/openai/$VULNETIX_ORG_ID/v1/chat/completions" \
  -H "Authorization: Bearer $VULNETIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}'
```

Responses (`openai` only):

```bash
curl -sS "https://guardrails.vulnetix.com/openai/$VULNETIX_ORG_ID/v1/responses" \
  -H "Authorization: Bearer $VULNETIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","input":"Hello"}'
```

Messages (`anthropic` only). The route is `/v1/messages` under the UUID; an Anthropic SDK base URL stops before `/v1`.

```bash
curl -sS "https://guardrails.vulnetix.com/anthropic/$VULNETIX_ORG_ID/v1/messages" \
  -H "x-api-key: $VULNETIX_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-sonnet-4-5","max_tokens":256,"messages":[{"role":"user","content":"Hello"}]}'
```

The key is accepted as `Authorization: Bearer <key>` or `x-api-key: <key>` on every route. Neither header is forwarded upstream; the gateway sends the provider key from the vault.

Models your policy allows:

```bash
curl -sS "https://guardrails.vulnetix.com/openai/$VULNETIX_ORG_ID/v1/models" \
  -H "Authorization: Bearer $VULNETIX_API_KEY"
```

## Streaming

Add `"stream": true` and `--no-buffer`. The response is relayed as server-sent events. A refusal is decided before the stream opens, so it arrives as a plain `403` with a JSON body.

```bash
curl -sS --no-buffer "https://guardrails.vulnetix.com/openai/$VULNETIX_ORG_ID/v1/chat/completions" \
  -H "Authorization: Bearer $VULNETIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}],"stream":true}'
```

## What the firewall did

`curl -i` shows the decision headers on every evaluated response:

| Header | Value |
|---|---|
| `X-Vulnetix-Firewall-Decision` | `allow`, `redact`, `flag` or `block` |
| `X-Vulnetix-Firewall-Rules` | Comma-separated, percent-encoded names of matched rules, at most 8 names and 512 bytes. Never the matched text. |
| `X-Vulnetix-Firewall-Redactions` | Number of redactions, when any |
| `X-Vulnetix-Firewall-Stripped` | Number of capabilities stripped from the request, when any |
| `X-Vulnetix-Firewall-Request-Id` | A random UUID for this request, set on every response including refusals |
| `X-Vulnetix-Firewall-Nonce` | Nonce verification report, when the request carried sealed blocks |

Details in [Response headers](/ai-firewall/reference/headers/).

## A refusal

A blocked request is `403`. On the OpenAI surfaces:

```json
{
  "error": {
    "message": "request blocked by AI firewall policy: ...",
    "type": "policy_violation",
    "code": "request_blocked",
    "blocked_by": "No connection strings",
    "violations": [
      {
        "policy_uuid": "...",
        "policy_name": "No connection strings",
        "rule_type": "blocked_pattern",
        "action": "block",
        "detail": "..."
      }
    ]
  }
}
```

On `messages` the same fields sit inside the Anthropic envelope, `{"type": "error", "error": {"type": "permission_error", ...}}`. `blocked_by` is a single rule name; `violations` lists every rule that matched, including redact and flag rules. `code` is `request_blocked` for content rules, and `tool_denied`, `mcp_denied`, `skill_denied`, `client_denied` or `held_for_review` for capability rules. Every code is in [Errors](/ai-firewall/reference/errors/).

In a script:

```bash
#!/bin/sh
set -eu
body=$(mktemp)
status=$(curl -sS -o "$body" -w '%{http_code}' \
  "https://guardrails.vulnetix.com/openai/$VULNETIX_ORG_ID/v1/chat/completions" \
  -H "Authorization: Bearer $VULNETIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}')

case "$status" in
  200) jq -r '.choices[0].message.content' "$body" ;;
  403) printf 'AI firewall refused: %s (rule: %s)\n' \
         "$(jq -r '.error.code' "$body")" "$(jq -r '.error.blocked_by // "n/a"' "$body")" >&2
       exit 1 ;;
  *)   cat "$body" >&2; exit 1 ;;
esac
```

## Limits

| Limit | Value |
|---|---|
| Request body | 8 MiB, else `413 request_too_large` |
| Embeddings, images, audio | No route. Only the surfaces above are served. |
