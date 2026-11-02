---
title: report
description: vulnetix report renders the stored results of the last scan from .vulnetix/sbom.cdx.json, offline by default, with optional refreshes of exploit, advisory and version data.
order: 2
sources: [cli/cmd/report.go, cli/internal/scanopts/surface.go, cli/cmd/from_memory.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

```sh
vulnetix report [path] [flags]
```

`report` prints the same views a scan prints, from the CycloneDX document the scanners already wrote. Nothing is discovered, parsed or evaluated, and by default no network call is made. Use it to look at findings again, in a CI step after the scan, or on a machine that cannot reach the API.

```sh
vulnetix report                                   # replay ./.vulnetix/sbom.cdx.json
vulnetix report ./service                         # another project; same as --path ./service
vulnetix report --view findings --min-severity high
vulnetix report --fresh-exploits                  # stored findings, current exploit intelligence
vulnetix report --fresh-exploits --fresh-advisories
```

## Flags

| Flag | Default | Effect |
|---|---|---|
| `[path]`, `--path <dir>` | `.` | Project whose `.vulnetix/` is read. The positional argument wins. |
| `--fresh-exploits` | off | Re-fetch exploit intelligence (KEV, PoC, weaponisation) for the stored findings |
| `--fresh-advisories` | off | Re-fetch remediation plans and fix availability |
| `--fresh-vulns` | off | Re-check affected version ranges and current scoring |
| `--view`, `--filter`, `--min-severity`, `--show`, `--hide`, `--sort`, `-q`, `--explain`, `--color`, `--ascii`, `--width` | | The display options of [`scan`](/cli/commands/scan/#what-to-show) |

Each `--fresh-*` flag refreshes one class of data and leaves the rest as stored. They are the only part of `report` that uses credentials; without them, any credential state works, including none.

`report` has no gate flags (`--fail-on`, `--strict`) and does not set an exit code from findings.

## Input and exit codes

| Reads | Written by |
|---|---|
| `<path>/.vulnetix/sbom.cdx.json` | `scan`, `sca`, `containers`, `license`, `cdx` |

The document holds the components, the vulnerabilities and their VEX analysis, which is all the views need. Licence findings recorded by `license` are in the same document and shown with the rest.

| Exit | When |
|---|---|
| `0` | Rendered, whatever the findings |
| `1` | No stored results: `no scan memory found: <path>/.vulnetix/sbom.cdx.json does not exist (run 'vulnetix scan' first)`, or a refresh failed |

`vulnetix scan --from-memory` (and its `--fresh-*` flags) is a deprecated alias for `report`.
