---
title: Errors
description: Transport and JSON-RPC errors the endpoint returns, the in-band tool error results, resource read errors, and which of them to retry.
order: 3
sources:
  - mcp-server/src/index.ts
  - mcp-server/src/tools/result.ts
  - mcp-server/src/resources/register.ts
  - mcp-server/src/upstream/client.ts
  - mcp-server/scripts/conformance.sh
  - mcp-server/terraform/ratelimit.tf
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

There are two kinds of failure. A **protocol error** means the request never reached a tool: the HTTP status is not 200 and the body is a JSON-RPC error. A **tool error** means the tool ran and could not answer: HTTP 200, a normal result with `isError: true`, and a message written for the agent.

## Protocol errors

| HTTP | JSON-RPC code | Cause |
|---|---|---|
| 403 | none | `Host` or `Origin` header not on the allowlist (DNS-rebinding protection) |
| 404 | `-32601` | Path is not `/mcp` (and not one of the [public endpoints](/mcp-server/reference/http-endpoints/)), or the JSON-RPC method is unknown |
| 405 | `-32600` | Method other than `POST` on `/mcp`. The response carries `Allow: POST`. |
| 415 | `-32600` | `Content-Type` is not `application/json` |
| 400 | `-32602` | Invalid `_meta` envelope: a required `io.modelcontextprotocol/*` key is missing |
| 400 | `-32020` | `Mcp-Method` or `Mcp-Name` header disagrees with the body |
| 400 | `-32022` | Unsupported protocol version. `data.supported` lists what is served. |
| 429 | `-32000` | The zone rate-limit rule blocked the source (see below) |

`-32602` is checked before the protocol version, so a request with both a bad version and an incomplete envelope reports `-32602`.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32022,
    "message": "Unsupported protocol version: 1900-01-01",
    "data": { "supported": ["2026-07-28"], "requested": "1900-01-01" }
  }
}
```

### Edge flood guard

A Cloudflare rate-limit rule sits in front of `POST /mcp`. The defaults in `terraform/variables.tf` are 100 requests per 10 seconds, keyed on colo and source IP, with a 10 second block. A blocked request gets HTTP 429 and:

```json
{"jsonrpc":"2.0","id":null,"error":{"code":-32000,"message":"Rate limited at the edge. Slow down and retry after a few seconds."}}
```

This is separate from your daily vdb-api quota, which is never returned as HTTP 429.

## Tool errors

| Situation | Message starts with |
|---|---|
| No `Authorization` header, or one that does not parse | `Vulnetix request failed: No Vulnetix credential was supplied.` |
| vdb-api returned 401 | `Vulnetix rejected the credential (HTTP 401).` |
| vdb-api returned 403 | `Vulnetix denied access (HTTP 403): ... The organisation may be inactive.` |
| vdb-api returned 404 | `Not found in the Vulnetix VDB: ...` |
| vdb-api returned 429 | `Vulnetix daily rate limit exhausted for this organisation. The quota resets at <ISO time>. Do NOT retry this call.` |
| vdb-api returned 503 with `X-Maintenance-Mode: true` | `Vulnetix is in maintenance mode and is refusing writes right now.` |
| Any other upstream status | `Vulnetix returned HTTP <status>: ...` |
| Network failure or timeout | `Vulnetix request failed: ...` |
| `vulnetix_vuln` `raw` over 524,288 bytes | `The raw record for <id> is <n> bytes ...` |
| `vulnetix_purl` input is not a purl | `Not a Package URL: ...` |
| `vdb_request` path not allowlisted | `Path '<path>' is not on the allowlist for this tool.` |
| `vulnetix_auth_start`/`_poll` with no `MCP_AEAD_KEY` | `This Vulnetix MCP server cannot run a login because MCP_AEAD_KEY is not configured.` |
| `vulnetix_auth_poll` handle older than 5 minutes | `That login handle has expired` |
| Argument fails the input schema | The SDK's validation message, naming the field (a tool result, not a JSON-RPC error) |

```json
{
  "content": [{ "type": "text", "text": "Not found in the Vulnetix VDB: ..." }],
  "isError": true,
  "_meta": { "vulnetix/plan": "community", "vulnetix/upstream": { "calls": 1, "ms": 210, "bytes": 0, "cached": false } }
}
```

> [!WHY] Why the daily quota is not an HTTP 429
> A transport-level 429 makes many clients retry the whole JSON-RPC exchange automatically. The quota resets at 00:00 UTC, so every one of those retries fails and burns more budget. The server returns the limit in band, with text telling the agent not to retry, and never retries a 429 itself.

## Degraded results

Composing tools return what succeeded. This is not an error result and `isError` is absent:

```json
"_meta": { "vulnetix/degraded": ["vendor-trends"] }
```

The failed section is replaced with `{"error": "<message>"}` in the payload. If every leg fails, the tool returns a normal error result.

## Resource read errors

`resources/read` returns JSON-RPC errors rather than tool results:

| Situation | Code |
|---|---|
| Record not in the VDB (upstream 404), or unknown `skill://` file | `-32602`, resource not found |
| Missing or badly percent-encoded URI variable | `-32602` |
| Any other upstream failure | `-32603`, with the same text a tool error would carry |

## Retry guidance

| Error | Retry |
|---|---|
| `-32602`, `-32020`, 403, 405, 415 | No. Fix the request. |
| `-32022` | Once, with a version from `data.supported`. |
| Edge 429 (`-32000`) | Yes, after a few seconds. |
| Tool 401, 403 | No. Fix the credential. |
| Tool 404 | No. Try an alias (a GHSA for a CVE, or the reverse). |
| Tool daily-quota error | No. Wait for the reset. |
| Tool timeout or network failure | Once. The server already retried GETs on 5xx and network errors. |
| One degraded section | Optionally, request that section alone. |
