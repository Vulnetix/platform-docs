---
title: Environment variables, caches and performance
nav: Environment
description: The environment variables that tune vulnetix sca, the local caches it keeps, and how the scan keeps API round trips off the critical path.
order: 2
sources: [cli/cmd/cli_sca.go, cli/internal/reachability/scanner.go, cli/internal/license/persist.go, cli/internal/scanopts/deployment.go, cli/internal/scanopts/authorship.go, cli/cmd/stored_licenses.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

## Variables

| Variable | Default | Effect |
|---|---|---|
| `VULNETIX_SCA_CONCURRENCY` | `6` | `/v2/cli.sca` batches sent in parallel, clamped 1 to 16. `1` sends them one at a time. |
| `VULNETIX_SCA_TIMEOUT` | `75` | Seconds allowed per `/v2/cli.sca` request, clamped 10 to 300 |
| `VULNETIX_REACHABILITY_CONCURRENCY` | `GOMAXPROCS` | Files parsed in parallel by reachability, clamped 1 to 32 |
| `VULNETIX_NO_TOKEN_CACHE` | unset | `1` keeps exchanged API tokens in memory only |
| `VULNETIX_NO_LICENSE_CACHE` | unset | `1` disables the licence cache |
| `VULNETIX_NO_BINARY_CACHE` | unset | `1` disables the package-manager version cache |
| `VULNETIX_HTTP_TRACE` | unset | `1` prints one stderr line per HTTP request: start offset, duration, status, path. No headers or bodies. |
| `VULNETIX_PROJECT`, `VULNETIX_ENVIRONMENT`, `VULNETIX_CLUSTER`, `VULNETIX_NAMESPACE` | unset | Deployment labels when the flags are absent |
| `VULNETIX_BOM_MANUFACTURER` | unset | SBOM manufacturer when `--bom-manufacturer` is absent |
| `GITHUB_TOKEN`, `GH_TOKEN` | unset | GitHub licence lookups when `gh` is not signed in |
| `CI` | unset | Any value: plain view by default, no legacy-flag notes |

Credential variables (`VULNETIX_API_KEY`, `VULNETIX_ORG_ID` and others) are on [Authentication](/cli/authentication/overview/).

## Caches

| Path | Holds | Lifetime |
|---|---|---|
| `~/.vulnetix/cache/tokens/` | Exchanged API tokens, mode `0600`, keyed by a hash of endpoint and credential. The secret is never written. | The token's lifetime. A rejected token is dropped and exchanged again. |
| `~/.vulnetix/cache/licenses/` | Licences from registries, deps.dev and GitHub | 7 days. Lookups that found nothing are retried next run, except a GitHub repository every lookup answered or 404'd, and a deps.dev 404, which are remembered for a day. |
| `~/.vulnetix/cache/binaries/` | Package-manager versions (`npm`, `poetry`, `gradle` and others), keyed by binary path, size and modification time | Until the binary changes |
| VDB response cache | Advisory range checks (`/v2/vuln/{id}/affected`), keyed by credential and request | 10 minutes |

## What keeps a scan fast

- One token exchange per credential, reused across runs.
- `/v2/cli.sca-reachability`, `/v2/cli.finalize` and `/v2/cli.insights` are sent with `X-Vulnetix-Deferred`: the API saves them after answering, so the CLI does not wait for the writes.
- Findings whose range cannot be compared with the installed version are settled in waves of `POST /v2/cli.affected-batch`, up to 24 checks at once.
- Remaining unknown licences go to `POST /v2/cli.licenses` in one request before registries are asked.
- The org's suppression rules are fetched while local parsing runs.
- Git context is read once, from the `--path` repository.
