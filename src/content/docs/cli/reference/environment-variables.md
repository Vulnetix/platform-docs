---
title: Environment variables
description: Every environment variable the vulnetix binary reads for credentials, endpoints, labels, output, caches, tuning and debugging, with defaults.
order: 2
sources: [cli/pkg/auth/credentials.go, cli/cmd/root.go, cli/cmd/auth.go, cli/cmd/banner.go, cli/cmd/scan.go, cli/cmd/cli_sca.go, cli/cmd/sast_cache.go, cli/cmd/insights_graph.go, cli/cmd/malscan.go, cli/cmd/memory_limit.go, cli/cmd/profile.go, cli/internal/analytics/ga4.go, cli/internal/scanopts/deployment.go, cli/internal/scanopts/authorship.go, cli/internal/scanopts/surface.go, cli/internal/sast/engine.go, cli/internal/sast/eval_units.go, cli/internal/reachability/scanner.go, cli/internal/analyze/file_facts.go, cli/internal/analyze/forge/auth.go, cli/internal/config/config.go, cli/pkg/vdb/http_trace.go, cli/pkg/vdb/token_store.go, cli/internal/scan/binaries.go, cli/internal/license/persist.go, cli/install.sh]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

Flags win over environment variables wherever both exist. Variables used only by one product's commands (the runtime sensor, the SIEM forwarder, the AI Firewall) are documented in that product's segment.

## Credentials

Read in this order; the first complete source wins. See [Credential precedence](/cli/authentication/precedence/).

| Variable | Meaning |
|---|---|
| `VULNETIX_API_TOKEN` | Bearer token. Outranks every other source. |
| `VULNETIX_API_KEY` | ApiKey. Used only together with `VULNETIX_ORG_ID`. A leading `<org>:` is stripped. |
| `VULNETIX_ORG_ID` | Organisation UUID for the ApiKey, and the `--noninteractive` login org. It never names a manufacturer: when a manufacturer name resolves, the id is written as `metadata.manufacturer.bom-ref` (`urn:uuid:<id>`). |
| `VVD_ORG`, `VVD_SECRET` | SigV4 organisation and secret. Used only as a pair. |
| `VULNETIX_CREDENTIALS_DIR` | Directory of the home credentials file instead of `~/.vulnetix` (read and write) |

## Endpoints

| Variable | Default | Meaning |
|---|---|---|
| `VULNETIX_API_URL` | `https://api.vdb.vulnetix.com` | VDB API base for `scan` and the language server, for a mock or self-hosted API. `upload --base-url` sets it for that run. |
| `VULNETIX_WEB_URL` | `https://www.vulnetix.com` | Site base for the browser login's device endpoints |
| `GITHUB_API_URL` | `https://api.github.com` | GitHub API for `gha upload` and the `gha` posture commands (GitHub Enterprise Server) |

## GitHub

