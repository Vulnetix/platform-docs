---
title: Claude Desktop
description: Connect Claude Desktop through a custom connector or the claude_desktop_config.json file, and what the app can and cannot do with the prompts.
order: 3
sources:
  - mcp-server/src/index.ts
  - mcp-server/src/apps/register.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Claude Desktop adds remote MCP servers as custom connectors, and local ones through its config file.

## Option 1: custom connector

1. Settings, Connectors, Add custom connector.
2. Name `Vulnetix`, URL `https://mcp.vulnetix.com/mcp`.
3. If the dialog offers custom request headers, add `Authorization` with `ApiKey <orgId>:<hex>`.
4. Save, then quit Claude Desktop fully and reopen it.

The server has no OAuth authorization server, so leave any OAuth client fields empty. If your build's connector dialog has no header field, the connector will list the tools but every VDB tool returns a credential error; use option 2.

## Option 2: config file with the stdio bridge

`claude_desktop_config.json` launches local commands. The [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) package bridges stdio to the remote endpoint and adds the header. It needs Node.js.

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

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

Keep the value in `env` and the `--header` argument free of spaces: `mcp-remote` substitutes `${VAR}` from `env`, and a space inside an argument breaks on some platforms.

> [!CAREFUL] Closing the window is not quitting
> On macOS use Cmd+Q or Claude, Quit. On Windows exit from the tray icon. A connector added without a full restart shows in Settings but never connects.

## Check it

The tools menu in the message box lists the Vulnetix tools. Then:

```text
Look up CVE-2021-44228 and tell me whether it is in the CISA KEV catalogue.
```

Claude asks before the first tool call in a chat.

## What works in Claude Desktop

| Feature | Works |
|---|---|
| All 31 tools | Yes |
| Prompts, from the + menu under the server name | Listed, but every one needs a shell and a repository, which Claude Desktop does not have |
| [MCP Apps](/mcp-server/protocol/apps/) (KEV board, triage queue, CVE card) | Listed by the MCP Apps client matrix as supported; not yet tested in a real host |

Use Claude Code or another agent with a terminal for the prompts.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Connector saved but never connects | Quit fully and reopen |
| "Could not attach to MCP server" | URL must end in `/mcp`; check for a TLS-inspecting proxy |
| Every VDB tool says no credential was supplied | No header reached the server; use option 2 |
| `npx` not found (option 2) | Install Node.js, or give the full path to `npx` in `command` |
