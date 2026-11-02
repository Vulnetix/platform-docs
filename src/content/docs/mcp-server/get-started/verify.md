---
title: Verify your setup
description: Four checks, each a command you can paste, that isolate whether a problem is the server, the network, the credential or the client config.
order: 5
sources:
  - mcp-server/src/index.ts
  - mcp-server/scripts/conformance.sh
  - mcp-server/scripts/client-check.mjs
  - mcp-server/src/tools/auth.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Run these in order. Each one rules out a layer.

## 1. The server is up

```bash
curl -s https://mcp.vulnetix.com/health
```

```json
{"ok":true,"service":"vulnetix-mcp","protocol":"2026-07-28","commit":"1725a0407b688c7514e324a16501cbf33b0a2c20"}
```

A timeout, an HTML page or a certificate error is the network: check a proxy or TLS-inspecting middlebox. A 403 means something rewrote the `Host` header.

## 2. The protocol answers

`tools/list` needs no credential.

```bash
curl -sS -X POST https://mcp.vulnetix.com/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2026-07-28' \
  -H 'Mcp-Method: tools/list' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"_meta":{
        "io.modelcontextprotocol/protocolVersion":"2026-07-28",
        "io.modelcontextprotocol/clientInfo":{"name":"curl","version":"1"},
        "io.modelcontextprotocol/clientCapabilities":{}}}}' | head -c 300
```

You should see a JSON-RPC `result` with a `tools` array. `-32602 Invalid _meta envelope` means one of the three `_meta` keys is missing: revision 2026-07-28 carries version, client info and capabilities on every request instead of in a handshake.

## 3. The credential is accepted

Set `VULNETIX_AUTH` to the part after `ApiKey `, that is `<orgId>:<hex>`.

```bash
export VULNETIX_AUTH='<orgId>:<hex>'
curl -sS -X POST https://mcp.vulnetix.com/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2026-07-28' \
  -H 'Mcp-Method: tools/call' \
  -H 'Mcp-Name: vulnetix_kev' \
  -H "Authorization: ApiKey ${VULNETIX_AUTH}" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{
        "name":"vulnetix_kev","arguments":{"limit":1},"_meta":{
        "io.modelcontextprotocol/protocolVersion":"2026-07-28",
        "io.modelcontextprotocol/clientInfo":{"name":"curl","version":"1"},
        "io.modelcontextprotocol/clientCapabilities":{}}}}' | head -c 400
```

A KEV item means the credential works. `"isError":true` with `HTTP 401` means vdb-api rejected it. "No Vulnetix credential was supplied" means the header did not parse: check both halves and the colon.

`Mcp-Name` must equal `params.name`, or the server answers 400 with `-32020`.

## 4. The client sees it

| Client | Check |
|---|---|
| Claude Code | `claude mcp list`, or `/mcp` in a session |
| Claude Desktop | Settings, Connectors |
| Cursor | Settings, Cursor Settings, MCP: a green dot and a tool count |
| VS Code | Command palette, `MCP: List Servers`, then Show Output |
| Windsurf | Cascade MCP panel, Refresh |
| Zed | Agent panel, context servers; `zed: open log` for errors |
| Cline, Roo Code | MCP Servers panel |
| Goose | `goose info` |
| Codex CLI | `codex mcp get vulnetix` |

If checks 1 to 3 pass and this fails, the problem is the config file: wrong path, invalid JSON, wrong key names, or a reload instead of a restart.

Then ask the agent:

```text
Run vulnetix_auth_status and tell me which organisation I am connected as.
```

```json
{
  "authenticated": true,
  "scheme": "ApiKey",
  "orgId": "56351b1a-18aa-48c5-9fea-9cc210a87235",
  "note": "Plan tier is reported by vdb-api on each response, not derived from the credential. Any tool result's `_meta['vulnetix/plan']` shows the tier that call was served at."
}
```

Your plan is in `_meta["vulnetix/plan"]` on any VDB tool result.

## With the official client SDK

The repository's `scripts/client-check.mjs` drives the endpoint with `@modelcontextprotocol/client`: version negotiation, tool discovery, argument validation, prompt retrieval and result decoding.

```bash
git clone https://github.com/Vulnetix/mcp-server.git && cd mcp-server && yarn install
node scripts/client-check.mjs https://mcp.vulnetix.com/mcp "ApiKey ${VULNETIX_AUTH}"
```

Still failing: [Troubleshooting](/mcp-server/reference/troubleshooting/).
