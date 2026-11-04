---
title: Credential methods
nav: Methods
description: The browser device flow, ApiKey, SigV4 secret and bearer token logins, non-interactive login, and the community fallback.
order: 2
sources: [cli/cmd/auth.go, cli/pkg/auth/auth.go, cli/pkg/auth/credentials.go, cli/pkg/auth/community.go, vdb-site/api/internal/handler/cli_device.go]
checked: [cli@24498404a, vdb-site@1a06d67]
updated: 02 Nov 2026
---

`--api-key`, `--secret` and `--token` choose the method and are mutually exclusive. With none of them, `vulnetix auth login` (or plain `vulnetix auth`) starts the browser device flow. Every login calls the API with the new credential before saving it, and saves nothing if that call fails.

## Browser device flow

```sh
vulnetix auth login
vulnetix auth login --store keyring
```

The flow is an [RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628) device authorisation grant against `https://www.vulnetix.com/api/site/v1/cli/device`:

1. The CLI asks for a grant and receives a secret `device_code`, which never leaves the process, and a `user_code` in the form `XXXX-XXXX` (letters and digits).
2. On an interactive terminal it opens `https://www.vulnetix.com/cli-login-code?user_code=<code>` in your browser. It always prints the URL and the code, so you can check that the code in the browser matches.
3. You approve the code while signed in to your Vulnetix account. The browser never sees the key.
4. The CLI polls every 5 seconds (adding 5 seconds on each `slow_down` or HTTP 429), receives the organisation ID and an ApiKey, verifies them, and saves them.

| | |
|---|---|
| Grant lifetime | 5 minutes. A countdown is shown while waiting. |
| Reuse | A `device_code` is redeemed once. A second redeem is refused as `access_denied`. |
| Result | Always an ApiKey credential (`method: apikey`). |
| Store, interactive | You are asked: `[1]` home (default), `[2]` project, `[3]` keyring. If no keychain is detected, option 3 says it will fall back to a file. |
| Store, no TTY | Taken from `--store` (default `home`). |
| Code expired, interactive | `Code expired. Try again? [Y/n]` starts a new grant. |
| Code expired, no TTY | Fails with `device code expired`. |
| Denied in the browser | Fails with `authorization was denied`. |

`VULNETIX_WEB_URL` replaces `https://www.vulnetix.com` as the base for the device endpoints, for testing against a local site. With `-v` the CLI prints the authorize and token URLs before the first request:

```sh
VULNETIX_WEB_URL=http://localhost:5173 vulnetix auth login -v
```

## ApiKey

An organisation-scoped key. The flag needs `--org-id`, a UUID.

```sh
vulnetix auth login --api-key "$VULNETIX_API_KEY" --org-id "$VULNETIX_ORG_ID" --store keyring
```

Or skip the login and set both variables; every command reads them directly:

```sh
export VULNETIX_ORG_ID=8ff8f1e4-0000-4000-8000-000000000000
export VULNETIX_API_KEY=6e40f1c3...
vulnetix auth verify
```

The Resolve Platform shows the key as `<orgId>:<hex>`. Paste either form: the CLI strips a leading `<orgId>:` from the key wherever it came from (flag, variable, file or netrc) before building `Authorization: ApiKey <orgId>:<hex>`.

On an interactive terminal, `--api-key` without `--org-id` prompts for the organisation ID. Without a terminal it fails with `--org-id is required with --api-key`.

### Non-interactive login

```sh
vulnetix auth login --noninteractive --store home
```

`--noninteractive` takes the key from `--api-key` or `VULNETIX_API_KEY` and the organisation from `--org-id` or `VULNETIX_ORG_ID`, never opens a browser and never prompts. It accepts only an ApiKey: combined with `--secret` or `--token` it fails. Use it in provisioning scripts that must not hang on a prompt.

## SigV4 secret

An organisation-scoped HMAC secret. The CLI never sends the secret: it sends `ApiKey <org>:<hex(HMAC-SHA256(secret, org))>` to the upload endpoints, and exchanges the secret for a token on the VDB API.

```sh
vulnetix auth login --secret "$VVD_SECRET" --org-id "$VVD_ORG" --store keyring
```

The environment pair is `VVD_ORG` and `VVD_SECRET`, not the `VULNETIX_*` names. Both must be set; one alone is ignored. Login and `auth verify` prove a SigV4 secret with a full token exchange.

`--secret` is not another name for `--api-key`: an ApiKey passed as `--secret` derives the wrong value and the login fails.

## Bearer token

```sh
export VULNETIX_API_TOKEN=...
vulnetix auth verify
```

Sent as `Authorization: Bearer <token>`. The server resolves the organisation from the token, so no org ID is needed; `VULNETIX_ORG_ID`, if also set, is recorded in the credential and changes nothing else.

`VULNETIX_API_TOKEN` is the first source the CLI reads. When it is set, nothing else is consulted, including a fresh `auth login`. `vulnetix auth login --token <token>` exists but is hidden from help.

> [!CAREFUL] Do not put an ApiKey in VULNETIX_API_TOKEN
> The value is sent as a bearer token, so an ApiKey there is rejected, and because the variable outranks every other source, a working credential stored elsewhere is never tried.

## Organisation ID

`--org-id` must be a UUID (`--org-id must be a valid UUID, got: my-org`). It is required by `--api-key` and `--secret`, optional with `--token`, and not used by the browser flow, which returns the organisation itself.

The global `--org-id` flag on other commands (`upload`, `gha upload`) names the organisation for that command; credentials still come from the normal sources.

## Deprecated: --method

`--method apikey|sigv4` no longer selects anything. Passed without a credential flag it fails:

```text
--method is deprecated; use --api-key + --org-id (ApiKey), --secret + --org-id (SigV4), or --token (Bearer)
```

| Old | Now |
|---|---|
| `--method apikey --api-key K --org-id O` | `--api-key K --org-id O` |
| `--method sigv4 --secret S --org-id O` | `--secret S --org-id O` |

## Community fallback

With no credential, VDB-backed commands authenticate as an embedded community organisation, through the same gateway, headers and rate limits as any account. It is public by design and grants nothing an anonymous sign-up would not.

What it means in practice:

| | Community | Signed in |
|---|---|---|
| VDB lookups in `scan`, `sca`, `vdb` | Yes, at community rate limits | Yes, at your plan's limits |
| Snapshots stored, snapshot links printed | No (`Snapshots are skipped for unauthenticated scans.`) | Yes |
| `upload`, `gha upload` | No | Yes |
| Reachability analysis | No (`reachability requires Pro / Team / Business / Enterprise`) | By plan |

`vulnetix auth status` shows `Community - unauthenticated (VDB only)` in this state. A free Community plan account gives you your own quota: see [Community](https://www.vulnetix.com/features/community).
