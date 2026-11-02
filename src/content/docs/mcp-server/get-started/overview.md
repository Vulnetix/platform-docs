---
title: Vulnetix MCP server
description: A hosted Model Context Protocol server that gives any MCP client 31 tools over the Vulnetix vulnerability database, 18 local-workflow prompts, 4 record templates and 3 interactive views.
order: 1
nav: Overview
sources:
  - mcp-server/src/mcp/server.ts
  - mcp-server/src/index.ts
  - mcp-server/src/config.ts
  - mcp-server/src/prompts/generated.ts
  - mcp-server/README.md
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

The Vulnetix MCP server is a remote MCP endpoint that an AI coding agent calls for vulnerability data. It answers from the Vulnetix VDB, which aggregates CVE.org, NVD, VulnCheck, CISA KEV, GitHub and OSV advisories, EUVD and other sources. There is nothing to install: you add a URL and a header to your client.

```text
URL     https://mcp.vulnetix.com/mcp
Header  Authorization: ApiKey <orgId>:<hex>
```

## What the server exposes

| Primitive | Count | Names | Page |
|---|---|---|---|
| Tools | 31 | `vulnetix_*` and `vdb_request` | [Tool reference](/mcp-server/reference/tools/) |
| Prompts | 18 | `vulnetix_*`, generated from the Pix skills | [Prompts](/mcp-server/prompts/overview/) |
| Agent Skills | 18 | `skill://<name>/SKILL.md` over `io.modelcontextprotocol/skills` | [Skills](/mcp-server/prompts/skills/) |
| Resource templates | 5 | `vulnetix://vuln/{id}`, `vulnetix://vuln/{id}/full`, `vulnetix://kev/{id}`, `vulnetix://package/{ecosystem}/{name}`, `skill://{name}/{+path}` | [Resources](/mcp-server/protocol/resources/) |
| App views | 3 | `ui://vulnetix/kev-board`, `ui://vulnetix/triage-queue`, `ui://vulnetix/cve-card` | [Apps](/mcp-server/protocol/apps/) |

Server name `vulnetix`, version `0.1.0`. Protocol revision `2026-07-28`, with `2025-11-25` clients served on the same endpoint.

## What it does and does not do

| Does | Does not |
|---|---|
| Look up an advisory: KEV status and due date, EPSS, SSVC, exploitation maturity, affected packages and routines | Read, scan or upload your code. No tool accepts file content. |
| Count exploits per source and show sightings, IOCs and threat actors | Apply a fix or edit a manifest |
| Score a package or purl before you install it, with a Safe Harbour version | Run a scanner or an exploit |
| Return detection rules, workarounds, vendor advisories and VEX | Remember anything between requests |
| Add an optional model-written analysis on Pro plans | Supply a credential for you |

Every prompt is a procedure your own agent runs locally with the [Vulnetix CLI](/cli/). See [Local workflows](/mcp-server/prompts/local-workflows/).

## Responses are shaped

A raw vdb-api record for `CVE-2021-44228` is 2,606,571 bytes. `vulnetix_vuln` returns 10,613 bytes by default with every decision field kept, and the rest one `resources/read` away. See [Response shaping](/mcp-server/design/response-shaping/).

## Find the page for your task

| I want to | Read |
|---|---|
| Connect a client in two minutes | [Quickstart](/mcp-server/get-started/quickstart/) |
| Get the exact config for my client | [Clients](/mcp-server/clients/overview/) |
| Look up a tool's parameters | [Tool reference](/mcp-server/reference/tools/) |
| Get a key from inside the agent | [Authentication](/mcp-server/get-started/authentication/) |
| Find out why an exploit list is empty | [Plans and limits](/mcp-server/get-started/plans-and-limits/) |
| Debug a `-32602` or a 401 | [Troubleshooting](/mcp-server/reference/troubleshooting/) |
| Run the agent in CI | [Agents in CI](/mcp-server/clients/ci-cd/) |
| Approve it for my organisation | [Security model](/mcp-server/design/security/) |

## Related products

| Product | Runs | Use it for |
|---|---|---|
| MCP server | Hosted; you connect to it | Vulnerability questions from any MCP client |
| [Pix](/pix/) | Inside your coding agent | Local skills, hooks and slash commands |
| [CLI](/cli/) | Your machine and CI | Scanning, SBOMs, fixes and deterministic gates |

All three use one VDB and one credential.

## Platform IaC

The MCP server has no config-as-code of its own: the only configuration is the client-side MCP entry described on each [client page](/mcp-server/clients/overview/). The AI firewall's allow and deny lists for MCP servers, tools and skills are [`AiGovernanceList`](/platform-iac/kinds/ai-governance-list/) documents. See the [kind catalogue](/platform-iac/kinds/catalogue/).
