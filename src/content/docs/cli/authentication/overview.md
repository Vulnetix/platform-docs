---
title: Authentication
nav: Overview
description: How the CLI signs in to a Vulnetix organisation, the credential methods and stores it supports, and the auth commands.
order: 1
sources: [cli/cmd/auth.go, cli/pkg/auth/auth.go, cli/pkg/auth/credentials.go, cli/pkg/auth/keyring.go, cli/pkg/auth/netrc.go, cli/pkg/auth/community.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

Every Vulnetix command authenticates as one organisation. On a workstation, sign in once with the browser and keep the key in the OS keychain:

```sh
vulnetix auth login --store keyring
```

In CI, set environment variables and do not log in. See [Authentication in CI/CD](/cli/authentication/ci-cd/).

## Credential methods

| Method | Login flag | Environment | Needs an org ID | Header sent |
|---|---|---|---|---|
| ApiKey | `--api-key` (or the browser login) | `VULNETIX_API_KEY` + `VULNETIX_ORG_ID` | Yes | `Authorization: ApiKey <org>:<key>` |
| SigV4 secret | `--secret` | `VVD_ORG` + `VVD_SECRET` | Yes | `Authorization: ApiKey <org>:<HMAC-SHA256(secret, org)>` |
| Bearer token | `--token` (hidden) | `VULNETIX_API_TOKEN` | No, resolved by the server | `Authorization: Bearer <token>` |
| Community | none | none | No | The embedded community ApiKey |

The browser login always produces an ApiKey. Details and examples: [Credential methods](/cli/authentication/methods/).

## Where credentials are kept

| Store | `--store` | Location | Secret at rest |
|---|---|---|---|
| Home file (default) | `home` | `~/.vulnetix/credentials.json`, or `$VULNETIX_CREDENTIALS_DIR/credentials.json` | Plain JSON, mode `0600` |
| Project file | `project` | `./.vulnetix/credentials.json` | Plain JSON, mode `0600` |
| OS keychain | `keyring` | Secret in the keychain (service `vulnetix`); metadata in the home file | Keychain |
| netrc | none (written by `package-firewall`) | `~/.netrc`, `%USERPROFILE%\_netrc` on Windows | Plain text, mode `0600` required |

Environment variables are read first and persist nothing. The full order is on [Credential precedence](/cli/authentication/precedence/), and the stores on [Credential storage](/cli/authentication/storage/).

## Commands

| Command | What it does |
|---|---|
| `vulnetix auth` or `vulnetix auth login` | Signs in. The browser device flow unless a credential flag is given. Verifies the credential against the API before saving it. |
| `vulnetix auth status` | Shows the credential in use, its source and plan, and the state of every source. It does not check that the credential works. |
| `vulnetix auth verify` | Loads the credential in use and calls an authenticated VDB endpoint. Exits `1` on failure. Writes nothing. |
| `vulnetix auth logout` | Deletes the home and project credential files and the keychain entries they reference. |
| `vulnetix` | With no command, checks the environment, file and netrc sources one by one against the API. |

Every flag is on [auth command reference](/cli/commands/auth/).

## What works without signing in

With no credential, the CLI uses an embedded community organisation for VDB lookups at community rate limits. `scan` still finds and scores vulnerabilities, but no snapshot is stored, and commands that publish (`upload`, `gha upload`, `analyze` uploads, `tea release`) have nothing to publish as. See [Community fallback](/cli/authentication/methods/#community-fallback).

## Pages in this section

- [Credential methods](/cli/authentication/methods/): browser login, ApiKey, SigV4, bearer token, community
- [Credential precedence](/cli/authentication/precedence/): which source wins and how to check
- [Credential storage](/cli/authentication/storage/): keychain, files, custom directory, file format
- [netrc and the Package Firewall](/cli/authentication/netrc/)
- [Authentication in CI/CD](/cli/authentication/ci-cd/)
- [File permissions and isolation](/cli/authentication/file-permissions/)
- [Rotation and revocation](/cli/authentication/rotation/)
- [Troubleshooting](/cli/authentication/troubleshooting/): every auth error message
