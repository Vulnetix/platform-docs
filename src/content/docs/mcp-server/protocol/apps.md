---
title: MCP Apps
description: The KEV deadline board, SOC triage queue and CVE risk card views served over io.modelcontextprotocol/ui, which hosts render them, and what a view may do.
order: 3
nav: Apps
sources:
  - mcp-server/src/apps/register.ts
  - mcp-server/src/apps/shared.ts
  - mcp-server/src/apps/kev-board.ts
  - mcp-server/src/apps/triage-queue.ts
  - mcp-server/src/apps/cve-card.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Three tools also point at an interactive view through the MCP Apps extension (`io.modelcontextprotocol/ui`). A host that supports it fetches the `ui://` resource named in the tool's `_meta.ui.resourceUri`, renders it in a sandboxed iframe and passes it the tool result. A host that does not support apps ignores the pointer; the text and structured result are unchanged.

| Tool | View | URI | Shows |
|---|---|---|---|
| `vulnetix_kev` | KEV deadline board | `ui://vulnetix/kev-board` | Entries sorted by deadline, overdue first, with days counted, text and ransomware filters, required action on expand |
| `vulnetix_soc_triage` | SOC triage queue | `ui://vulnetix/triage-queue` | The queue, re-sortable by EPSS or CVSS, with a Brief me button per CVE |
| `vulnetix_vuln` | CVE risk card | `ui://vulnetix/cve-card` | Threat exposure, SSVC, exploitation, EPSS, attack surface, KEV status with days left, lifecycle timeline |

Each view is one HTML document with MIME type `text/html;profile=mcp-app`, listed by `resources/list` with `ttlMs: 3600000`, `cacheScope: "public"`.

## Hosts

The MCP Apps client matrix lists Claude on the web and desktop, VS Code with GitHub Copilot, Cursor, ChatGPT and Goose among the hosts that render apps. Claude Code is a terminal and does not.

> [!CAREFUL] Tested in a simulated host only
> The views are covered by tests that run each view's script against a fake host: the handshake, theming, sorting, filtering, actions and hostile input. They have not been opened in a real host, where layout and sizing may differ.

## What a view can do

The view's content security policy declares empty `connectDomains`, `resourceDomains`, `frameDomains` and `baseUriDomains`, so it cannot fetch anything. It receives the tool result from the host and can ask the host for two things, which the host may confirm with you:

| Action | Request | Sent by |
|---|---|---|
| Open a link | `ui/open-link` to `https://nvd.nist.gov/vuln/detail/<CVE id>`, only for a well-formed CVE id | Open in NVD, on the CVE card |
| Send a message | `ui/message` with fixed text | Plan the fix (asks for `vulnetix_remediation`), Brief me |

A feed value reaches a message only when it is a well-formed CVE id.

## Advisory text is untrusted

Titles, vendor names and required-action text come from public feeds. Every view builds its page from text nodes and never parses markup, so a title containing HTML shows as characters. The tests check that no view assigns `innerHTML`.
