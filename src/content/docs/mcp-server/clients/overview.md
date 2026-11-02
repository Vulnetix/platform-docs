---
title: Client setup
description: Which MCP clients connect to the server, the config file and key names each one uses, and the rules for keeping the API key out of a repository.
order: 1
nav: Overview
sources:
  - mcp-server/src/index.ts
  - mcp-server/src/discovery/server-card.ts
  - mcp-server/README.md
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Every client reaches the server the same way: a remote Streamable HTTP MCP server, one URL, one header. There is no local process to run.

```text
URL     https://mcp.vulnetix.com/mcp
Header  Authorization: ApiKey <orgId>:<hex>
```

A client works if it can add a remote HTTP MCP server and set a custom request header. The server's own requirements are on [Transport](/mcp-server/protocol/transport/). Client config formats are set by each client's vendor and change between releases; if a key below is rejected, check your client's MCP docs and keep the URL and header values the same.

## Clients

| Client | Config | Server list key | URL key | Watch out for |
|---|---|---|---|---|
| [Claude Code](/mcp-server/clients/claude-code/) | `claude mcp add`, `~/.claude.json`, `.mcp.json` | `mcpServers` | `url` | Project scope asks for approval on first use |
| [Claude Desktop](/mcp-server/clients/claude-desktop/) | Settings, Connectors, or `claude_desktop_config.json` | `mcpServers` | `url` | Needs a full quit, not a window close |
| [Cursor](/mcp-server/clients/cursor/) | `~/.cursor/mcp.json`, `.cursor/mcp.json` | `mcpServers` | `url` | Agent mode only |
| [VS Code and Copilot](/mcp-server/clients/vs-code/) | `.vscode/mcp.json`, user `mcp.json` | `servers` | `url` | Needs `"type": "http"` |
| [Windsurf](/mcp-server/clients/windsurf/) | `~/.codeium/windsurf/mcp_config.json` | `mcpServers` | `serverUrl` | `url` is silently ignored |
| [Zed](/mcp-server/clients/zed/) | `settings.json` | `context_servers` | `url` | Schema has moved between releases |
| [Cline and Roo Code](/mcp-server/clients/cline/) | `cline_mcp_settings.json`, `.roo/mcp.json` | `mcpServers` | `url` | `"type": "streamableHttp"` |
| [Goose](/mcp-server/clients/goose/) | `~/.config/goose/config.yaml` | `extensions` | `uri` | `type: streamable_http`; raise the timeout |
| [Continue](/mcp-server/clients/continue/) | `~/.continue/config.yaml` | `mcpServers` | `url` | `type: streamable-http`; agent mode only |
| [JetBrains AI Assistant](/mcp-server/clients/jetbrains/) | Settings, Tools, AI Assistant, MCP | `mcpServers` | `url` | Remote servers need a recent build |
| [Codex CLI](/mcp-server/clients/codex-cli/) | `~/.codex/config.toml` | `[mcp_servers.<name>]` | `url` | `codex mcp add` cannot set an `ApiKey` header |
| [Other clients](/mcp-server/clients/other-clients/) | varies | varies | varies | Generic recipe and the `mcp-remote` stdio bridge |
| [CI pipelines](/mcp-server/clients/ci-cd/) | generated at run time | varies | varies | Key from the secret store only |

## User scope or project scope

| Scope | Examples | Use it when | Risk |
|---|---|---|---|
| User | `~/.claude.json`, `~/.cursor/mcp.json`, VS Code user `mcp.json` | Always, by default | None for git: the file is outside every repository |
| Project | `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, `.zed/settings.json` | The whole team should get the server | The file is committed. Use the client's variable or `inputs` syntax, never a literal key. |

> [!CAREFUL] A project config with a literal key will be committed
> These are ordinary files. `git add -A` stages them without comment. If a key has been pushed, rotate it and treat the old one as public.

## Restart after editing

Nearly every client reads MCP configuration once at launch and caches the tool list. Quit and reopen the app before you decide the config is wrong. Then follow [Verify your setup](/mcp-server/get-started/verify/).

## Tool counts

The server contributes 31 tools and 18 prompts. Some clients cap how many tools they send to a model across all servers. If the agent ignores a tool it should use, disable servers or tools you are not using.
