---
title: Troubleshooting
description: Symptoms seen when connecting a client or calling a tool, the cause of each, and the check that confirms it.
order: 8
sources:
  - mcp-server/src/index.ts
  - mcp-server/src/auth/credential.ts
  - mcp-server/src/tools/result.ts
  - mcp-server/src/shaping/filters/exploits.ts
  - mcp-server/src/shaping/filters/threat.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Run the four checks in [Verify your setup](/mcp-server/get-started/verify/) first. They tell you whether the server, the network, the credential or the client config is the problem.

| Symptom | Cause | Check or fix |
|---|---|---|
| No Vulnetix tools in the client | Client was reloaded, not restarted | Quit the app fully and reopen. Most clients read MCP config once at launch. |
| No Vulnetix tools in the client | Invalid JSON (trailing comma, smart quotes) | `jq . <file>` |
| No Vulnetix tools in the client | Wrong key names for this client | See the table below |
| Every VDB tool returns 401 | Header has only the hex half of the key | Value must be `ApiKey <orgId>:<hex>` |
| Every VDB tool returns "Vulnetix request failed: No Vulnetix credential was supplied" | Header missing, or not in a format the server parses | See [header formats](#header-formats) |
| Results contain a literal `${VULNETIX_KEY}` | The client did not expand the variable, or the app did not inherit your shell environment | Use the client's own interpolation syntax, or a literal value in a user-scoped file |
| `-32602 Invalid _meta envelope` | Hand-built request is missing an `io.modelcontextprotocol/*` key | Add all three `_meta` keys. See [Transport](/mcp-server/protocol/transport/). |
| `-32020` | `Mcp-Name` or `Mcp-Method` differs from the body | Set them to the body's `method` and `params.name` |
| `-32022` | Client asked for a protocol version the server does not serve | Use `2026-07-28` or `2025-11-25` |
| 403 with no body | `Origin` or `Host` not allowed, often a proxy rewriting `Host` | Call `https://mcp.vulnetix.com/health` directly |
| An exploit or IOC list is empty | Records are withheld below Pro | Check the count and `gated`/`note` before concluding there are none |
| "Do NOT retry this call" | Daily quota exhausted | Wait for the reset time in the message |
| HTTP 429 with `-32000` | Edge flood guard: more than 100 requests in 10 s from one IP | Slow down; it clears after 10 s |
| Tool times out in the client | Cold upstream call; the server allows 45 s per attempt | Raise the client's timeout. Goose needs 60. |
| Agent lists tools but never calls them | Client is in chat or inline-edit mode, the model lacks tool calling, or the client's tool cap is exceeded | Switch to the agent mode; disable unused servers |
| A result looks cut short | Response shaping | Read `_meta["vulnetix/shaping"]`; use `detail: "full"`, the `vulnetix://vuln/{id}/full` resource, or `vdb_request` |
| Same answer after an upstream change | Edge cache, 5 minutes to 24 hours depending on the tool | `_meta["vulnetix/upstream"].cached`. See [Limits](/mcp-server/reference/limits/). |
| Sign-in tools say `MCP_AEAD_KEY is not configured` | Self-hosted deployment without the secret | `wrangler secret put MCP_AEAD_KEY`, 32 or more characters |

## Key names by client

| Client | Server list key | URL key | Transport value |
|---|---|---|---|
| Claude Code, Claude Desktop, JetBrains | `mcpServers` | `url` | `"type": "http"` |
| Cursor | `mcpServers` | `url` | none needed |
| VS Code | `servers` | `url` | `"type": "http"` |
| Windsurf | `mcpServers` | `serverUrl` | none needed |
| Cline, Roo Code | `mcpServers` | `url` | `"type": "streamableHttp"` |
| Zed | `context_servers` | `url` | none needed |
| Goose | `extensions` | `uri` | `type: streamable_http` |
| Continue | `mcpServers` (YAML list) | `url` | `type: streamable-http` |
| Codex CLI | `[mcp_servers.<name>]` (TOML) | `url` | none needed |

## Header formats

The server parses `Authorization` in two forms and forwards it unchanged to vdb-api:

| Form | Accepted when |
|---|---|
| `ApiKey <orgId>:<hex>` | `orgId` is a UUID and the colon is present |
| `Bearer <token>` | the token is non-empty |

`ApiKey` with no colon, `ApiKey` with a non-UUID org id, or any other scheme is treated as no credential at all. Ask the agent to run `vulnetix_auth_status`: `authenticated: false` means the header did not parse.

## Still stuck

Open an issue at [Vulnetix/mcp-server](https://github.com/Vulnetix/mcp-server/issues) with the client and version, the config block with the key removed, the error text, and the `_meta` object from the failing result.
