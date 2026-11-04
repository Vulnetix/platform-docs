---
title: Secrets vault
description: The organisation's encrypted store for AI provider keys, sandbox environment variables and integration credentials, with grants, expiry, rotation and the API.
order: 1
sources: [vdb-site/docs/secrets-vault.md, vdb-site/api/internal/handler/vault_model.go, vdb-site/api/internal/handler/vault_handlers.go, vdb-site/api/internal/handler/vault_service.go, vdb-site/api/internal/handler/vault_connectors.go, vdb-site/api/internal/messaging/catalogue.go]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

The vault is one place for the secrets Vulnetix uses on your behalf. Every value is encrypted with AWS KMS before it is stored and is never shown again after you save it. Each entry says exactly where it may be used; Belai hosts, Pix Sandboxes and the AI Firewall read from it and keep no copy of their own.

Open it at **Configuration › Secrets Vault** (`/resolve/vault`). Anyone in the organisation can read the list (names, last four characters, grants, status); only an owner can add, change, revoke, rotate or test.

## Entry kinds

| `kind` | Holds | Granted to | Added from |
|---|---|---|---|
| `provider_key` | An AI provider API key, labelled with the provider slug | any surface | the vault page |
| `env` | An environment variable for Pix Sandboxes and Belai hosts | `pix_sandbox`, `belai_host` | the vault page |
| `management` | A provider admin key, used only to create and delete provider keys during rotation | never | the vault page |
| `connector` | A credential Vulnetix itself uses to reach your tools (Slack bot token, webhook URL and signing secret, Jira token, AWS, Wiz, registry login) | never; opened only by Vulnetix's own services | **Integrations** and **Messaging**, not the vault page |
| `signing_key`, `github_user` | One person's commit signing key and GitHub sign-in | never | `/v1/signing/*`, by their owner |

### Environment variables

| Rule | Value |
|---|---|
| Name | `^[A-Z_][A-Z0-9_]{0,63}$` |
| Refused names | `PATH`, `HOME`, `USER`, `SHELL`, `PWD`, `OLDPWD`, `IFS`, `TERM`, `TMPDIR`, `LANG`, `LD_PRELOAD`, `LD_LIBRARY_PATH`, `LD_AUDIT`, `DYLD_INSERT_LIBRARIES`, `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`, `ALL_PROXY` (and their lowercase forms) |
| Refused prefixes | `LD_`, `BELAI_`, `VULNETIX_`, `VX_`, `BASH_`, `SSH_` |
| Minimum value length | 8 characters. A shorter value cannot be scrubbed from output without hiding ordinary words. |

A Pix Sandbox receives its variables on a 15 minute lease. A Belai host you run yourself takes an `env` entry only through an MCP secrets install request that names it, and only with a `belai_host` grant for that host.

### Size limits

| Entry | Maximum |
|---|---|
| Provider key | 4096 bytes |
| Kiro sign-in | 8 KiB |
| Connector | 8 KiB; at most 100 live connector entries per organisation |

## Grants

A grant is a **surface**, an **effect** (`allow` or `deny`) and either `all` or a list of ids. No grant means no access. Within one entry, a deny beats an allow.

| `surface` | Subject id | Notes |
|---|---|---|
| `pix_sandbox` | the sandbox id | Stable across relaunches |
| `belai_host` | the host id (the page shows its hostname) | |
| `ai_firewall` | the principal id of the API key making the gateway request | Lets you give different people different provider keys |

### Overlaps

Two entries that fill the same slot (the same provider, for provider keys; the same name, for env vars) may not cover the same subject. A save that would overlap is `409 {"error":"overlap","conflicts":[...]}`. Send it again with `resolve`:

| `resolve` | What happens to the other entry |
|---|---|
| `carve_out` | It gives up just the overlap: an `all` grant gains a deny for those ids, a list loses them |
| `remove_grant` | It gives up every overlapping surface |
| `revoke_entry` | It is revoked |

When something asks for a secret and two live entries match, the request fails closed (`vault_ambiguous`) rather than pick one.

## Expiry

