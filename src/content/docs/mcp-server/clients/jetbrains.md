---
title: JetBrains AI Assistant
description: Add the server to IntelliJ IDEA, PyCharm, GoLand, WebStorm and other JetBrains IDEs through AI Assistant's MCP settings.
order: 11
nav: JetBrains
sources:
  - mcp-server/src/index.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

JetBrains AI Assistant configures MCP servers per IDE. MCP is part of the paid AI Assistant feature set.

## Settings

1. Settings, Tools, AI Assistant, Model Context Protocol (MCP).
2. Add (`+`) and choose the remote or HTTP server type.
3. URL `https://mcp.vulnetix.com/mcp`.
4. Header `Authorization` = `ApiKey <orgId>:<hex>`.
5. Apply, then restart the IDE.

The same panel has Edit as JSON:

```json
{
  "mcpServers": {
    "vulnetix": {
      "type": "http",
      "url": "https://mcp.vulnetix.com/mcp",
      "headers": {
        "Authorization": "ApiKey <orgId>:<hex>"
      }
    }
  }
}
```

> [!CAREFUL] Older builds accept stdio only
> The MCP settings have moved across releases, and some builds accepted only local stdio servers. If the panel is missing or rejects a URL, update the IDE and the AI Assistant plugin, or use the [`mcp-remote` bridge](/mcp-server/clients/other-clients/).

Junie, JetBrains' separate agent, has its own MCP support. If it cannot add a remote server on your build, use AI Assistant.

## Check it

Open the AI Assistant tool window in a mode that allows tools. The tools list includes Vulnetix.

```text
Do this project's Maven dependencies include anything in the CISA KEV catalogue?
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| No MCP panel | Update the IDE and AI Assistant plugin |
| Server added, no tools | Restart the IDE; use a chat mode that allows tools |
| 401 | `ApiKey <orgId>:<hex>` |
