---
title: Architecture
description: A stateless Cloudflare Worker with one write-only metrics binding, the path a request takes through it, how the edge cache is keyed, and how composing tools fail partially.
order: 1
sources:
  - mcp-server/src/index.ts
  - mcp-server/src/mcp/server.ts
  - mcp-server/src/upstream/client.ts
  - mcp-server/src/config.ts
  - mcp-server/src/metrics.ts
  - mcp-server/wrangler.jsonc
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

```text
MCP client
  |  POST /mcp   Authorization: ApiKey <orgId>:<hex>
  v
Cloudflare Worker (mcp.vulnetix.com)
  |- checks       Host, Origin, path, method, content type
  |- tools        31, some composing several upstream calls
  |- resources    4 record templates (your credential), 1 skill-file template
  |- apps         3 ui:// views, no network origin allowed
  |- prompts      18, generated from the Pix skills
  |- skills       the same 18, verbatim, with digests
  |- shaping      response reduction before serialisation
  '- inference    AI Gateway over HTTPS, Pro and above, optional
        |                          |
        v                          v
  vdb-api (AWS, behind CloudFront)  Cloudflare AI Gateway
```

## Stateless

Protocol revision `2026-07-28` removed protocol-level sessions: no `initialize` handshake, no `Mcp-Session-Id`, no resumable streams, and no server-initiated requests. The handler builds a fresh `McpServer` for each request from a factory and keeps nothing afterwards.

| Consequence | For you |
|---|---|
| No session to expire | A rotated key works from the next request |
| No shared per-tenant object | Nothing one organisation sends can reach another |
| No affinity | Any edge location serves any request |
| Nothing installed | No local version to keep current |

## Storage

The Worker has no Durable Objects, KV, D1, R2 or queues. The one binding, `MCP_METRICS`, is a write-only Analytics Engine dataset that records one data point per tool call (tool, plan, credential scheme, outcome, AI status, latency, sizes, retries, cache hit). It never records the credential, the organisation id or an argument, and no request reads it back. Per-organisation state, such as triage decisions and VEX, lives in vdb-api.

## Request path

1. **Checks.** `Host` against the allowlist; the server card; `Origin`; well-known and health paths; `POST` to `/mcp` only; JSON content type. See [HTTP endpoints](/mcp-server/reference/http-endpoints/).
2. **Credential.** `Authorization` is parsed only far enough to recover the org UUID, then forwarded unchanged. A request with no credential still goes through, so the sign-in tools work.
3. **Dispatch.** A per-request server with every tool, prompt, resource and skill registered.
4. **Upstream.** At most 12 calls per tool, 45 seconds per attempt, up to 3 attempts for a GET on a 5xx or network error, response size guards before buffering.
5. **Shaping.** The vdb-api body is reduced before it is serialised. See [Response shaping](/mcp-server/design/response-shaping/).
6. **Inference.** Only on the five AI tools, only when configured and the plan allows.

## Edge cache

GET responses with a TTL go into the Cloudflare edge cache. The cache key is the upstream URL plus a `__principal` parameter: the org UUID from an `ApiKey`, or the first 32 hex characters of a SHA-256 of the header for a `Bearer` token.

> [!WHY] Why the cache is keyed per principal
> vdb-api returns different fields to different plans. A cache entry shared across organisations would leak Pro fields to a Community caller, or withhold them from a paying one.

A 200 response that is empty or degraded is not cached, so a brief upstream fault does not turn into a full TTL of "no data" answers. A cached entry that no longer decodes is treated as a miss.

## Composition and partial failure

`vulnetix_threat_feed` (up to five calls), `vulnetix_detection_rules` (up to three), `vulnetix_purl` and `vulnetix_fix_plan` (two each) issue their calls concurrently. A failed leg becomes `{"error": ...}` in its own section and is listed in `_meta["vulnetix/degraded"]`. The tool fails only when every leg fails.

## Deployment

Cloudflare Workers Builds deploys from the repository on every push to `main`. GitHub Actions has no deploy step and no Cloudflare token. `verify-deployment.yml` waits until `/health` reports the pushed commit, then runs conformance, the SDK client check and the tool smoke test against the live endpoint.

## Source

[github.com/Vulnetix/mcp-server](https://github.com/Vulnetix/mcp-server), including the conformance script, the jq parity tests and the live smoke test.
