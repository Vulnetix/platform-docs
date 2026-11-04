---
title: Capability inventory
nav: Inventory
description: The tools, MCP servers and skills the gateway has seen your organisation's agents carry, how each row is learnt, and how to read and clear it from the Resolve Platform, the CLI and the API.
order: 1
sources:
  - ai-firewall/internal/inventory/inventory.go
  - ai-firewall/internal/db/inventory.go
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/config/config.go
  - vdb-site/api/internal/handler/ai_firewall_inventory.go
  - vdb-site/api/internal/handler/ai_firewall_inventory_clients.go
  - vdb-api/internal/handler/v2_cli_ai_firewall_inventory.go
  - cli/cmd/ai_firewall_inventory.go
  - website/src/pages/resolve/ai-firewall-tabs.ts
checked: [ai-firewall@339de55, vdb-site@1a06d67, vdb-api@4145f0a, cli@4c8c3b7, website@ad775f3]
updated: 02 Nov 2026
---

The inventory lists every tool, MCP server and skill your organisation's agents have sent through the gateway. Coding agents re-send their whole tool list on every turn, so an MCP server a developer wired into a local config yesterday appears here the first time that agent makes a request, whether or not it is in any manifest. A repository scan with `vulnetix aibom` finds what is written down; the inventory finds what ran.

It is recorded for every organisation on every plan, and does not need inference logging. It holds names, MCP server URLs and client names only. No prompt, completion, tool argument or tool result is read to build it.

Use it to find the exact names to write [tool](/ai-firewall/policy/tools/), [MCP](/ai-firewall/policy/mcp-servers/) and [skill](/ai-firewall/policy/skills/) rules against.

## What a row holds

| Field | Value |
|---|---|
| `kind` | `tool`, `mcp_server` or `skill` |
| `identity` | The name a capability rule matches, for example `Bash` or `mcp__github__create_issue` |
| `detail` | An MCP server's URL, or a built-in tool's block type |
| `source` | How it was learnt: `declared` (read verbatim from the request), `invoked` (seen being called), `inferred` (derived from a naming convention, as skills are) |
| `clientName`, `clientVersion` | The calling agent from its headers, `unknown` when none matched. Self-reported. |
| `providerSlug`, `wire` | Where the request went and on which surface |
| `firstSeenAt`, `lastSeenAt` | Epoch milliseconds |
| `observations` | How many write windows the configuration turned up in. Not a request count. |

A row is keyed by organisation, kind, identity and client: the same MCP server reached from Claude Code and from curl is two rows.

## How it is written

The gateway hashes each request's capability set together with the client and remembers the hashes it has already written. An unchanged configuration is written once per `INVENTORY_CACHE_TTL` (1 hour), so `lastSeenAt` can lag by up to an hour. At most 512 capabilities are recorded per observation. Capabilities are recorded before the policy decision, so a blocked request still appears, and first sightings are published to Software Factory as source events.

## Resolve Platform

The [AI Firewall page](https://www.vulnetix.com/resolve/ai-firewall) shows the inventory on the capability tabs: **MCP** (`#mcp`), **Tools** (`#tools`), **Clients** (`#clients`) and **Skills** (`#skills`). Each row offers the rule to write against it.

## CLI

```bash
vulnetix ai-firewall inventory
vulnetix ai-firewall inventory --kind mcp_server
vulnetix ai-firewall inventory --client claude-code --search github
vulnetix ai-firewall inventory -o json
vulnetix ai-firewall inventory --clear
```

| Flag | Default | Meaning |
|---|---|---|
| `--kind` | all | `tool`, `mcp_server` or `skill` |
| `--client` | all | Exact client name, for example `claude-code` |
| `--search` | | Substring match on the identity |
| `--limit` | `200` | 1 to 1000. The output says `Truncated at --limit N` when the limit was reached. |
| `--clear` | `false` | Delete the whole inventory instead of reading it. There is no confirmation prompt. |
| `--base-url` | `https://api.vdb.vulnetix.com` | VDB API |
| `-o, --output` | `pretty` | `pretty` or `json` |

The pretty output has `KIND`, `NAME`, `CLIENT` and `EVIDENCE` columns, an MCP server's URL on a dimmed line under it, and a footer counting clients, MCP servers, tools and skills.

## Resolve Platform API

Session-authenticated, under `https://www.vulnetix.com/api/site/v1`:

| Request | Parameters |
|---|---|
| `GET /ai-firewall/inventory` | `kind` (`tool`, `mcp_server`, `skill`), `client`, `search`, `source` (`declared`, `invoked`, `inferred`), `seen_since` (epoch ms), `sort` (`last_seen` default, `first_seen`, `observations`, `identity`), `dir` (`asc`, `desc`), `page` (from 1), `per_page` (1 to 200, default 50) |
| `GET /ai-firewall/inventory/clients` | Each client with what it carries |
| `DELETE /ai-firewall/inventory` | Clears it; answers `{"status": "cleared", "removed": N}` |

A bad `kind`, `source`, `seen_since`, `sort` or `dir` is `400` with the allowed values. The list response carries `counts` for the whole inventory by kind and `clients`, every client name seen, whatever the filter.

## Clearing

Clearing deletes every row for the organisation. Nothing else changes: rules are untouched, and the gateway rebuilds the list from live traffic. Because of the one-hour write window, a configuration that was already written in the current window is not written again until the window passes, so a cleared inventory can take up to an hour to fill back in.

Any signed-in member can clear it; the Resolve Platform route does not check for owner or admin.

## Related

- [Client identity](/ai-firewall/policy/client-identity/)
- [Held requests](/ai-firewall/operations/held-requests/)
- [Inference logs](/ai-firewall/operations/logs/)
