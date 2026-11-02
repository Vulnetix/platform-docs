---
title: auth
description: Every flag of vulnetix auth, auth login, auth status, auth verify and auth logout.
order: 7
sources: [cli/cmd/auth.go, cli/internal/upload/client.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

How the methods and stores behave is on [Authentication](/cli/authentication/overview/). This page is the flag reference.

## auth login

```sh
vulnetix auth login [flags]
vulnetix auth [flags]          # the same
```

| Flag | Default | Effect |
|---|---|---|
| `--api-key <key>` | | ApiKey; needs `--org-id`. A leading `<orgId>:` is stripped. |
| `--secret <secret>` | | SigV4 secret; needs `--org-id` |
| `--token <token>` | | Bearer token; no org needed. Hidden from help. |
| `--org-id <uuid>` | | Organisation for `--api-key` or `--secret`. Prompted for on a terminal. |
| `--noninteractive` | off | ApiKey from flags or `VULNETIX_API_KEY` and `VULNETIX_ORG_ID`; never a browser or prompt |
| `--store <s>` | `home` | `home`, `project` or `keyring`. In the browser flow on a terminal you are asked instead. |
| `--store-dir <dir>` | `$HOME/.vulnetix` | Write the home or keyring metadata file here, for this login only. Not read back; see [Storage](/cli/authentication/storage/#custom-directory). |
| `--method <m>` | | Deprecated; fails when used without a credential flag |

`--api-key`, `--secret` and `--token` are mutually exclusive. With none of them, the browser device flow runs. On the parent `vulnetix auth`, `--token`'s help text calls it a deprecated alias for `--api-key`, but it is handled as a bearer token, as on `auth login`.

## auth status

```sh
vulnetix auth status [--base-url <url>]
```

Prints the credential in use (organisation, method, source, plan, masked secret), every source's state, and the Package Firewall ecosystems. `--base-url` (default `https://api.vdb.vulnetix.com/v1`) is where the plan is looked up, with a 3-second limit. Always exits `0`; it does not prove the credential works.

## auth verify

```sh
vulnetix auth verify
```

Loads the credential in use and calls an authenticated VDB endpoint (a full token exchange for SigV4). Writes nothing. Exits `0` when accepted, `1` when nothing is found (`no credentials found`) or the API refuses it (`verification failed: ...`).

`auth verify` accepts `--base-url` (default `https://api.vdb.vulnetix.com/v1`), but the value is not used: verification always goes to the default API.

## auth logout

```sh
vulnetix auth logout
```

Deletes `./.vulnetix/credentials.json` and the home credentials file, and the keychain entries they reference. Leaves environment variables and netrc alone. Exits `1` only when a file cannot be removed.
