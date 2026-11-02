---
title: Quickstart
description: Get a credential, add one MCP server entry to your client, restart it, and ask a first question.
order: 2
sources:
  - mcp-server/src/index.ts
  - mcp-server/src/auth/credential.ts
  - mcp-server/src/tools/auth.ts
  - cli/cmd/auth.go
checked: [mcp-server@1725a04, cli@4c8c3b7]
updated: 02 Nov 2026
---

## 1. Get a credential

You need a Vulnetix API key: your organisation UUID and a 64-character hex digest, joined by a colon. Use one of these.

| Method | Steps |
|---|---|
| Console | Sign up at [vulnetix.com/vdb-register](https://www.vulnetix.com/vdb-register) and copy the API key from the dashboard. |
| CLI | `vulnetix auth login` opens a browser sign-in and stores the credential. `vulnetix auth status` shows the organisation and plan. |
| Inside the agent | Connect with no header, then ask the agent to run `vulnetix_auth_start`. Approve in the browser, and `vulnetix_auth_poll` returns the full header value. See [Authentication](/mcp-server/get-started/authentication/). |

The header value is always:

```text
ApiKey <orgId>:<hex>
```

## 2. Add the server

Most JSON clients accept this shape. File locations and per-client key names are on each [client page](/mcp-server/clients/overview/).

```json
{
  "mcpServers": {
    "vulnetix": {
      "type": "http",
      "url": "https://mcp.vulnetix.com/mcp",
      "headers": {
        "Authorization": "ApiKey <orgId>:<hex>"
      }
    }
  }
}
```

Claude Code takes it as one command:

```bash
claude mcp add --scope user --transport http vulnetix https://mcp.vulnetix.com/mcp \
  --header "Authorization: ApiKey ${VULNETIX_ORG}:${VULNETIX_KEY}"
```

> [!CAREFUL] Both halves of the key
> The header needs the org UUID, a colon, then the hex. Sending only the hex is the most common mistake. The server treats a malformed `ApiKey` header as no credential at all, and every VDB tool returns an error result saying none was supplied.

## 3. Restart and check

Quit and reopen the client. Most read MCP config once at launch. You should see 31 tools and 18 prompts from `vulnetix`.

Ask the agent:

```text
Run vulnetix_auth_status and tell me which organisation I am connected as.
```

`authenticated: true` with your `orgId` means the header parsed. If it does not, follow [Verify your setup](/mcp-server/get-started/verify/).

## 4. Ask a question

Start with something a model cannot answer from training data:

```text
Is CVE-2021-44228 in the CISA KEV catalogue, what is its EPSS score, and what is the SSVC decision?
```

The agent calls `vulnetix_vuln`. Other first questions:

```text
Before I add express to this project, what is its vulnerability history and which version should I pin?
What was added to the KEV catalogue recently, and which entries have a CISA due date in the next 14 days?
Give me the remediation plan for GHSA-jfh8-c2jp-5v3q and say which action to take first.
```

## Next

- [Authentication](/mcp-server/get-started/authentication/): formats, sign-in from the agent, rotation.
- [Plans and limits](/mcp-server/get-started/plans-and-limits/): what Community withholds and how quota shows.
- [Guides](/mcp-server/guides/overview/): worked sequences for triage, dependency gating and incidents.
