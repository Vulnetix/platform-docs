---
title: Other clients
description: The generic settings for any MCP client, the mcp-remote bridge for stdio-only clients, and the clients expected to work but not yet tested.
order: 13
sources:
  - mcp-server/src/index.ts
  - mcp-server/src/mcp/server.ts
  - mcp-server/src/discovery/server-card.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

## Generic settings

| Field | Value |
|---|---|
| Transport | Streamable HTTP |
| URL | `https://mcp.vulnetix.com/mcp` |
| Header name | `Authorization` |
| Header value | `ApiKey <orgId>:<hex>` |
| Auth type, if asked | Custom header or none. Not OAuth. |
| Protocol versions | `2026-07-28`, and `2025-11-25` through the stateless legacy path |

The endpoint takes `POST` only. `GET` and `DELETE` return 405.

### Names clients use

| Concept | Spellings |
|---|---|
| Server list | `mcpServers`, `servers`, `context_servers`, `extensions`, `mcp_servers` |
| URL | `url`, `serverUrl`, `uri`, `endpoint` |
| Transport | `http`, `streamableHttp`, `streamable-http`, `streamable_http` |
| Headers | `headers`, `http_headers`, `requestOptions.headers` |

## Discovery

A client or registry that reads [MCP Server Cards](/mcp-server/reference/http-endpoints/) can fetch `https://mcp.vulnetix.com/mcp/server-card`, which names the endpoint, the transport and the required `Authorization` header.

## Stdio-only clients

A client that can only launch a local command can use [`mcp-remote`](https://www.npmjs.com/package/mcp-remote), which speaks stdio to the client and HTTP to the server. It needs Node.js.

```json
{
  "mcpServers": {
    "vulnetix": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://mcp.vulnetix.com/mcp",
        "--header", "Authorization:${VULNETIX_AUTH_HEADER}"
      ],
      "env": {
        "VULNETIX_AUTH_HEADER": "ApiKey <orgId>:<hex>"
      }
    }
  }
}
```

No space after `Authorization:` in the argument. `mcp-remote` splits on the first colon, and keeping the value in `env` avoids spaces inside an argument, which some platforms split.

> [!CAREFUL] Third-party bridge
> `mcp-remote` is not maintained by Vulnetix. It adds a Node.js process and a dependency to keep current. Prefer a client that supports remote HTTP.

## Expected to work, not tested

These document remote MCP with custom headers but have not been run against this server: Amp, Warp, Trae, Qodo Gen, Sourcegraph Cody, LibreChat, Open WebUI, Msty, BoltAI, 5ire, Witsy. Report results on [GitHub](https://github.com/Vulnetix/mcp-server/issues).

## Will not work

A client that cannot set a request header. It can connect and list tools, and the sign-in tools run, but every VDB tool returns a credential error because the server has no anonymous mode and no OAuth authorization server.
