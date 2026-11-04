---
title: SCA in the console
nav: Resolve pages
description: How an uploaded scan becomes findings in Resolve, the Supply chain pages and their filters, triage states, and the API routes behind them.
order: 1
sources: [vdb-site/api/main.go, vdb-site/api/internal/handler/findings.go, vdb-site/api/internal/handler/finding_triage.go, vdb-site/api/internal/handler/scanner_results.go, vdb-site/api/internal/handler/attack_surface.go, website/src/router/public-routes.ts, website/src/shared/findings-workbench.ts, vdb-api/internal/handler/cli_persist.go, vdb-api/internal/handler/v2_cli_sca_reachability.go, vdb-api/internal/handler/v2_cli_finalize.go]
checked: [vdb-site@1a06d67, website@ad775f3, vdb-api@4145f0a]
updated: 02 Nov 2026
---

A scan run while signed in to an organisation is recorded as an ingestion snapshot. Community and unauthenticated scans are not recorded.

## From scan to finding

| CLI request | Handled by | Records |
|---|---|---|
| `POST /v2/cli.sca` | VDB API | The snapshot, scanner run, findings, dependencies and the scan environment (git context, CI, host) |
| `POST /v2/cli.sca-reachability` | VDB API, after the CLI has answered | Reachability results. `unreachable` sets triage to `not_affected` with `code_not_reachable`; `direct`, `transitive` and `semantic` set `affected`. Writes OpenVEX and re-merges the stored SBOM. |
| `POST /v2/cli.finalize` | VDB API, after the CLI has answered | The gate results and the exit code, on the scan environment |
| `POST /v2/cli.insights` | VDB API | The dependency graph report behind `/resolve/graph` |

The snapshot link is printed at the end of the run (on stderr when stdout carries JSON).

## Pages

| Page | Path |
|---|---|
| Supply chain (SCA) | `/resolve/sca` |
| One SCA finding | `/resolve/sca/finding/<findingUuid>` |
| What to fix first (all scanners) | `/resolve/findings` |
| Scans | `/resolve/scanner-results`, `/resolve/scanner-results/<snapshotUuid>` |
| Quality gate | `/resolve/quality-gate` |
| Safe Harbour, including container curation | `/resolve/safe-harbour` (`?lens=containers`) |

All under https://www.vulnetix.com. The finding page shows the CVE, scores, exploits, recorded defences, Vulnetix proof of concept, reachability, VEX, how the package was introduced, artefacts, history and internet exposure (attack surface). `/resolve/container-curation` redirects to the Safe Harbour container lens.

## Filters

The list accepts these filters (`filters=` in the API):

`open`, `resolved`, `notAffected`, `falsePositive`, `reachable`, `fixable`, `unfixable`, `exploitable`, `malware`, `eol`, `aged`, `detectionBlind`, `suppressed`, `testCode`

| Severity bucket | Score |
|---|---|
| `critical` | 9.0 and above |
| `high` | 7.0 to below 9.0 |
| `medium` | 4.0 to below 7.0 |
| `low` | above 0 and below 4.0 |
| `informational` | 0, with a CVSS or CWSS vector present |
| `unknown` | 0 |

Suppressed rows are hidden unless included explicitly. The default order is by severity score; `priority` and `prediction` are the alternatives.

## Triage states

| State | OpenVEX status written |
|---|---|
| `in_triage`, `under_investigation` | `under_investigation` |
| `affected`, `exploitable` | `affected` |
| `not_affected`, `false_positive` | `not_affected` (a justification is required) |
| `fixed`, `resolved`, `resolved_with_pedigree` | `fixed` |
| `suppressed` | `not_affected`. Set by suppression rules; not selectable by hand. |

Every triage or score change writes a VEX record scoped to that finding. `vulnetix fix` posts its own VEX: fixed for what the confirmation scan no longer reports, and affected with risk accepted for packages with no safe version.

## API

The console calls the Vulnetix API with your session.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/v1/findings?category=sca` | List. Params: `page`, `perPage` (default 50, max 200), `q`, `cwe`, `filters`, `sev`, `states`, `includeSuppressed`, `sort`, `fullName`, `from`, `to`, `tool` |
| `GET` | `/v1/findings/facets`, `/v1/findings/stats`, `/v1/findings/metrics` | Counts behind the filters and charts |
| `GET` | `/v1/findings/export` | Export of the filtered list |
| `PATCH` | `/v1/findings/{uuid}/triage` | Body: `analysisState`, `analysisJustification`, `analysisResponse[]`, `analysisDetail` |
| `PATCH` | `/v1/findings/{uuid}/score` | Body: `cvssVector`, `cvssScore`, `cwssVector`, `cwssScore` |
| `POST` | `/v1/findings/bulk/triage`, `/v1/findings/bulk/suppress`, `/v1/findings/bulk/score` | Bulk changes |
| `GET` | `/v1/scanner-results/finding/{uuid}` and its `/cve`, `/scores`, `/exploits`, `/defences`, `/reachability`, `/vex`, `/introduced-via`, `/history`, `/attack-surface` | Finding detail |
| `GET` | `/v1/scanner-results/{snapshotUuid}`, its `/findings`, and `/v1/scanner-results/cyclonedx`, `/vex` | One scan and its documents |

An unknown filter name is refused with HTTP 400.
