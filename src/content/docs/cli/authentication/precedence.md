---
title: Credential precedence
nav: Precedence
description: The order in which the CLI reads credential sources, what makes a source complete or unusable, and how to see which one is in use.
order: 3
sources: [cli/pkg/auth/credentials.go, cli/pkg/auth/netrc.go, cli/cmd/auth.go, cli/cmd/status_summary.go, cli/cmd/vdb.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

The CLI reads these sources in order and uses the first complete one. Sources are never merged.

| # | Source | Complete when | Method |
|---|---|---|---|
| 1 | `VULNETIX_API_TOKEN` | Non-empty | `token` |
| 2 | `VULNETIX_API_KEY` and `VULNETIX_ORG_ID` | Both non-empty | `apikey` |
| 3 | `VVD_ORG` and `VVD_SECRET` | Both non-empty | `sigv4` |
| 4 | `./.vulnetix/credentials.json` (relative to the current directory) | Parses, has `org_id` or a token, and any keychain secret it references loads | from the file |
| 5 | `~/.vulnetix/credentials.json`, or `$VULNETIX_CREDENTIALS_DIR/credentials.json` | Same | from the file |
| 6 | netrc entry `machine packages.vulnetix.com` | `login` and `password` both present, file mode allows no group or other access | `apikey` |
| 7 | Embedded community credential | Always, for VDB lookups only | `apikey` |

What follows from the order:

- **A stale `VULNETIX_API_TOKEN` hides every login.** `auth login` writes a file or a keychain entry; resolution never gets past source 1.
- **A project file beats your own.** A `.vulnetix/credentials.json` in a repository you cloned signs you in as whoever wrote it, inside that directory. See [File permissions](/cli/authentication/file-permissions/#never-commit-credentials).
- **Half an environment pair is ignored.** `VULNETIX_API_KEY` without `VULNETIX_ORG_ID` falls through to the files, which reads as "the variable did nothing".
- **netrc is a full credential source.** Any `vulnetix package-firewall <ecosystem>` command writes it, so the CLI stays signed in after `auth logout`. See [netrc](/cli/authentication/netrc/).
- **There is no `--source` flag and no `--store-dir` on read.** `--store-dir` only chooses where `auth login` writes. To read from a non-default directory, set `VULNETIX_CREDENTIALS_DIR`.

## The keychain is not a separate level

A keychain secret is reached through source 4 or 5. The file holds the metadata and a flag (`api_key_in_keyring`, `token_in_keyring` or `hmac_in_keyring`), and the secret is loaded from the keychain when the file is read. Delete the file and the keychain entry is orphaned. `vulnetix auth logout` removes both.

## Unusable sources

A source that exists but cannot be used is reported as `unusable` by `auth status`:

| Cause | Effect |
|---|---|
| A credentials file that does not parse, or has no `org_id` and no token | Skipped; resolution continues with the next source |
| A credentials file whose keychain entry is gone (`keyring entry "apikey:<org>" not found`) | Skipped; resolution continues |
| `~/.netrc` readable by group or others, or an entry missing `login` or `password` | Resolution stops with `netrc credentials are not usable: ...` |

When resolution ends in an error, VDB commands (`scan`, `sca`, `vdb` and the scanners) carry on with the community credential. Commands that need a real organisation fail: `upload` with `authentication required`, `gha upload` with `--org-id is required (no stored credentials found)`.

## Which source is in use

```sh
vulnetix auth status
```

```text
AUTH STATE

[OK] Authenticated
  Organization: 8ff8f1e4-0000-4000-8000-000000000000
  Method:       apikey
  Source:       Environment
  Plan:         [PRO]
  ApiKey:       ****

CREDENTIAL SOURCES

  [FAIL] env VULNETIX_API_TOKEN not set
  [OK] env VULNETIX_API_KEY + VULNETIX_ORG_ID active
  [FAIL] env VVD_ORG + VVD_SECRET not set
  [FAIL] project .vulnetix/credentials.json not set
  [FAIL] home /home/you/.vulnetix/credentials.json not set
  [FAIL] keyring not set
  [FAIL] netrc /home/you/.netrc machine packages.vulnetix.com not set
```

`Source` is one of `Environment`, `Project file`, `Home file`, `Keyring`, `netrc` or `Community`. Each source row is `set`, `not set`, `unusable` (with the reason) or `active`. A third section lists the package managers configured against the Package Firewall.

`auth status` reports what was found, not whether it works. An invalid key still shows `Authenticated`, with `Plan: [UNKNOWN]` because the plan lookup failed. To prove the credential, run `auth verify`:

```sh
vulnetix auth verify     # exit 0: the API accepted it; exit 1: it did not, or nothing was found
```

## Asserting the source in a pipeline

Where a pipeline must not quietly drop to community access, check the source before scanning:

```sh
vulnetix auth status | grep -Eq '^ +Source: +Environment$' \
  || { echo "expected an environment credential"; exit 1; }
vulnetix auth verify
```

## Forcing a source

Remove the ones above it:

```sh
env -u VULNETIX_API_TOKEN -u VULNETIX_API_KEY -u VULNETIX_ORG_ID -u VVD_ORG -u VVD_SECRET \
  vulnetix auth status
```

Run it outside any directory that has a `.vulnetix/credentials.json` to reach the home file.
