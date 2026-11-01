---
title: Scan node
description: A step that gathers findings from Vulnetix scanners and GitHub's alerts, and can stop the run when it finds malware, a known exploited vulnerability or a secret.
order: 11
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-engine.md, vdb-site/api/internal/handler/factory_engine_node_scan.go]
checked: [vdb-site@597344c]
updated: 28 Oct 2026
---

A scan step collects findings for the run's repository and writes them to `scan/findings.json`: counts and identifiers, never source code. Later steps read it. A [decision](/software-factory/workflows/nodes/decision/) uses it to judge a finding, and a [gate](/software-factory/workflows/nodes/gate/) uses it to apply the quality gate and release jail.

## Config

| Key | Values | Default |
|---|---|---|
| `source` | `posture`, `webhook`, `api`, `s3`, `fresh_clone` | required on publish; the engine falls back to `forge.read.default`, then `posture` |
| `scanners` | `sca`, `sast`, `secrets`, `iac`, `containers`, `license`, `malscan`, `eol`, `cbom`, `aibom`, `scorecard` | required on publish; the engine falls back to `sca`, `malscan`, `secrets` |
| `failOn` | `malware`, `kev`, `secrets`, `never` | |
| `sbomFormat` | `cyclonedx-1.6`, `spdx-2.3` | |

## Where findings come from

| `source` | Reads | GitHub calls |
|---|---|---|
| `posture` | The stored scanner results and the alerts GitHub's webhooks deliver (Dependabot, code scanning, secret scanning) | 0 |
| `webhook`, `api` | The same webhook-fed alert tables | 0 |
| `s3` | SARIF and SBOM files uploaded to the run's `scan/` folder. With none there yet, the step waits until an upload arrives. | 0 |
| `fresh_clone` | Meant to clone the repository and scan it on a worker. See below. | 0 |

Older graphs may say `posture_mirror` and `s3_raw`. They are read as `posture` and `s3`.

> [!CAREFUL] fresh_clone falls back to stored results today
> A fresh clone scan needs a worker that can run the scanners, and Belai ships the scanner agent as a background agent, not a worker. Until it ships one, a `fresh_clone` step reads the stored results instead and says so: `scan/findings.json` carries `requestedSource: "fresh_clone"` and a note, and a `scan.source_fallback` event and audit entry record it. `failOn` still applies to those results.

## Stopping the run

`failOn` names what stops the run:

| Value | Stops on |
|---|---|
| `malware` | A package flagged as malicious |
| `kev` | A vulnerability in CISA's Known Exploited Vulnerabilities catalogue |
| `secrets` | A leaked secret |
| `never` | Nothing. Record only. |

A step that hits one fails with `scan_blocking` and the run stops.

## New-package checks

On a `firewall` trigger that feeds a review, `newTo` decides whether a package counts as new to the organisation (`org`) or to the repository (`repo`). `repo` applies to the Package Firewall source only. Using it with another source is refused with `new_to_package_only`.

## Related

- [Gate node](/software-factory/workflows/nodes/gate/)
- [Trust and SLSA](/software-factory/evidence/trust-and-slsa/) for the scanner matrix per repository.
