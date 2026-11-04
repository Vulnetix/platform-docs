---
title: Output formats and views
nav: Output
description: The terminal views, the --output targets for CycloneDX and the JSON report, the result groups, and the display flags that never change the exit code.
order: 3
sources: [cli/cmd/scan.go, cli/internal/scanopts/surface.go, cli/internal/report/options.go, cli/internal/report/model.go, cli/internal/report/build.go, cli/internal/report/json.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

## `--output`

`-o, --output` is repeatable. A keyword writes to stdout and replaces the terminal report; a file path writes a file and keeps the terminal report. Only one stdout keyword is allowed per run.

| Value | Writes |
|---|---|
| `json-cyclonedx` | CycloneDX 1.7 JSON to stdout |
| `json-report` | The Vulnetix JSON report (`"schema": "vulnetix/report/v1"`) to stdout |
| `json-sarif` | SARIF 2.1.0 to stdout. It holds rule findings only (SAST, secrets, containers, IaC). For `vulnetix sca` it is an empty SARIF log. |
| `*.cdx.json`, `*.cdx`, `*.bom.json`, `*.sbom.json` | CycloneDX 1.7 file, with the dependency tree |
| `*.report.json` | JSON report file |
| `*.sarif`, `*.sarif.json` | SARIF file, written only when a rule scanner ran |

Any other value fails with `cannot infer output format`. `--format` is deprecated and maps to `json-cyclonedx`.

> [!CAREFUL] SARIF does not carry dependency vulnerabilities
> To feed SCA findings to a code-scanning dashboard, use the CycloneDX SBOM or the JSON report. `vulnetix sca -o results.sarif` writes no file, because no rule scanner ran.

Snapshot links for the Resolve Platform are printed to stderr when stdout carries JSON, so piping stays clean.

### The JSON report

```json
{
  "schema": "vulnetix/report/v1",
  "counts": { "advisories": 12, "packages": 7, "byGroup": { "action": 2, "wait": 5 } },
  "packages": [ ... ],
  "meta": { ... }
}
```

Every package carries its group, its fix and, for each advisory, the verdict and the working behind it. Advisories ruled out by version are kept under `ruledOut`.

## Result groups

The report sorts packages by what to do, not only by severity.

| Group | Meaning |
|---|---|
| `action` | Exploited, reachable, on a KEV list, or malicious |
| `wait` | Affected, with no signal that raises urgency |
| `unverified` | Matched by name where the advisory's range cannot be compared with the installed version (a git commit range, for example). Still counted. |
| `protected` | Has an unexpired recorded control that blocks the attack. Still affected and counted. |
| `monitored` | Has an unexpired recorded control that only detects, or a blocking rule in log-only mode |
| `not_affected` | Matched by name and ruled out by version |

## Display flags

None of these changes what is found, what goes into JSON or CycloneDX, or the exit code.

| Flag | Values | Default |
|---|---|---|
| `--view` | `auto`, `packages`, `findings`, `tree`, `table`, `plain`, `json` | `auto`: `plain` in a pipe or CI, `packages` at a terminal |
| `--filter` | `kev`, `exploited`, `reachable`, `fixable`, `nofix`, `defended`, `unprotected`, `direct`, `transitive` (comma-separated, repeatable; all must match) | none |
| `--min-severity` | `low`, `medium`, `high`, `critical` | none |
| `--sort` | `threat`, `severity`, `package` | `threat` |
| `--show` | `paths`, `files`, `clean`, `scores`, `defences`, `tests` | none |
| `--hide` | `fixes`, `exploits`, `defences`, `not-affected` | none |
| `-q, --quiet` | | Print findings only; nothing when clean |
| `--explain` | advisory id, package, `name@version`, rule id or file path | Explains one finding with its evidence. Runs only what that needs and writes and uploads nothing. |
| `--color` | `auto`, `always`, `never` | `auto` |
| `--ascii` | | Plain ASCII symbols |
| `--width` | columns | terminal width, or `COLUMNS` |
| `-v`, `-vv` | | More detail. `-v` stops folding duplicate problems. |

`--filter reachable` matches `direct` and `transitive` reachability. The `semantic` signal (the package is referenced by name) is shown as `referenced` and does not count as reachable. See [Reachability](/sca/reachability/overview/).

### Superseded flags

These still work, are hidden from `--help`, and print one note at an interactive terminal (never in CI).

| Old flag | Use instead |
|---|---|
| `--no-exploits` | `--hide exploits` |
| `--no-remediation` | `--hide fixes` |
| `--show-introduced-paths`, `--paths` | `--show paths` |
| `--show-detected` | `--show files` |
| `--show-all-manifests` | `--show clean` |
| `--results-only` | `-q` |

## Files written

| Path | Content |
|---|---|
| `.vulnetix/sbom.cdx.json` | CycloneDX 1.7 SBOM: components, dependency tree, vulnerabilities, licence findings, VEX. Other passes (licence, binaries) merge into it rather than overwrite it. |
| `.vulnetix/memory.yaml` | Scan state, finding history, triage decisions and reachability evidence. Off with `--disable-memory`. |

## SBOM labels

| Flag | Effect |
|---|---|
| `--project`, `--cluster`, `--namespace`, `--environment`, `--tag key=value` | Deployment context on the SBOM and the snapshot. When a flag is absent the first set variable fills it: `VULNETIX_PROJECT`, `CI_PROJECT_NAME`; `VULNETIX_ENVIRONMENT`, `CI_ENVIRONMENT_NAME`, `ENVIRONMENT_NAME`; `VULNETIX_CLUSTER`, `CLUSTER_NAME`, `KUBERNETES_CLUSTER_NAME`; `VULNETIX_NAMESPACE`, `POD_NAMESPACE`, `KUBERNETES_NAMESPACE`. |
| `--bom-manufacturer`, `--lifecycle` | BOM authoring identity. See [SBOM](/sbom/). |
| `--vex-file <path>`, `--vex <path or https URL>` | Apply third-party VEX before gates are evaluated. Repeatable. A scan also reads the `VexSource` documents declared in `.vulnetix/config` (CLI v4.2.0). `--no-vex` ignores all of it. See [VEX in a scan](/vex/scans/vex-file/). |
