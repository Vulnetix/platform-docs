---
title: Key custody
description: How provider keys are encrypted, which services can decrypt them, how long a decrypted key lives, and how to rotate or revoke provider and Vulnetix keys.
order: 2
sources:
  - ai-firewall/terraform/kms.tf
  - ai-firewall/internal/kmssecret/kmssecret.go
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/api/proxy.go
  - ai-firewall/internal/api/vaultbundle.go
  - ai-firewall/internal/config/config.go
  - vdb-api/internal/handler/v2_cli_ai_firewall_key.go
  - cli/cmd/ai_firewall_policy.go
  - cli/cmd/ai_firewall.go
  - cli/pkg/aifirewall/config.go
checked: [ai-firewall@339de55, vdb-api@4145f0a, cli@4c8c3b7]
updated: 02 Nov 2026
---

Two keys are involved. Your applications hold the **Vulnetix API key** and send it to the gateway. The **provider key** (your OpenAI or Anthropic key) is stored once per organisation and provider, is never returned by any API, and is only ever sent to that provider. How to store one is on [Provider keys](/ai-firewall/get-started/provider-keys/).

## Encryption

| Property | Value |
|---|---|
| Algorithm | AWS KMS symmetric key `alias/vulnetix/ai-firewall-byok`. Values up to 4096 bytes are one KMS `Encrypt` (prefix `kms:v1:`); larger values, such as a vault bundle holding a Kiro sign-in, use a KMS data key with AES-256-GCM (prefix `kms:v2:`). |
| Encryption context | `secretKind=ai_provider_api_key`, `orgUuid=<tenant>`, `providerUuid=<provider>` |
| Effect of the context | KMS refuses to decrypt a ciphertext under any other organisation or provider. A ciphertext copied to another row does not decrypt. |
| Stored in | `OrgAiProvider.apiKeyCiphertext`. Only `hasKey` and `keyUpdatedAt` are ever returned. |
| Key rotation | Off. The KMS key has a 30-day deletion window. |

## Who can use the KMS key

| Principal | KMS permissions | Why |
|---|---|---|
| Gateway task role | `Decrypt` | Decrypts a key to send it upstream |
| Vulnetix API task role | `Encrypt`, `Decrypt`, `DescribeKey` | Writes keys and vault entries; the vault verifies and rotates entries |
| VDB API task role | `Decrypt`, `DescribeKey` | Verifies Vulnetix API keys, whose HMAC secrets are encrypted under the same key |
| AWS account root | `kms:*` | Administration and break-glass |

The same KMS key also encrypts each organisation's HMAC secret (context `secretKind=authentik_hmac_secret`), from which Vulnetix API keys are derived.

## Using a key

1. Each request reads the organisation's ciphertext fresh from the database.
2. The decrypted value is cached in the gateway's memory for up to 15 minutes, keyed by the ciphertext. A replaced key has a new ciphertext, so it is used on the next request.
3. If the value is a vault bundle, the gateway picks the key granted to the principal whose Vulnetix key made the call and checks its expiry on every request (`403 vault_no_grant`, `403 vault_key_expired`).
4. The key is rendered into the provider's credential headers (`Authorization: Bearer`, or `x-api-key` for Anthropic). The caller's `Authorization` and `x-api-key` headers are removed first, so the Vulnetix key never reaches the provider.

The provider key is not written to a log, a trace or an error message. A decryption failure answers `502 provider key decryption failed` and logs only the org and provider.

## Validation on write

| Check | Where | Result |
|---|---|---|
| Empty | CLI and API | `the key is empty` / `apiKey is required` |
| Longer than 4096 bytes | CLI and API | Refused |
| Control characters, including newlines | CLI and API | Refused, because they would be injected into the upstream header |
| Provider disabled | API | `400 provider <slug> is disabled` |
| Key managed in the secrets vault | API | `409`: change it in the [vault](https://www.vulnetix.com/resolve/vault), because a CLI write would replace the bundle and drop its expiry and grants |
| Community shared org | API | `403 AI firewall configuration requires an authenticated Vulnetix org` |

## Rotating and revoking

| Action | Command | Takes effect |
|---|---|---|
| Rotate a provider key | `vulnetix ai-firewall key set openai --from-env NEW_OPENAI_KEY` | Next request |
| Revoke a provider key | `vulnetix ai-firewall key remove openai` | Next request: `403 provider_key_missing` |
| Revoke a Vulnetix API key | Regenerate the secret on the [Account page](https://www.vulnetix.com/resolve/account) | Up to 60 seconds, the gateway's secret cache |

`key set` reads the key from `--from-env <VAR>`, `--stdin` or `--key <value>`. `--key` warns, because the key lands in shell history and the process list.

## Keys on developer machines

`vulnetix ai-firewall install` writes a reference to `$VULNETIX_API_KEY` into client configs, never the value, with two exceptions:

| Case | File | Protection |
|---|---|---|
| `--embed-key` | The client's config, or Claude Code's `settings.local.json` | Refused if the file is inside a git repository and not git-ignored. Written with mode `0600`. |
| Continue | `~/.continue/.env` | Always a literal, because the IDE extension cannot read the shell environment. Mode `0600`. |

Run `vulnetix secrets` in a repository to check that no key was committed.

## Related

- [Data handling](/ai-firewall/security/data-handling/)
- [Threat model](/ai-firewall/security/threat-model/)
- [Wiring clients](/ai-firewall/cli/wiring-clients/)
