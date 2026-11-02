---
title: Codex CLI
description: Add the server to OpenAI's Codex CLI in config.toml with an http_headers table, because codex mcp add cannot express an ApiKey header.
order: 12
sources:
  - mcp-server/README.md
  - mcp-server/src/auth/credential.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Codex CLI configures MCP servers in TOML.

`~/.codex/config.toml`:

```toml
[mcp_servers.vulnetix]
url = "https://mcp.vulnetix.com/mcp"
http_headers = { Authorization = "ApiKey <orgId>:<hex>" }
```

The sub-table form is equivalent:

```toml
[mcp_servers.vulnetix]
url = "https://mcp.vulnetix.com/mcp"

[mcp_servers.vulnetix.http_headers]
Authorization = "ApiKey <orgId>:<hex>"
```

The table is `mcp_servers` with an underscore. Every string is double-quoted, including the header value with its colon.

> [!CAREFUL] `codex mcp add` cannot set this header
> Its only auth option is `--bearer-token-env-var`, which always sends `Authorization: Bearer <token>`. A Vulnetix API key uses the `ApiKey` scheme, so write `http_headers` in the file. `codex mcp add` works only with a genuine Bearer credential: an identity-provider API token or a `vdb_token` session JWT.

## Check it

```bash
codex mcp get vulnetix
```

The output should show `transport: streamable_http`, the URL and `http_headers: Authorization=*****`. `http_headers: -` means the table name is wrong. Then start `codex` and ask:

```text
Look up CVE-2021-44228 and summarise the remediation deadline.
```

Codex's sandbox governs shell and file access, not MCP calls, but its approval policy can still prompt before a tool runs. The prompts need the shell, so they are subject to the sandbox.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Server not found | `mcp_servers`, underscore |
| TOML parse error | Double-quote every string |
| 401 | `ApiKey <orgId>:<hex>` |
