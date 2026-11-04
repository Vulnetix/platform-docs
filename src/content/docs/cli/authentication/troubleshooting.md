---
title: Troubleshooting authentication
nav: Troubleshooting
description: Every authentication error the CLI prints, what causes it and the fix, plus the failures that print no error at all.
order: 9
sources: [cli/cmd/auth.go, cli/pkg/auth/credentials.go, cli/pkg/auth/keyring.go, cli/pkg/auth/netrc.go, cli/cmd/upload.go, cli/cmd/gha.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

Errors print as `Error: <message>` on stderr, and the command exits `1`.

## Error messages

| Message | Cause | Fix |
|---|---|---|
| `choose only one of --api-key, --secret, or --token` | More than one credential flag | Keep the one that matches what you hold. `--secret` is a SigV4 secret, not an ApiKey. |
| `--org-id must be a valid UUID, got: ...` | Not a UUID: an org name, or the `<org>:<key>` value | Copy the organisation UUID from the Resolve Platform |
| `--org-id is required with --api-key` (or `--secret`) | No terminal to prompt on | Pass `--org-id` or set `VULNETIX_ORG_ID` |
| `--method is deprecated; use --api-key + --org-id (ApiKey), ...` | `--method` with no credential flag | Drop `--method`; see [Methods](/cli/authentication/methods/#deprecated-method) |
| `--noninteractive uses ApiKey credentials only; use --api-key with --org-id` | `--noninteractive` with `--secret` or `--token` | Use an ApiKey, or drop `--noninteractive` |
| `missing ApiKey or org for noninteractive login. ...` | `--noninteractive` found no key or no org in flags or environment | Set both `VULNETIX_API_KEY` and `VULNETIX_ORG_ID` |
| `authentication test failed: ...` | `auth login`: the API rejected the new credential | Wrong or revoked key, wrong org, or the wrong kind (an ApiKey as `--secret`). Nothing was written. |
| `verification failed: API error (401): Invalid API key` | `auth verify`: the stored or environment credential was rejected | Find the source with `auth status`, then replace it |
| `no credentials found: ... Run 'vulnetix auth login' to authenticate` | `auth verify`: no source is complete | See [Precedence](/cli/authentication/precedence/) |
| `netrc credentials are not usable: ... permissions are too open; run chmod 600 ...` | `~/.netrc` readable by group or others | `chmod 600 ~/.netrc` |
| `netrc credentials are not usable: netrc entry for packages.vulnetix.com is missing login or password` | Half-written entry | Fix the stanza or re-run a `package-firewall` command |
| `authentication required: ...` | `upload` (or a `package-firewall` command) found no credential | Sign in; community access cannot publish |
| `--org-id is required (no stored credentials found)` | `gha upload` with no credential and no `--org-id` | Set `VULNETIX_ORG_ID` and `VULNETIX_API_KEY` on the job |
| `GITHUB_TOKEN environment variable is required` | `gha upload` inside a workflow without the GitHub token | Add `GITHUB_TOKEN: ${{ github.token }}` to the step's `env` |
| `no OS keychain backend detected on linux/amd64: ...` | No Secret Service on the session bus (SSH, containers, CI) | A warning: the login continues with the home file. Start `gnome-keyring-daemon` with `DBUS_SESSION_BUS_ADDRESS` set, or use environment variables. |
| `device code expired` | The 5-minute browser window ran out with no terminal to offer a retry | Use `--noninteractive` with an ApiKey, or environment variables |
| `authorization was denied` | The code was denied in the browser, or the grant was already redeemed | Run `auth login` again |
| `device authorization refused (HTTP <n>)` | The device endpoint refused the request | Check `VULNETIX_WEB_URL` is unset, and that `www.vulnetix.com` is reachable |

### Shown as unusable in `auth status`

These do not stop resolution; the source is skipped and the next one is tried.

| Detail | Cause | Fix |
|---|---|---|
| `credentials file ... references an unusable keyring API key: keyring entry "apikey:<org>" not found` (also `token`, `secret`) | The keychain entry is gone: keychain reset, the file was copied from another machine, or another user | `vulnetix auth logout`, then `vulnetix auth login --store keyring` |
| `credentials file ... is missing org_id` | Truncated or hand-edited file | Log in again |
| `failed to parse credentials from ...` | Not JSON | Log in again |

## Failures without an error

**Logged in, but the CLI acts as someone else or as community.** An environment variable outranks the login: `VULNETIX_API_TOKEN` beats everything, and `VULNETIX_API_KEY` with `VULNETIX_ORG_ID` beats both files. `env | grep -E 'VULNETIX_|VVD_'`.

**Logged out, still signed in.** `auth logout` clears the files and keychain entries only. Check the `Source:` line: an environment variable, or netrc (`vulnetix package-firewall uninstall --all --remove-credentials`).

**Works locally, community in CI.** The secret name is misspelt, or the platform did not export it. Azure Pipelines does not pass secret variables to a step unless mapped in `env:`. Assert the source: [Precedence](/cli/authentication/precedence/#asserting-the-source-in-a-pipeline).

**Identity changes inside one repository.** It has a `./.vulnetix/credentials.json`. If it is tracked (`git log --oneline -- .vulnetix/credentials.json`), treat that key as leaked: [Rotation](/cli/authentication/rotation/#when-a-credential-leaks).

**Uploads stopped after restoring a backup.** The restore widened `~/.netrc`, so it is refused. `chmod 600 ~/.netrc; chmod 700 ~/.vulnetix; chmod 600 ~/.vulnetix/credentials.json`.

**`auth status` says Authenticated, `auth verify` fails.** `status` does not test the credential (a failed plan lookup shows `Plan: [UNKNOWN]`). The key was revoked or rotated: log in again.

**`--store-dir` login is not found later.** Nothing reads `--store-dir`. Set `VULNETIX_CREDENTIALS_DIR` to the same directory.

## Checklist

```sh
vulnetix auth status                                    # which source, and is any unusable
vulnetix auth verify                                    # does it work
env | grep -E 'VULNETIX_|VVD_'                          # environment shadowing a file
ls -la .vulnetix/credentials.json 2>/dev/null           # a project credential you did not create
stat -c '%a %n' ~/.vulnetix ~/.vulnetix/credentials.json ~/.netrc 2>/dev/null
grep -A2 'machine packages.vulnetix.com' ~/.netrc 2>/dev/null
```
