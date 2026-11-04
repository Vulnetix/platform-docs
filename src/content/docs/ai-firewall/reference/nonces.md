---
title: Nonces and sealed blocks
nav: Nonces
description: How a client seals harness blocks with gateway-issued nonces, how the gateway classifies them, and what observe, enforce and canonical mode do to the request.
order: 5
sources:
  - ai-firewall/internal/api/nonces.go
  - ai-firewall/internal/delimiters/delimiters.go
  - ai-firewall/internal/api/headers.go
  - ai-firewall/internal/policy/engine.go
checked: [ai-firewall@339de55]
updated: 02 Nov 2026
---

An agent harness such as Belai wraps its own instructions, plans and attachments in tagged blocks. Text in the conversation (a web page, a file, a tool result) can forge one of those tags. When the harness seals each block with a nonce the gateway issued, the gateway can tell a block the harness wrote from one the conversation forged, because a forged block cannot carry a valid nonce.

This is opt in. A client that sends no sealed blocks is not affected, and nothing is stripped unless the client asks for it.

## The block format

```text
<kind nonce="<hex nonce>" integrity="<sha256 hex of content>">content</kind>
```

| Item | Rule |
|---|---|
| `kind` | One of `system`, `agent`, `plan`, `goal`, `tools`, `skills`, `hooks`, `attachment`, `exploration`, `directive`, `diagnostics`. A tag with any other name is ordinary text. |
| `integrity` | Lowercase hex SHA-256 of the exact bytes between the opening and closing tag. Required for `attachment`, `directive` and `diagnostics`; optional for the rest. |
| `nonce` | A nonce from `GET /v1/nonces`, issued to the same principal and unexpired |
| Close tag | `</kind>`. An opening tag with no matching close is left alone. |

## Getting nonces

```bash
curl -s "https://guardrails.vulnetix.com/anthropic/$VULNETIX_ORG_ID/v1/nonces?count=32" \
  -H "x-api-key: $VULNETIX_API_KEY"
```

```json
{
  "nonces": ["3f9c…", "…"],
  "count": 32,
  "expires_at": "2026-11-03T04:12:09Z",
  "modes": ["observe", "enforce", "canonical"]
}
```

| Property | Value |
|---|---|
| Route | `GET /{provider}/{org}/v1/nonces` (legacy `GET /{provider}/v1/nonces` with `X-Organisation-UUID`) |
| Authentication | Same as inference: the Vulnetix API key for the org UUID in the URL |
| `count` | 1 to 64, default 16. A value outside the range, or not a number, silently falls back to 16. |
| Lifetime | 24 hours from issue, truncated to the second |
| Format | 80 hex characters: 16 random bytes, an 8-byte big-endian expiry, and the first 16 bytes of an HMAC-SHA256 |
| Key | The principal's own HMAC secret, the one its Vulnetix API key is derived from |
| Storage | None. Nonces are stateless; any gateway replica verifies any nonce. |
| Policy gate | Only an explicit provider `deny` (Pro and above) refuses it, with `403 provider_denied`. No provider key is needed, and nothing is sent upstream. |

A nonce issued to one principal never verifies for another, including another member of the same organisation.

## Classification

Each block in each text unit of the request is classified before the guardrails run:

| Result | Condition |
|---|---|
| `tampered` | `integrity` is present and does not match the content, or the kind requires `integrity` and it is missing |
| `unknown` | No nonce, or a nonce that was not issued to this principal, or has expired |
| `verified` | A valid nonce and, where present, a matching integrity hash |

Integrity is checked first, so a block with a valid nonce and a wrong hash is `tampered`.

## Modes

The client chooses the mode with the `X-Vulnetix-Nonce-Mode` request header.

| Header value | Mode | Unknown and tampered blocks | Verified blocks |
|---|---|---|---|
| absent, or anything else | `observe` | Counted, left in place | Left in place |
| `enforce` | `enforce` | Removed whole, in place | Left in place |
| `canonical` | `canonical` | Removed whole, in place | Opening tag rewritten to `<kind integrity="…">` (or `<kind>` with no hash), nonce and other attributes dropped |

Send `enforce` or `canonical` only when every nonce in the request came from this gateway. A client that mints its own nonces must stay in `observe`, or every one of its blocks is `unknown` and removed.

> [!WHY] Why canonical mode exists
> Each session seals blocks with different nonces, so the same instruction block differs byte for byte across sessions and the provider's prompt cache misses. Once the gateway has verified a nonce it has no further use, and the model was never told it. Canonical mode forwards the same bytes for the same content, so the provider can serve the prefix from cache.

Stripped blocks are removed before the guardrails scan the request, so a forged block is never matched by content rules.

## What the client sees

When the request carried any sealed block, the response has:

```text
X-Vulnetix-Firewall-Nonce: mode=enforce;verified=4;unknown=1;tampered=0;stripped=1
```

`;canonical=N` is appended in canonical mode only, so a parser written for observe and enforce is unaffected.

## Refusing tampered requests

Stripping removes bad blocks and lets the request through. To refuse a request that carries a tampered block, add a guardrail with `ruleType: delimiter_integrity` and action `block` (or `flag` to record it). It takes no pattern. A block answers `403` with code `delimiter_tampered`. Only `tampered` blocks trigger it; `unknown` blocks do not.

The recommended baseline includes this rule as `injection-delimiter-tampered`, disabled. See [Recommended baseline](/ai-firewall/policy/recommended-baseline/) and the [policy file reference](/ai-firewall/reference/policy-file/).

## Related

- [Prompt injection](/ai-firewall/policy/prompt-injection/)
- [Headers](/ai-firewall/reference/headers/)
