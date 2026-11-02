---
title: Transport and protocol
description: The wire contract for writing or debugging a client, covering supported protocol revisions, required headers, the per-request _meta envelope, capabilities and cache hints.
order: 1
nav: Transport
sources:
  - mcp-server/src/index.ts
  - mcp-server/src/mcp/server.ts
  - mcp-server/scripts/conformance.sh
  - mcp-server/SDK-NOTES.md
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

You do not need this page to connect a client. It is for writing a client, or reading a `-32602` by hand.

## Revisions

| Revision | How it is served |
|---|---|
| `2026-07-28` | Current. Stateless; version, client info and capabilities on every request. |
| `2025-11-25` and earlier | Through the SDK's stateless legacy path (`legacy: "stateless"`). No session id is issued; GET and DELETE still return 405. |

> [!WHY] Why both eras are served
> `@modelcontextprotocol/client` 2.0.0 defaults `versionNegotiation.mode` to `'legacy'`, so an unconfigured client opens at `2025-11-25`. Rejecting legacy requests would lock out most clients. Opt a client into the current revision with `{ versionNegotiation: { mode: 'auto' } }`.

## Endpoint

```text
POST https://mcp.vulnetix.com/mcp
```

Responses are JSON or an SSE stream, chosen per request (`responseMode: "auto"`). There is no standalone event stream and no session to tear down.

## Request headers

```http
POST /mcp HTTP/1.1
Host: mcp.vulnetix.com
Content-Type: application/json
Accept: application/json, text/event-stream
MCP-Protocol-Version: 2026-07-28
Mcp-Method: tools/call
Mcp-Name: vulnetix_vuln
Authorization: ApiKey <orgId>:<hex>
```

| Header | Rule |
|---|---|
| `Content-Type` | Must be `application/json`, or 415 |
| `Mcp-Method` | Must equal the body's `method`, or 400 `-32020` |
| `Mcp-Name` | For `tools/call`, must equal `params.name`; for `resources/read`, `params.uri`. Mismatch is 400 `-32020`. |
| `Origin` | If sent, must be an allowed host, or 403 |
| `Authorization` | Optional at the transport; required by every VDB tool |
| `traceparent`, `tracestate` | Forwarded to vdb-api when they match the W3C format |

`Mcp-Method` and `Mcp-Name` let a gateway route or rate-limit without parsing the body. Checking that they match the body stops a proxy and the server acting on different values.

## The `_meta` envelope

Every `2026-07-28` request carries three keys in `params._meta`:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "vulnetix_vuln",
    "arguments": { "identifier": "CVE-2021-44228" },
    "_meta": {
      "io.modelcontextprotocol/protocolVersion": "2026-07-28",
      "io.modelcontextprotocol/clientInfo": { "name": "my-client", "version": "1.0.0" },
      "io.modelcontextprotocol/clientCapabilities": {}
    }
  }
}
```

A missing key returns `-32602 Invalid _meta envelope`, which is checked before the version. The error names the missing key.

## Capabilities

`server/discover` reports:

| Capability | Value |
|---|---|
| `tools` | `{}` |
| `prompts` | `{}` |
| `resources` | `{}` |
| `extensions` | `io.modelcontextprotocol/skills`, `io.modelcontextprotocol/ui` |

Server info: name `vulnetix`, title `Vulnetix`, version `0.1.0`, `websiteUrl` and two PNG icons. The `instructions` string tells the model that responses are shaped, that every request needs a credential, and that empty plan-gated lists mean withheld.

The Tasks extension is not advertised. Tasks need status held across polls, and the server holds nothing between requests.

## Cache hints

| Method | `ttlMs` | `cacheScope` |
|---|---|---|
| `tools/list` | 300000 | `public` |
| `prompts/list` | 300000 | `public` |
| `resources/templates/list` | 300000 | `public` |
| `server/discover` | 300000 | `public` |

The tool list is the same for every caller and does not change within a deploy.

## Tool results

A tool failure is a result with `isError: true` and HTTP 200, not a JSON-RPC error. Argument validation failures come back the same way. See [Errors](/mcp-server/reference/errors/).

## Checking a deployment

`scripts/conformance.sh` in the repository checks the wire contract with curl: 405 for GET and DELETE, 415, 403 for a hostile `Origin`, `-32022`, `-32020`, `-32601`, tool and prompt listing, resources and skills.

```bash
git clone https://github.com/Vulnetix/mcp-server.git && cd mcp-server
bash scripts/conformance.sh https://mcp.vulnetix.com
```
