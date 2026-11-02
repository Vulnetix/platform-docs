---
title: MCP servers
description: Remote MCP servers are declared on the wire and governed with mcp_allow and mcp_deny; local MCP servers are flattened into tools and governed with tool rules on their name prefix.
order: 14
sources:
  - ai-firewall/internal/anthropic/capabilities.go
  - ai-firewall/internal/openai/capabilities.go
  - ai-firewall/internal/kiro/capabilities.go
  - ai-firewall/internal/wire/capability.go
  - ai-firewall/internal/policy/capability.go
checked: [ai-firewall@339de55]
updated: 02 Nov 2026
---

An MCP server reaches the gateway in one of two shapes, and a rule written for one does nothing to the other.

| Shape | On the wire | Governed with | Strip removes |
|---|---|---|---|
| Remote | A server the client asks the **provider** to call, with a label and URL | `mcp_allow`, `mcp_deny` on the label | the whole server entry, URL and token included |
| Local (stdio) | Nothing. The client has already merged the server's tools into `tools`. | `tool_allow`, `tool_deny` on the tool name prefix | the matching tools |

## Remote MCP servers

| Surface | Field | Label matched | URL recorded |
|---|---|---|---|
| Anthropic Messages | top-level `mcp_servers[]` | `name` | `url` |
| OpenAI Responses | `tools[]` entry with `type: mcp` | `server_label` | `server_url` |
| OpenAI Chat Completions, Kiro | none | | |

```json
{
  "mcp_servers": [
    {
      "type": "url",
      "name": "jira",
      "url": "https://mcp.atlassian.com/v1/sse",
      "authorization_token": "..."
    }
  ]
}
```

```bash
vulnetix ai-firewall policy guardrail no-remote-mcp \
  --rule-type mcp_deny --action strip --pattern '*' --priority 102
```

`strip` removes the whole entry, so the provider never receives the URL or the token. On the Responses surface the gateway also records `mcp_call`, `mcp_list_tools` and `mcp_approval_request` items as invoked, so a `block` refuses a conversation that has already used the server.

The URL is stored in the inventory as `scheme://host/path` only. The query string and any userinfo are dropped before storage, because tokens travel in both, and a URL that will not parse is not stored at all.

The baseline's `agent-remote-mcp-server` rule flags every remote MCP server (`mcp_deny`, pattern `*`) at priority 102.

## Local MCP servers

A stdio server runs on the developer's machine and the client talks to it directly. By the time a request exists, the server's tools are ordinary entries in `tools`. The gateway records those tools in the inventory as `tool` rows; it does not infer a server from their names. An `mcp_*` rule has nothing to match.

Govern a local server with a tool rule on the client's naming convention:

| Client | Tool naming |
|---|---|
| Claude Code | `mcp__<server>__<tool>` |
| Codex CLI | `<server>__<tool>` |
| Cursor | `mcp_<server>_<tool>` |

```bash
vulnetix ai-firewall policy guardrail no-local-jira \
  --rule-type tool_deny --action strip --pattern 'mcp__jira__*' --priority 100
```

The naming is a client convention, not part of MCP. A client that names its tools differently is not matched by the prefix.

## Shadow MCP servers

A developer adds an MCP server to a local config, with a long-lived token for the issue tracker or a production database. It appears in no repository, ticket or asset register, and from then on every prompt that developer's agent sends can reach that system. The request is the one place it is always visible. Run with no MCP rules for a couple of weeks and read the [inventory](/ai-firewall/operations/inventory/) before writing any.

[Hold for review](/ai-firewall/policy/hold-for-review/) handles new servers automatically: a remote server or a tool no rule names is stripped until someone approves it.

## Allowlisting approved servers

```bash
vulnetix ai-firewall policy guardrail approved-remote-mcp \
  --rule-type mcp_allow --action strip --pattern jira --priority 100
```

This puts the MCP family into allowlist mode: every remote server except `jira` is stripped. It covers remote servers only.

> [!CAREFUL] A tool allowlist covers the agent's own tools too
> Local servers are allowlisted with `tool_allow` on their prefix, which puts the whole tool family into allowlist mode, including `Read`, `Edit` and `Bash`. A single `tool_allow` for `mcp__jira__*` refuses or strips every other tool. Allowlist the agent's own tools in the same change, or use deny rules.

## In the console

The MCP tab (`#mcp`) lists remote servers from the inventory with Deny and Allow buttons. Tool calls (`#tools`) lists every tool, local MCP tools included.

## Related

- [Tool rules](/ai-firewall/policy/tools/)
- [Inventory](/ai-firewall/operations/inventory/)
- [Glob reference](/ai-firewall/reference/glob-reference/)
