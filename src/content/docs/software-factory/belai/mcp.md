---
title: MCP servers
description: Connect Model Context Protocol servers, how their tools appear, the two built-in servers, and why every result is treated as untrusted.
order: 10
sources: [belai/docs/mcp.md, belai/cmd/belai/mcp_builtin.go]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

Belai connects to Model Context Protocol servers and offers their tools to the model beside its own. Each server tool appears as `mcp__<server>__<tool>`, and **every result is treated as untrusted third-party text**: it is sanitised and classified like a web page.

## Configuring servers

Servers live under `mcp.servers` in your global settings. Each entry is keyed by its name and has a `transport` (`stdio`, the default, with a `command` and `args`, or `http` with a `url` and `headers`), `env`, `secrets`, the `tools` to offer, `timeout_ms` (60000 by default, at most 600000), whether to run it in the `sandbox`, and `disabled`. Secret values are kept in the credentials store, never in settings: `secrets` holds only names. A repository's settings cannot add a server.

`/mcp` manages servers: built-in switches, local and remote servers, and secrets. `belai mcp list`, `validate`, `import` and `export` do the same from the command line, and an MCP server can be kept in your [library](/software-factory/workforce/library/).

## Built-in servers

| Server | Offers | Switch |
|---|---|---|
| `clef` | A decision tool: the decision model answers a closed question, and can answer an ask when it is confident enough | `mcp.builtin.clef.enabled` (on), `mcp.builtin.clef.skip_ask` (on), `mcp.builtin.clef.skip_ask_at` (0.90) |
| `vulnetix` | The hosted Vulnetix tools, while you are signed in | `mcp.builtin.vulnetix.enabled` (on) |

Neither can be replaced or removed, and only your global settings can switch them.

## In code mode

In code mode, MCP tools are not offered directly; the model calls them from its script.

## Related

- [Providers and keys](/software-factory/workforce/providers-and-keys/) for MCP secrets from the vault.