| Variable | Read by |
|---|---|
| `GITHUB_TOKEN` | `gha upload` (required to list the run's artifacts), `analyze`, `gha` posture commands, `triage`, licence lookups |
| `GH_TOKEN` | `analyze`, `gha` posture commands, `triage`, licence lookups, after `GITHUB_TOKEN`. Then `gh auth token`. |
| `GITHUB_REPOSITORY`, `GITHUB_RUN_ID`, `GITHUB_RUN_ATTEMPT` | `gha upload` and `gha status` (the run to read), `gha` posture commands (`--repo` default) |
| `GITHUB_STEP_SUMMARY` | `scan` appends a Markdown summary when set |
| `GITHUB_ACTIONS`, `GITLAB_CI`, `CI_JOB_ID`, `TF_BUILD`, `BITBUCKET_BUILD_NUMBER`, `JENKINS_URL`, `BUILD_NUMBER`, `KUBERNETES_SERVICE_HOST`, ... | Platform detection; see [env](/cli/commands/utilities/#env) |

## Deployment labels and BOM identity

Fallbacks for the flags of the `scan` family, `cdx`, `aibom` and `cbom`. A flag wins over its variable; for a label, the first variable set wins. See [scan](/cli/commands/scan/#deployment-context-and-bom-identity) and [Author and customise](/sbom/author/overview/#environment-variables).

| Variable | Flag |
|---|---|
| `VULNETIX_PROJECT`, then `CI_PROJECT_NAME` | `--project` |
| `VULNETIX_ENVIRONMENT`, then `CI_ENVIRONMENT_NAME`, `ENVIRONMENT_NAME` | `--environment` |
| `VULNETIX_CLUSTER`, then `CLUSTER_NAME`, `KUBERNETES_CLUSTER_NAME` | `--cluster` |
| `VULNETIX_NAMESPACE`, then `POD_NAMESPACE`, `KUBERNETES_NAMESPACE` | `--namespace` |
| `VULNETIX_BOM_MANUFACTURER` | `--bom-manufacturer` |
| `VULNETIX_BOM_MANUFACTURER_URL` | `--bom-manufacturer-url` |
| `VULNETIX_BOM_AUTHORS` | `--bom-author` (comma- or semicolon-separated) |
| `VULNETIX_BOM_SUPPLIER`, `VULNETIX_BOM_SUPPLIER_URL` | `--bom-supplier`, `--bom-supplier-url` |
| `VULNETIX_BOM_SERIAL`, `VULNETIX_BOM_VERSION` | `--bom-serial`, `--bom-version` |
| `VULNETIX_BOM_LICENSES`, `VULNETIX_BOM_PROPERTIES`, `VULNETIX_BOM_OVERLAY` | `--bom-license`, `--bom-property`, `--bom-overlay` (comma- or semicolon-separated) |
| `VULNETIX_COMPONENT_NAME`, `_VERSION`, `_TYPE`, `_GROUP`, `_PURL` | `--component-name`, `-version`, `-type`, `-group`, `-purl` |

## Output, banner and analytics

| Variable | Effect |
|---|---|
| `CI=true` | No banner; no analytics unless also under GitHub Actions; superseded-flag notes are not printed |
| `DO_NOT_TRACK=1` | No banner, no analytics, no install-script ping |
| `VULNETIX_NO_ANALYTICS` | Any value: no analytics. `1`: no install-script ping. |
| `VULNETIX_ARTIFACT_MANIFEST` | Path of the [artifact manifest](/cli/reference/artifact-manifest/), as `--artifact-manifest` |
| `NO_COLOR` | No colour (as `--color never`) |
| `COLUMNS` | Output width when not a terminal and `--width` is not set |

## Caches

| Variable | Default location | Effect |
|---|---|---|
| `VULNETIX_SAST_CACHE_DIR` | `<user cache dir>/vulnetix/sast` | SAST rule-result cache; point a CI cache step here. `--no-cache` turns it off. |
| `VULNETIX_GRAPH_CACHE_DIR` | `<user cache dir>/vulnetix/graph` | Per-file graph facts cache for `analyze` and scans |
| `VULNETIX_MALSCAN_DEFS_DIR` | `<user cache dir>/vulnetix/malscan/definitions` | Malscan threat-intel definitions |
| `VULNETIX_NO_TOKEN_CACHE` | `~/.vulnetix/cache/tokens` | Any value: do not keep SigV4 tokens on disk |
| `VULNETIX_NO_LICENSE_CACHE` | `~/.vulnetix/cache/licenses` | Any value: do not keep licence lookups |
| `VULNETIX_NO_BINARY_CACHE` | `~/.vulnetix/cache/binaries` | Any value: do not keep binary version detections |

`<user cache dir>` is `~/.cache` on Linux (or `$XDG_CACHE_HOME`), `~/Library/Caches` on macOS and `%LocalAppData%` on Windows. VDB responses are cached under `~/.vulnetix/cache/vdb/`, one directory per CLI version; old versions are cleaned at start.

## Tuning

| Variable | Default | Effect |
|---|---|---|
| `VULNETIX_SCA_CONCURRENCY` | `6` (1 to 16) | Parallel `cli.sca` requests |
| `VULNETIX_SCA_TIMEOUT` | `75` seconds (10 to 300) | Per-request limit for `cli.sca` |
| `VULNETIX_SAST_WORKERS` | CPU count | Concurrent rule evaluations |
| `VULNETIX_SAST_SHARDS` | by CPU count and rule count | Concurrent compile and evaluate shards; `1` compiles once |
| `VULNETIX_SAST_NO_LANG_FILTER` | unset | Any value: run rules for languages absent from the repository too |
| `VULNETIX_REACHABILITY_CONCURRENCY` | CPU count (1 to 32) | Files analysed in parallel by reachability |
| `VULNETIX_GRAPH_WORKERS` | CPU count | Parallel file parsing for the graph |
| `GOMEMLIMIT` | 75% of the cgroup `memory.max` or physical memory | A scan sets a soft Go memory limit so the GC works harder before the kernel kills it. An explicit `GOMEMLIMIT` wins. |

## Debugging

| Variable | Effect |
|---|---|
| `VULNETIX_HTTP_TRACE` | Any value: one stderr line per VDB request with start offset, duration, status, method, URL and connection setup time, e.g. `[http#5] + 2241ms 3836ms 200 POST api.vdb.vulnetix.com/v2/cli.sca net=0ms` |
| `VULNETIX_PPROF_DIR` | Write `cpu.pprof` (and other profiles) for the run into this directory |

## Install script

| Variable | Default | Effect |
|---|---|---|
| `INSTALL_DIR` | `/usr/local/bin` | Same as `--install-dir` |
| `VERSION` | `latest` | Same as `--version` |
