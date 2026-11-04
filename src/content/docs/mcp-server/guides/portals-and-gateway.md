---
title: Run it behind a Cloudflare Portal
description: Put the server behind a Cloudflare MCP Server Portal and require it with Gateway policy, with the server properties that help and the open questions.
order: 8
nav: Cloudflare Portal
sources:
  - mcp-server/src/tools/
  - mcp-server/src/mcp/server.ts
  - mcp-server/src/discovery/server-card.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

For administrators running Cloudflare Zero Trust who want one managed endpoint in front of MCP servers.

> [!CAREFUL] Not tested end to end
> This page describes Cloudflare's published controls and properties of this server. It has not been run against a live Portal. In particular, confirm how your Portal forwards the `Authorization` header before relying on it.

## Cloudflare controls

| Control | Gives you | Configured in |
|---|---|---|
| MCP Server Portal | One endpoint in front of upstream servers, with Access identity, a curated tool catalogue and logs | Zero Trust dashboard |
| Gateway MCP detection | Flags inspected requests carrying `MCP-Protocol-Version`, so a policy can allow or block MCP | Gateway, with TLS inspection |
| Portal-only enforcement | Tells Portal traffic from direct connections | Gateway network and HTTP policies |
| Logpush | Exports Portal tool activity | Zero Trust logs |

Cloudflare's published example for blocking direct MCP traffic, with action Block:

```text
experimental.is_mcp == true and not traffic.onramp in ("mcp_portal")
```

## What the server already does

| Property | Detail |
|---|---|
| Read-only tools | Every VDB tool and `vdb_request` declares `readOnlyHint: true`. Only `vulnetix_auth_start` and `vulnetix_auth_poll` are not read-only, and both are `destructiveHint: false`. |
| Routing headers | `Mcp-Method` and `Mcp-Name` are on every request and must match the body, so a WAF can act on `tools/call` for a given tool without parsing JSON |
| Stable catalogue | `tools/list` is the same for every caller and cached 300 seconds |
| Public discovery | `GET /mcp/server-card` returns the endpoint and required header without a connection |
| No stored state | Nothing per user to keep in step |

## Curating the catalogue

| Goal | Expose |
|---|---|
| Data only, no AI | Everything; the five AI tools still return VDB data, and callers can pass `ai: false` |
| No sign-in from chat | Everything except `vulnetix_auth_start` and `vulnetix_auth_poll` |

## Open questions

| Question | Why it matters |
|---|---|
| How does the Portal pass `Authorization`? | The server accepts only a per-user credential in that header and never supplies one |
| Will the Portal inject one shared credential? | vdb-api meters quota per organisation. One shared credential puts every user in one bucket. |
| Can your clients be TLS-inspected? | Gateway MCP detection depends on it; clients that pin certificates are not inspected |