`expiresAt` is 1 minute to 10 years ahead, or none. It is enforced when the secret is used. An expired entry keeps its ciphertext, so you can extend it. `vault.entry.expiring` fires 7 days before.

## Rotation

`rotation` is `{mode, everyDays, graceMinutes, managementEntryId, projectId, teamId}`.

| Field | Range | Default |
|---|---|---|
| `mode` | `manual` or `auto` | |
| `everyDays` | 1 to 365 | |
| `graceMinutes` | 0 to 1440; how long the old key keeps working | 15 |

Automatic rotation works only where the provider's API can create keys:

| Provider | Needs | Creates |
|---|---|---|
| OpenRouter | a management key entry | a new key |
| OpenAI | an admin key entry and `projectId` | a project service account, whose key is used |
| xAI | a management key entry and `teamId` | a team API key |
| Anthropic | not possible; the Admin API cannot create keys | paste the new key (manual rotation) |
| Kiro | not possible; there are no API keys, only sign-ins | `vulnetix ai-firewall kiro login`, or paste a sign-in |

A rotation creates the new key, checks the provider accepts it, then makes it current in one step. A failure at any step deletes what it created and leaves the current key serving. The old key is deleted at the provider when the grace period ends. Due rotations run every 15 minutes.

A management key cannot be revoked while an entry rotates with it.

## Verify

`POST /v1/vault/entries/{id}/verify` records a list of checks on the entry, each `pass`, `fail`, `notice` or `skipped`: the stored envelope is well formed, the encryption key is enabled, decryption works, the value matches its fingerprint, no grants overlap, and any expiry notice. `?probe=1` also asks the provider whether the key works (owner only). The value never leaves the service.

## Events

Each change is in the vault's activity list (the 100 newest) and emits a sensitive [messaging](/organization/integrations/messaging/) event:

| Event | Severity |
|---|---|
| `vault.entry.created` | notice |
| `vault.entry.value_replaced` | notice |
| `vault.entry.revoked` | warning |
| `vault.entry.rotated` | info |
| `vault.entry.rotation_failed` | critical |
| `vault.entry.expiring` | warning |

Sensitive events show only the action, who it was about and when.

## API

All vault routes take the Resolve Platform session only, not an API key. Responses are `Cache-Control: no-store` and never include a value.

| Method | Path | Who | Body or notes |
|---|---|---|---|
| GET | `/v1/vault` | member | entries, providers that support rotation, API key owners (for `ai_firewall` grants), connectors with the rows that use them, 100 newest events |
| POST | `/v1/vault/entries` | owner | `kind`, `provider`, `name`, `value`, `grants`, `expiresAt`, `rotation`, `resolve`. `kind: connector` is refused here. |
| PATCH | `/v1/vault/entries/{id}` | owner | change name, grants, expiry, rotation or value. A new value is a new version. |
| DELETE | `/v1/vault/entries/{id}` | owner | revoke: the value is deleted, a stub stays for history. Revoking a connector stops every messaging connection that used it. |
| POST | `/v1/vault/entries/{id}/verify` | member (owner for `?probe=1`) | |
| POST | `/v1/vault/entries/{id}/rotate` | owner | rotate now; `{value}` for a manual rotation |
| POST | `/v1/vault/test-key` | owner | ask a provider whether a key works without saving it |

Example grant list for a provider key that every sandbox may use except one, and two people through the AI Firewall:

```json
[
  {"surface": "pix_sandbox", "effect": "allow", "all": true},
  {"surface": "pix_sandbox", "effect": "deny", "ids": ["7c1d2e3f-0000-4000-8000-000000000001"]},
  {"surface": "ai_firewall", "effect": "allow", "ids": ["5b0f9a8e-0000-4000-8000-000000000002", "5b0f9a8e-0000-4000-8000-000000000003"]}
]
```

## Related

- [/ai-firewall/](/ai-firewall/) for how the gateway uses provider keys
- [Pix Sandboxes](/software-factory/workforce/pix-sandboxes/)
- [Messaging](/organization/integrations/messaging/) for connector credentials
