---
title: Cline and Roo Code
description: Add the server to the Cline or Roo Code VS Code extensions with a streamableHttp entry, and which tools are reasonable to auto-approve.
order: 8
nav: Cline and Roo Code
sources:
  - mcp-server/src/tools/auth.ts
  - mcp-server/src/tools/vuln.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Cline and its fork Roo Code have their own MCP settings, separate from VS Code's `mcp.json`.

| Extension | Open the config |
|---|---|
| Cline | MCP Servers icon, Configure MCP Servers, which opens `cline_mcp_settings.json` |
| Roo Code | MCP panel, Edit Global MCP; or `.roo/mcp.json` in the project |

```json
{
  "mcpServers": {
    "vulnetix": {
      "type": "streamableHttp",
      "url": "https://mcp.vulnetix.com/mcp",
      "headers": {
        "Authorization": "ApiKey <orgId>:<hex>"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Both extensions reload MCP config on save.

> [!CAREFUL] Not `sse`
> Older Cline docs show `"type": "sse"`. That transport is gone: revision 2026-07-28 removed the standalone event stream, and `GET /mcp` returns 405.

## Check it

The MCP Servers panel shows `vulnetix` green with its tool list. Tools are called in Act mode, not Plan mode.

```text
Look up GHSA-jfh8-c2jp-5v3q and tell me whether it is being exploited.
```

## Auto-approve

`autoApprove` lists tools that run without asking. All 27 VDB tools are read-only (`readOnlyHint: true`) and none touches your files, so auto-approval is safe for them. Seeing each call is still how you notice an agent querying the wrong package or looping through your quota. A short list of single lookups is a reasonable start:

```json
"autoApprove": ["vulnetix_vuln", "vulnetix_kev_status", "vulnetix_package_search"]
```

Leave `vulnetix_auth_start` and `vulnetix_auth_poll` off the list; they mint sign-in codes.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Server red | Validate the JSON; `type` must be `streamableHttp` |
| Nothing after saving | Set `disabled` to `true`, save, then back to `false` |
| Too many tools for the model | Disable individual tools in the panel |
| 401 | `ApiKey <orgId>:<hex>` |
