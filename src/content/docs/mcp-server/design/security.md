---
title: Security model
description: How credentials are relayed, not interpreted, the encrypted device-login handle, prompt-injection controls, the vdb_request allowlist and transport hardening.
order: 3
sources:
  - mcp-server/src/auth/credential.ts
  - mcp-server/src/auth/seal.ts
  - mcp-server/src/auth/device.ts
  - mcp-server/src/ai/gateway.ts
  - mcp-server/src/tools/raw.ts
  - mcp-server/src/index.ts
  - mcp-server/src/upstream/client.ts
  - mcp-server/src/metrics.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Written for whoever has to approve the server. Questions and objections go to [GitHub issues](https://github.com/Vulnetix/mcp-server/issues); security reports follow `SECURITY.md`.

## The credential is relayed, not interpreted

The server does not hold the HMAC secret needed to check an `ApiKey`, and does not try. vdb-api recomputes the digest and is the only authority. Locally, the header is split only to recover the org UUID for the cache key. Nothing about the credential is stored; it is presented on every request.

The credential is never a tool parameter. MCP allows mirroring tool arguments into headers, but that puts the value in the advertised input schema, so the model would generate it on every call: in the transcript, in provider logs, and open to being mixed up between accounts in one session.

## Everything returned lands in a transcript

A tool result reaches the model, the conversation history, the client's logs and the model provider. That shapes the sign-in flow.

### The device code is encrypted, not only signed

In the CLI's device login, the secret `device_code` never leaves your machine. Over MCP it must cross the wire so the client can poll with it, and the Vulnetix device-login token endpoint is unauthenticated: holding the `device_code` is the whole authentication. Someone reading a leaked transcript within the 5-minute window could redeem it first and receive your organisation's key.

So `vulnetix_auth_start` returns a `handle` that seals the `device_code` with AES-256-GCM. The key is derived with HKDF-SHA256 from the server's `MCP_AEAD_KEY` secret, with the purpose string `device-grant` as HKDF info, so a handle sealed for one purpose cannot be opened by another. The expiry is inside the sealed body. The client holds ciphertext it cannot read.

> [!WHY] Why not the SDK's state codec
> The MCP SDK ships a codec for round-tripping state through a client, but it is signed, not encrypted: the client can base64url-decode it and read the payload. Integrity alone is not enough when the payload is a bearer secret. A test asserts the plaintext code is absent from the handle.

### Residual exposure

The key returned by `vulnetix_auth_poll` must reach you through the transcript; there is no other channel. If that transcript is shared or exported, rotate the key.

## No anonymous mode, no silent downgrade

The server has no built-in credential. A fallback would put every caller without a key into one shared quota, where one runaway agent loop would deny service to everyone in it. When a limit is hit, the server reports it; it never retries with a different credential, which would return different data with no signal.

## AI output and prompt injection

CVE descriptions, advisory prose and proof-of-concept code are written by outsiders, and the model's output becomes a result an agent may act on. The gateway client enforces four rules for every AI call:

1. Upstream data is passed inside `<untrusted-data>` delimiters, never concatenated into instructions.
2. The system prompt is fixed and states that the block is data and that instructions inside it are to be ignored.
3. Output must be JSON matching a fixed per-tool schema.
4. Output never chooses an endpoint, a parameter or a tool. It is added to a result that is already complete.

AI fields carry `analysisNote` in the payload and `derived: true` in `_meta["vulnetix/ai"]`, so a downstream agent can tell interpretation from VDB data.

## The escape hatch is allowlisted

`vdb_request` accepts only paths under a fixed list of read prefixes. A free-form path would let a caller steer a credentialed request from inside Cloudflare's network. The CLI-only `/cli.*` routes, the `/auth/*` credential routes and every non-GET method are unreachable. See [vdb_request](/mcp-server/tools/vdb-request/).

## Transport hardening

| Control | Detail |
|---|---|
| DNS-rebinding protection | `Host` and `Origin` checked against an allowlist before anything else reads the request; 403 on mismatch |
| Method and type | `POST` only (405 otherwise), `application/json` only (415 otherwise) |
| Header and body agreement | `Mcp-Method` and `Mcp-Name` must match the body, or 400 `-32020` |
| Size guards | 3 MiB buffered, 64 MiB streamed, checked before buffering |
| Trace headers | `traceparent` and `tracestate` forwarded only when they match the W3C format; `tracestate` capped at 512 characters with no newlines |
| Edge flood guard | Cloudflare rate-limit rule on `POST /mcp`, 100 requests per 10 seconds per colo and IP by default |
| Cache isolation | Edge cache keyed per principal |

## What is recorded

One Analytics Engine data point per tool call: tool name, plan, credential scheme, outcome, AI status, latency, upstream calls, sizes, retries, cache hit. The credential, the organisation id and tool arguments are never recorded. An argument is what you are investigating, and that is yours.

## Read-only by declaration

All 27 VDB tools and `vdb_request` declare `readOnlyHint: true`. The two sign-in tools that mint and poll a code declare `readOnlyHint: false`, `destructiveHint: false`. A gateway policy that blocks all write-capable tools removes only sign-in.
