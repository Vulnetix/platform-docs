---
title: Credential storage
nav: Storage
description: What auth login writes for each --store choice, the keychain accounts, the credentials file format, the custom directory, and what logout removes.
order: 4
sources: [cli/pkg/auth/credentials.go, cli/pkg/auth/keyring.go, cli/pkg/auth/auth.go, cli/cmd/auth.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

`vulnetix auth login --store <home|project|keyring>` chooses where the credential goes. The default is `home`. Prefer `keyring` wherever a keychain exists.

| `--store` | Writes | Secret |
|---|---|---|
| `home` | `~/.vulnetix/credentials.json` | In the file |
| `project` | `./.vulnetix/credentials.json` in the current directory | In the file |
| `keyring` | The secret to the OS keychain; metadata to the home file | Keychain only |

Every file store creates its directory with mode `0700` and writes the file with mode `0600`.

## Keychain

Secrets go to the OS keychain under service `vulnetix`, one account per organisation:

| Platform | Backend |
|---|---|
| macOS | Keychain (the login keychain) |
| Windows | Credential Manager |
| Linux | A freedesktop Secret Service (GNOME Keyring, KWallet) on the D-Bus session bus |

| Credential | Keychain account |
|---|---|
| ApiKey | `apikey:<orgID>` |
| Bearer token | `token:<orgID>` (`token` when there is no org ID) |
| SigV4 secret | `hmac-secret:<orgID>` |

`--store keyring` still writes `~/.vulnetix/credentials.json`, without the secret:

```json
{
  "org_id": "8ff8f1e4-0000-4000-8000-000000000000",
  "method": "apikey",
  "api_key_in_keyring": true
}
```

The `*_in_keyring` flag tells the loader to read the secret from the keychain. The metadata always goes to the home directory, never the project.

### No keychain

Headless Linux, containers and CI runners usually have no Secret Service. `--store keyring` then warns and writes the home file instead, with the secret in it:

```text
no OS keychain backend detected on linux/amd64: ...
  expected: a freedesktop Secret Service provider (GNOME Keyring / KWallet) running on the D-Bus session bus - headless sessions usually have none
  setup guide: https://vulnetix.com/docs/cli/keychain
  alternatively store credentials in a file with --store home|project
No usable OS keychain - falling back to file storage.
Credentials saved to home store
```

The login succeeds. The last line names the store actually used. If a plaintext fallback is not acceptable, do not log in on that machine: use environment variables.

## Home file

`~/.vulnetix/credentials.json`. Use it when there is no keychain and one trusted user on the machine. If the home directory cannot be determined (a service account with no `$HOME`), the CLI uses a relative `.vulnetix/` in the current directory.

## Project file

`./.vulnetix/credentials.json`, read before the home file, so it overrides your own credential anywhere under that directory.

> [!CAREFUL] The project file sits in your working tree
> It can be committed, copied by `COPY . .` into an image, uploaded as a CI artifact or archived into a release. Add `.vulnetix/credentials.json` to `.gitignore` and `.dockerignore` before creating one. The GitHub Action writes one when you give it `api-key`; see [GitHub Actions](/cli/ci-cd/github-actions/#the-action-stores-a-project-credential).

## Custom directory

`VULNETIX_CREDENTIALS_DIR` moves the home store, for reading and writing:

```sh
export VULNETIX_CREDENTIALS_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/vulnetix"
vulnetix auth login --store home
vulnetix auth status
```

On a `tmpfs` such as `/run/user/$UID`, the credential never reaches disk and is gone after a reboot. Project credentials are not affected.

`auth login --store-dir <dir>` writes the home (or keyring metadata) file to `<dir>` for that login only. Nothing reads `--store-dir` back: unless `VULNETIX_CREDENTIALS_DIR` points at the same directory, later commands do not find the credential, and `auth logout` does not remove it.

## File format

```json
{
  "org_id": "8ff8f1e4-0000-4000-8000-000000000000",
  "api_key": "6e40f1c3...",
  "method": "apikey"
}
```

| Key | Present when |
|---|---|
| `org_id` | Always, except a bearer token with no org |
| `method` | Always: `apikey`, `sigv4` or `token` |
| `api_key` | `apikey`, unless in the keychain |
| `secret` | `sigv4`, unless in the keychain |
| `token` | `token`, unless in the keychain |
| `api_key_in_keyring`, `hmac_in_keyring`, `token_in_keyring` | The secret is in the keychain |

To change a credential, log in again rather than editing the file: login verifies against the API before it writes.

## Logging out

```sh
vulnetix auth logout
```

Deletes `./.vulnetix/credentials.json` (relative to where you run it) and the home file, after deleting any keychain entries they reference. It does not unset environment variables, does not touch netrc, and does not find a file written with `--store-dir`. If `auth status` still shows a credential afterwards, one of those is why.
