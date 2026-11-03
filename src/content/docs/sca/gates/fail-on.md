---
title: Gates and exit codes
nav: --fail-on
description: The --fail-on rules, the legacy gate flags they replace, which findings each gate counts, and the exit codes a pipeline can rely on.
order: 1
sources: [cli/internal/scanopts/failon.go, cli/internal/scanopts/surface.go, cli/internal/scan/gates.go, cli/cmd/scan.go, cli/cmd/scan_jail.go, cli/cmd/exit_codes.go, cli/cmd/jail.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

A gate decides the exit code. Display flags such as `--min-severity` and `--filter` never do.

```bash
vulnetix sca --fail-on high,kev,malware
vulnetix sca --fail-on exploit=active --fail-on eol=high --fail-on cooldown=7d
```

`--fail-on` takes comma-separated rules and can be repeated. An unknown rule fails the run and lists the valid ones.

## Rules

| Rule | Exit 1 when | Legacy flag |
|---|---|---|
| `low`, `medium`, `high`, `critical` | Any counted vulnerability's highest severity is at or above the level. Severity is the highest of every scoring source the VDB holds (CVSS, EPSS, Coalition ESS, SSVC). | `--severity <level>` |
| `kev` | Same as `exploit=active` | none |
| `exploit=poc` | Any public exploit exists, or the CVE is on any KEV list | `--exploits poc` |
| `exploit=active` | The CVE is on the CISA, VulnCheck or EU KEV list, or is weaponised | `--exploits active` |
| `exploit=weaponized` | Weaponised exploitation in the wild | `--exploits weaponized` |
| `malware` | A dependency is a known malicious package, from an advisory or from the package-level verdict | `--block-malware` |
| `eol` | A runtime (Go, Node.js, Python, Ruby) or a package with VDB end-of-life data is graded at or above the EOL block severity, `critical` by default | `--block-eol` |
| `eol=<severity>` | As `eol`, blocking from that graded severity | `--block-eol --block-eol-severity <severity>` |
| `unpinned` | A direct dependency uses a range (`^`, `~`, `>=`, `>`, `<=`, `<`, `!=`, `*`, `latest`, `x`) instead of an exact version | `--block-unpinned` |
| `unprotected` | A vulnerable package has no fix and no unexpired recorded control | none |
| `lag=<n>` | An installed version is one of the `n` most recently published versions of its package | `--version-lag <n>` |
| `cooldown=<n>d` | An installed version was published within the last `n` days. The `d` is optional. | `--cooldown <n>` |

When rules overlap, the strictest wins: `--fail-on high --fail-on low` fails on `low`, and `exploit=poc` beats `exploit=active`. Mixing `--fail-on` and a legacy flag never loosens a gate. For `lag` and `cooldown` the larger number wins.

### EOL grading

An end-of-life date is graded by how close it is. The organisation can change the mapping on its quality gate.

| Horizon | Default severity | Quality gate key |
|---|---|---|
| Already past its end-of-life date | `critical` | `eolRetiredSeverity` |
| Within 30 days | `high` | `eolWithin30DaysSeverity` |
| This quarter | `medium` | `eolThisQuarterSeverity` |
| Next quarter | `low` | `eolNextQuarterSeverity` |

With the default block severity `critical`, only components already past end of life fail the build. Closer horizons are reported.

## What the gates count

| Finding | Counted |
|---|---|
| Affected, or `unverified` (range could not be compared) | yes |
| Ruled out by version (`not affected`, `likely not affected`) | no, unless `--strict` |
| Covered by an unexpired recorded control | yes, unless `--accept-defended` |
| Matched by an active ignore rule (local `.vulnetix/memory.yaml` or the org's suppression rules) | no: removed before reporting |
| Marked not affected by a `--vex-file`, `--vex` or declared `VexSource` statement | no |

Ruled-out and defended findings stay in the SBOM, the JSON report and the console. Only the gate input leaves them out. Suppressed findings are removed from every output.

Artefacts (`.vulnetix/sbom.cdx.json`, `memory.yaml`, `--output` files) are written before the gates run, so a failed build still leaves the full results.

## Jail

`--jail` asks the organisation's jail policy for a verdict after the scan uploads. A breached rule is reported as a gate named `jail:<label>` and exits `1`. If a rule cannot be evaluated against current scan coverage, and nothing else breached, the exit is `3`. An organisation with no jail policy passes. See [Jail](/quality-gates/jail/how-jail-works/).

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Scan finished; no gate breached |
| `1` | A gate breached, or the command failed (bad flag, unreadable path, API failure) |
| `3` | `--jail` only: the jail gate could not reach a verdict |

`vulnetix sca`, `fix`, `containers` and `license` do not use exit `2`; flag errors exit `1`. Exit `2` belongs to the standalone `vulnetix jail` command.

A breach prints `quality gate(s) breached:` followed by one message per gate, for example `--severity high: 3 vulnerabilities at or above the threshold`.

## The organisation's gate wins

When the scan runs under a signed-in organisation that has a quality gate, every value the organisation set replaces the matching flag, including a `--fail-on` rule. See [Org quality gate](/sca/gates/org-quality-gate/).
