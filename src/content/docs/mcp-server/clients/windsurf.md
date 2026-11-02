---
title: Windsurf
description: Add the server to Windsurf's Cascade agent in mcp_config.json, using serverUrl rather than url.
order: 6
sources:
  - mcp-server/src/index.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Windsurf's Cascade agent reads remote MCP servers from `~/.codeium/windsurf/mcp_config.json`. The same file opens from Settings, Cascade, MCP Servers, Manage, View raw config.

```json
{
  "mcpServers": {
    "vulnetix": {
      "serverUrl": "https://mcp.vulnetix.com/mcp",
      "headers": {
        "Authorization": "ApiKey <orgId>:<hex>"
      }
    }
  }
}
```

> [!CAREFUL] `serverUrl`, not `url`
> A Cursor or Claude Desktop entry copied across with `url` is parsed and never contacted. No error is shown.

Save, then press Refresh in the MCP panel. Restart Windsurf if the server still does not appear.

## Check it

The MCP panel lists `vulnetix` with a tool count. MCP tools are used by Cascade, not by inline completion.

```text
Check whether express has any known vulnerabilities and recommend a safe version.
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| Server does not appear | `serverUrl` instead of `url` |
| Zero tools | Refresh; check the URL ends in `/mcp`; validate with `jq .` |
| Tools ignored | Windsurf limits the tools exposed at once; disable unused servers |
| 401 | `ApiKey <orgId>:<hex>` |
