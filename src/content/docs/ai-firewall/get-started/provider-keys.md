---
title: Provider keys (BYOK)
nav: Provider keys
description: Store, rotate and remove the provider API keys the gateway uses upstream, from the CLI or the secrets vault, and how they are encrypted and scoped.
order: 4
sources:
  - cli/cmd/ai_firewall_policy.go
  - vdb-api/internal/handler/v2_cli_ai_firewall_key.go
  - vdb-site/api/internal/handler/ai_firewall_byok.go
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/api/vaultbundle.go
  - ai-firewall/internal/config/config.go
  - website/src/components/ai-firewall/ConnectTab.vue
checked: [cli@4c8c3b7, vdb-api@4145f0a, vdb-site@1a06d67, ai-firewall@339de55, website@ad775f3]
updated: 02 Nov 2026
---

Your applications send only the Vulnetix API key. The provider key, such as your OpenAI or Anthropic key, is stored once per organisation and provider, and the gateway adds it to the upstream request after the request clears policy. You keep your own account and billing with each provider; the gateway does not resell tokens.

## Two ways a key is stored

| Stored with | Holds | Scope | Change it with |
|---|---|---|---|
| `vulnetix ai-firewall key set`, or the console key field | One key | Every API key owner in the organisation | `key set` again, or `key remove` |
| The [secrets vault](https://www.vulnetix.com/resolve/vault), including keys added from the Connect tab | One or more keys, each with an expiry and the API key owners who may use it | Per owner | The Vault page |

Both are stored as one KMS-encrypted value per organisation and provider. A vault-managed key cannot be changed from the CLI or the old console field: `key set` and `key remove` answer `409 the <slug> key is managed in the secrets vault; change it at https://www.vulnetix.com/resolve/vault`, so a CLI write cannot replace a multi-owner bundle with one key and drop its expiry.

Storing keys is available on every plan.

## Store or replace a key from the CLI

```bash
vulnetix ai-firewall key set openai --from-env OPENAI_API_KEY
op read "op://Engineering/OpenAI/credential" | vulnetix ai-firewall key set openai --stdin
```

| Source flag | Notes |
|---|---|
| `--from-env <VAR>` | Fails if the variable is unset or empty |
| `--stdin` | Reads the first line |
| `--key <key>` | Warns: the key lands in shell history and the process list |

The CLI trims the key and rejects an empty key, one over 4096 bytes, or one containing a control character, which would corrupt the upstream `Authorization` header. Setting a key again replaces it. Storing a key for a provider that is disabled in the catalog fails with `400 provider <slug> is disabled`. Kiro has no API key: use [`vulnetix ai-firewall kiro login`](/ai-firewall/cli/commands/#kiro-login).

In a policy file, `providers[].key.fromEnv` or `key.fromFile` does the same at `apply` time. See [Policy file reference](/ai-firewall/reference/policy-file/#specproviders).

## Remove a key

```bash
vulnetix ai-firewall key remove openai
```

The gateway reads the stored value on every request, so the next request through that provider fails:

```json
{
  "error": {
    "message": "no OpenAI API key configured for your organisation: add one with 'vulnetix ai-firewall key set openai' or at https://www.vulnetix.com/vdb-ai-firewall#byok",
    "type": "policy_violation",
    "code": "provider_key_missing"
  }
}
```

## How a key is protected

- **KMS envelope encryption.** The value is encrypted with AWS KMS under an encryption context naming the organisation and the provider. KMS enforces the context on decrypt, so a ciphertext copied into another organisation's row does not decrypt.
- **Write-only.** No API returns a stored key. The CLI and console can tell you only whether one is stored (`hasKey`) and when it was last changed (`keyUpdatedAt`).
- **Decrypted just in time.** The gateway decrypts the key when a request needs it and keeps the plaintext in memory for up to 15 minutes (`BYOK_KEY_CACHE_TTL`). The cache is keyed by the ciphertext, so a replaced key is used on the next request.
- **Never mixed with the caller's credential.** The caller's `Authorization` and `x-api-key` headers are removed before the request goes upstream.

More on the threat model is in [Key custody](/ai-firewall/security/key-custody/).

## Vault keys: expiry and owners

A vault entry for a provider can hold several keys. Each has an expiry (or none) and a set of principals who may use it: everyone, everyone except a list, or only listed owners. The gateway picks the first live key that covers the owner of the calling Vulnetix API key, on every request.

| Refusal | Status | Cause | Fix |
|---|---|---|---|
| `vault_key_expired` | `403` | The only key for this API key owner has expired | Extend or replace it on the Vault page |
| `vault_no_grant` | `403` | No key in the entry covers this API key owner | Grant the owner, or add a key for them |
| `vault_kiro_relogin` | `403` | The Kiro sign-in can no longer mint a token | Run `vulnetix ai-firewall kiro login` again |

A key added from the Connect tab is saved as a vault value that every API key owner may use; narrow it on the Vault page.

## Related

- [Keys and base URLs](/ai-firewall/get-started/keys-and-base-urls/)
- [Commands: key](/ai-firewall/cli/commands/#key)
- [Error reference](/ai-firewall/reference/errors/)
