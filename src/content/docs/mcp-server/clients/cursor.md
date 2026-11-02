---
title: Cursor
description: Add the server to Cursor in the global or project mcp.json, with the key kept out of the repository.
order: 4
sources:
  - mcp-server/src/index.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Cursor connects to remote HTTP MCP servers from `mcp.json`. No `type` field is needed when `url` is set.

## Global (recommended)

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "vulnetix": {
      "url": "https://mcp.vulnetix.com/mcp",
      "headers": {
        "Authorization": "ApiKey <orgId>:<hex>"
      }
    }
  }
}
```

The server is available in every project and the key is outside every repository.

## Project

`.cursor/mcp.json` in the repository root, with the key read from the environment. Cursor's interpolation syntax is `${env:NAME}`:

```json
{
  "mcpServers": {
    "vulnetix": {
      "url": "https://mcp.vulnetix.com/mcp",
      "headers": {
        "Authorization": "ApiKey ${env:VULNETIX_AUTH}"
      }
    }
  }
}
```

Set `VULNETIX_AUTH` to `<orgId>:<hex>` in the environment Cursor starts from. Launched from a desktop icon, Cursor may not see variables set in your shell profile; launch it from a terminal, or use the global file.

> [!CAREFUL] `.cursor/mcp.json` is committed by default
> Use the variable form above or add the file to `.gitignore`. If a literal key was pushed, rotate it.

## Check it

Restart Cursor. Settings, Cursor Settings, MCP should show `vulnetix` with a green dot and a tool count. Open the Agent panel; MCP tools are used in Agent mode, not in inline edit.

```text
Check whether CVE-2021-44228 is in the CISA KEV catalogue and what the due date was.
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| Red dot in the MCP panel | Invalid JSON. Run the file through `jq .`. |
| Green dot, tools never used | Use Agent mode. Cursor caps the tools it sends to the model; disable unused servers. |
| 401 or no credential | `ApiKey <orgId>:<hex>`, both halves |
| Variable sent literally | Use `${env:NAME}`, and check Cursor inherited the variable |
