---
title: HTTP endpoints
description: Every path the server answers on mcp.vulnetix.com, the methods each accepts, the checks that run before it, and the response it returns.
order: 4
sources:
  - mcp-server/src/index.ts
  - mcp-server/src/config.ts
  - mcp-server/src/discovery/server-card.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Base URL: `https://mcp.vulnetix.com`.

| Path | Methods | Auth | Returns |
|---|---|---|---|
| `/mcp` | `POST` | `Authorization` header, optional at the transport | The MCP endpoint. JSON or SSE, chosen per request. |
| `/mcp/server-card` | `GET`, `HEAD`, `OPTIONS` | none | MCP Server Card, `application/mcp-server-card+json` |
| `/.well-known/oauth-protected-resource` | any | none | RFC 9728 Protected Resource Metadata |
| `/.well-known/oauth-protected-resource/mcp` | any | none | The same document |
| `/health` | any | none | `{"ok":true,"service":"vulnetix-mcp","protocol":"2026-07-28","commit":"<sha>"}` |
| anything else | any | none | 404, JSON-RPC `-32601` naming `/mcp` |

## Order of checks

Requests are checked in this order. The first failing check answers.

1. `Host` must be an allowed hostname, or 403.
2. `/mcp/server-card` is answered here, so a browser-based crawler is not turned away by the `Origin` check.
3. `Origin`, when present, must be an allowed hostname, or 403.
4. `/.well-known/oauth-protected-resource` and `/health` are answered.
5. Any other path than `/mcp` gets 404.
6. Any method other than `POST` gets 405 with `Allow: POST`.
7. `Content-Type` must be `application/json`, or 415.
8. The `Authorization` header is parsed, and the request goes to the MCP handler.

Allowed hostnames: `mcp.vulnetix.com`, `mcp-server.cloud-account.workers.dev`, `localhost`, `127.0.0.1`, plus any in the `ALLOWED_HOSTS` variable. Ports are ignored.

## `/mcp`

Protocol revision `2026-07-28` removed the GET event stream and the DELETE session teardown, so both return 405. Requests from 2025-era clients are answered statelessly on the same path. See [Transport](/mcp-server/protocol/transport/).

A request without a credential is not rejected here. The sign-in tools need to work exactly when you have no credential. Tools that call vdb-api return an error result instead.

## `/mcp/server-card`

```bash
curl -s https://mcp.vulnetix.com/mcp/server-card
```

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
  "name": "com.vulnetix/mcp",
  "version": "0.1.0",
  "title": "Vulnetix",
  "description": "Vulnerability intelligence: CVE triage, exploits, KEV deadlines, remediation, package risk.",
  "websiteUrl": "https://docs.mcp.vulnetix.com",
  "repository": { "url": "https://github.com/Vulnetix/mcp-server", "source": "github" },
  "remotes": [{
    "type": "streamable-http",
    "url": "https://mcp.vulnetix.com/mcp",
    "supportedProtocolVersions": ["2026-07-28", "2025-11-25"],
    "headers": [{ "name": "Authorization", "isRequired": true, "isSecret": true, "placeholder": "ApiKey <orgId>:<64-hex>" }]
  }]
}
```

The `icons` array and the header `description` and `format` fields are omitted above. The card lists no tools, prompts or capabilities; read those from the live protocol. It is served with `Access-Control-Allow-Origin: *`, `Cache-Control: public, max-age=3600` and an `ETag`. A matching `If-None-Match` gets 304. `POST` and other methods get 405.

> [!CAREFUL] Provisional path
> The Server Card extension (SEP-2127) is still in incubation and its reserved path may move.

## `/.well-known/oauth-protected-resource`

```json
{
  "resource": "https://mcp.vulnetix.com/mcp",
  "authorization_servers": [],
  "bearer_methods_supported": ["header"],
  "resource_name": "Vulnetix VDB",
  "resource_documentation": "https://docs.cli.vulnetix.com/"
}
```

`authorization_servers` is empty: there is no OAuth authorization server. The document is published so that adding one later does not change anything for clients that already probe this path. Cached for 3600 seconds, `Access-Control-Allow-Origin: *`.

## `/health`

`commit` is the Git SHA of the deployed build, stamped in by `scripts/build-info.mjs` at build time. A post-deploy check compares it with the pushed commit.
