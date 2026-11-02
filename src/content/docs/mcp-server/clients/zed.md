---
title: Zed
description: Add the server to Zed's agent panel as a context server in settings.json.
order: 7
sources:
  - mcp-server/src/index.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Zed calls MCP servers context servers and configures them in `settings.json`. Open it with `zed: open settings` from the command palette.

```json
{
  "context_servers": {
    "vulnetix": {
      "url": "https://mcp.vulnetix.com/mcp",
      "headers": {
        "Authorization": "ApiKey <orgId>:<hex>"
      }
    }
  }
}
```

Some Zed releases also want `"source": "custom"` in the entry. If Zed rejects the block, check Agent Panel, Settings, Context Servers in your build or the [Zed MCP docs](https://zed.dev/docs/ai/mcp), and keep the `url` and `headers` values above.

`.zed/settings.json` in a repository works too, but it is committed by default; keep a literal key in the user settings file.

## Check it

Restart Zed. The agent panel's context-server list shows `vulnetix` running. Inline assist does not call MCP tools.

```text
What is the EPSS score and SSVC decision for CVE-2021-44228?
```

Errors are in the log: command palette, `zed: open log`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Server missing | Schema differs in your Zed version; see above |
| Running, no tools | URL must end in `/mcp`; restart rather than reload |
| 401 | `ApiKey <orgId>:<hex>` |
