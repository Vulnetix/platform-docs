---
title: VS Code and GitHub Copilot
description: Add the server to Copilot agent mode with .vscode/mcp.json and a password input, so the committed file never contains the key.
order: 5
nav: VS Code
sources:
  - mcp-server/src/apps/register.ts
  - mcp-server/src/prompts/register.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

VS Code runs MCP servers for GitHub Copilot in agent mode. Its `inputs` mechanism prompts once for a secret and stores it, so the config file holds only a reference.

## Workspace config with an input

`.vscode/mcp.json`:

```json
{
  "inputs": [
    {
      "id": "vulnetix-key",
      "type": "promptString",
      "description": "Vulnetix API key as orgId:hex",
      "password": true
    }
  ],
  "servers": {
    "vulnetix": {
      "type": "http",
      "url": "https://mcp.vulnetix.com/mcp",
      "headers": {
        "Authorization": "ApiKey ${input:vulnetix-key}"
      }
    }
  }
}
```

VS Code asks for the value on first start. Enter `<orgId>:<hex>` without the `ApiKey ` prefix, which is already in the header. The file is safe to commit; each teammate is asked for their own key.

## User config

Command palette, `MCP: Open User Configuration`, then add the same `inputs` and `servers` blocks. The server is then available in every workspace.

> [!CAREFUL] `servers`, not `mcpServers`
> VS Code uses `servers` and needs `"type": "http"`. A config copied from Cursor or Claude Desktop is parsed without error and never connects.

## Check it

1. Open Chat and set the mode to Agent.
2. Open the tools picker; `vulnetix` should be listed with its tools.
3. Command palette, `MCP: List Servers`, shows state and Show Output for logs. `MCP: Restart Server` applies config edits.

```text
Is CVE-2021-44228 in CISA KEV, and what was the remediation deadline?
```

## Prompts

Prompts appear as slash commands in chat, `/mcp.vulnetix.<prompt>`:

```text
/mcp.vulnetix.vulnetix_repo_impact
```

VS Code asks for the prompt's `arguments` value when the prompt declares one.

VS Code with Copilot is on the MCP Apps client matrix, so the KEV board, triage queue and CVE card may render inline. See [Apps](/mcp-server/protocol/apps/).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Server not listed | Use `servers` and `"type": "http"` |
| Asked for the key every session | The workspace is not trusted, so the input is not stored |
| Tools present, never called | Agent mode; check the tools picker has Vulnetix enabled |
| 401 | The input must be `<orgId>:<hex>` |
