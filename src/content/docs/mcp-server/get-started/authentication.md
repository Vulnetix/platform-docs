---
title: Authentication
description: The Authorization header formats the server accepts, the in-agent device sign-in with vulnetix_auth_start and vulnetix_auth_poll, where to store the key, and rotation.
order: 3
sources:
  - mcp-server/src/auth/credential.ts
  - mcp-server/src/auth/device.ts
  - mcp-server/src/auth/seal.ts
  - mcp-server/src/tools/auth.ts
  - mcp-server/src/index.ts
  - mcp-server/src/config.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Every VDB tool call needs a credential in the `Authorization` header. The server never supplies one for you, and it never validates the credential itself: it forwards the header unchanged to vdb-api, which is the only authority on whether it is valid.

## Accepted formats

| Scheme | Header value | Parsed when | Source |
|---|---|---|---|
| `ApiKey` | `ApiKey <orgId>:<64-hex>` | `orgId` is a UUID and a colon follows it | Resolve Platform, `vulnetix auth login`, or `vulnetix_auth_poll` |
| `Bearer` | `Bearer <opaque token>` | token is non-empty | Vulnetix identity provider API token |
| `Bearer` | `Bearer <jwt>` | token is non-empty | `vdb_token` web session JWT |

The scheme name is case-insensitive. Any other value, including `ApiKey <hex>` with no org id, is treated as no credential. Use `ApiKey` in client configs.

The org id from an `ApiKey` header is used only to key the edge cache per organisation. For a `Bearer` token the cache key is derived from a SHA-256 of the header.

## Signing in from the agent

Three tools work with no credential, so a user can get one without leaving the conversation.

| Tool | Does |
|---|---|
| `vulnetix_auth_status` | Says whether the request carried a parseable credential, its `scheme` and `orgId` |
| `vulnetix_auth_start` | Starts an RFC 8628 device grant with the Vulnetix API and returns `verification_uri`, `user_code`, `expires_in_seconds`, `poll_interval_seconds` and an opaque `handle` |
| `vulnetix_auth_poll` | Takes the `handle`, redeems the grant once, and returns `status: "approved"` with `org_id` and `authorization_header`, or `status: "pending"` |

The flow:

1. Ask the agent to start a Vulnetix login. It calls `vulnetix_auth_start` and shows you a URL like `https://www.vulnetix.com/cli-login-code?user_code=5HWL-6L4B`.
2. Open it in a browser signed in to Vulnetix, check the code on screen matches the one the agent showed, and approve.
3. Tell the agent you have approved. It calls `vulnetix_auth_poll` with the handle, no faster than every 5 seconds.
4. Copy the returned `authorization_header` (it already starts with `ApiKey `) into your client config and restart the client.

The code expires after 300 seconds. A handle older than that returns an error telling the agent to start again. Polling too fast returns `pending` with advice to wait 10 seconds.

> [!CAREFUL] The server cannot keep the key for you
> The server is stateless. After `vulnetix_auth_poll` succeeds, the credential works only once you put it in the client's `Authorization` header. It is not remembered for the next request.

### What the approval page shows

`vulnetix_auth_start` sends the client's self-reported name (`clientInfo.title` or `clientInfo.name`) to the Vulnetix API as `client_name`, so the page names the app that asked rather than "the Vulnetix CLI". That name is unverified: anyone can start a grant and claim any name. Approve only a sign-in you started.

### Why the handle is encrypted

The `handle` wraps the grant's secret `device_code` in AES-256-GCM, under a key derived with HKDF-SHA256 from the server's `MCP_AEAD_KEY` secret. The handle lands in your transcript, and possession of a `device_code` is enough to redeem the grant. Your client holds ciphertext it cannot read, bound to the `device-grant` purpose with its expiry sealed inside. See [Security model](/mcp-server/design/security/).

## Where to keep the key

Treat it as a password: anyone holding it acts as your organisation.

| Keep it in | Why |
|---|---|
| A user-scoped config (`~/.claude.json`, `~/.cursor/mcp.json`, `~/.codeium/windsurf/mcp_config.json`) | Outside every repository |
| VS Code `inputs` with `"password": true` | Stored by VS Code, never written to `mcp.json` |
| An environment variable the client expands | The committed file holds only a reference |
| Your CI platform's secret store | Masked in logs |

> [!CAREFUL] Project configs get committed
> `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json` and `.zed/settings.json` are ordinary files in the working tree. A literal key in one is committed by the next `git add`. If that has happened, rotate the key.

## Rotating

Rotate from the Resolve Platform, or run `vulnetix auth login` again, then update each client config. There is no session, so the new value applies from the next request. Rotate after a key appears in a commit, a shared transcript, a screenshot or an exported conversation. A key obtained with `vulnetix_auth_poll` passed through the transcript; rotate it if that transcript was shared.

> [!WHY] Why there is no anonymous mode
> vdb-api meters quota per organisation. A shared server that fell back to one built-in credential would put every caller without a key into one bucket, the same one every Vulnetix CLI community user draws from, and a single runaway agent loop would exhaust it for everyone. You bring a credential and are metered as yourself.

## When authentication fails

A request with no credential is not rejected at the transport, because the sign-in tools must work then. Each VDB tool returns an error result instead:

```text
Vulnetix request failed: No Vulnetix credential was supplied. Add an `Authorization: ApiKey <orgId>:<hex>` header to this MCP server's configuration, or run `vulnetix_auth_start` and then `vulnetix_auth_poll` to obtain one.
```

A credential vdb-api rejects returns `Vulnetix rejected the credential (HTTP 401).` See [Troubleshooting](/mcp-server/reference/troubleshooting/).
