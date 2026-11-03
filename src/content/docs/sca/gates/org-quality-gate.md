---
title: How the org quality gate overrides scan flags
nav: Org quality gate
description: Which quality gate keys replace which vulnetix sca and fix flags, when the override applies, and how to see it happen.
order: 2
sources: [cli/cmd/quality_gate_enforce.go, cli/cmd/scan.go, cli/internal/scanopts/fromcobra.go, vdb-api/internal/handler/v2_cli_quality_gate.go, saas/prisma/models/quality-gate.prisma]
checked: [cli@4c8c3b7, vdb-api@4145f0a]
updated: 02 Nov 2026
---

An organisation's [quality gate](/quality-gates/) is the policy for every scan its members and pipelines run. The CLI fetches it once per scan with `POST /v2/cli.quality-gate-get` and applies it before any threshold is used.

> [!WHY] The organisation always wins
> A set value in the org's gate replaces the scan's flag even when the flag was passed explicitly, and even when the org value is looser. A pipeline cannot opt itself out of policy by editing its own command line. A value the org left unset (`null`) leaves the flag, or the built-in default, in place.

## When it applies

| Scan context | Gate applied |
|---|---|
| Signed in to an organisation (`vulnetix auth login`, or `VULNETIX_API_KEY` and `VULNETIX_ORG_ID`) | yes |
| Community credentials, or none | no: flags only |
| The lookup fails, or the org has no gate configured | no: flags only |

Run with `--verbose` to see each decision on stderr:

```text
--severity high superseded by org policy: critical
org policy applied: --block-malware true
Org quality gate: applied 2 settings from org policy (org policy always wins).
```

## Key to flag mapping

| Quality gate key | Values | Replaces |
|---|---|---|
| `severity` | `low`, `medium`, `high`, `critical`, or `null` | `--severity`, and the severity part of `--fail-on` |
| `exploits` | `poc`, `active`, `weaponized`, or `null` | `--exploits`, `--fail-on exploit=...`, `--fail-on kev` |
| `blockMalware` | `true`, `false`, or `null` | `--block-malware`, `--fail-on malware` |
| `blockEol` | `true`, `false`, or `null` | `--block-eol`, `--fail-on eol` |
| `blockUnpinned` | `true`, `false`, or `null` | `--block-unpinned`, `--fail-on unpinned` |
| `versionLag` | integer `>= 0`, or `null` | `--version-lag`, `--fail-on lag=` |
| `cooldown` | integer days `>= 0`, or `null` | `--cooldown`, `--fail-on cooldown=` |
| `scaAutofixStrategy` | `latest`, `safest`, `stable`, `rolling`, or `null` | `--strategy` on `fix`, `--sca-autofix-strategy` |
| `scaAutofixMaxMajorBump` | integer `>= 0`, or `null` | `--max-major-bump` on `fix`, `--sca-autofix-max-major-bump` |
| `eolRetiredSeverity` | `skip`, `low`, `medium`, `high`, `critical`; default `critical` | EOL grading, read only when the EOL gate is on |
| `eolWithin30DaysSeverity` | as above; default `high` | as above |
| `eolThisQuarterSeverity` | as above; default `medium` | as above |
| `eolNextQuarterSeverity` | as above; default `low` | as above |

`--fail-on` rules are folded into the same settings as the legacy flags before the org gate is applied, so the org value replaces whichever spelling you used. `--fail-on unprotected`, `--strict`, `--accept-defended`, `--block-eol-severity` and `--jail` have no quality gate key and are never overridden.

An org value of `false` for a gate switches it off even if the pipeline passed the flag. An org `cooldown` or `versionLag` of `0` disables that gate.

## Setting the gate

| Where | How |
|---|---|
| Resolve Platform | Resolve, Quality gate (`/resolve/quality-gate`) |
| CLI | `vulnetix config set quality-gate ...` and `vulnetix config get quality-gate` |
| As a document | A `QualityGate` (`apiVersion: vulnetix.com/v1`), validated offline with `vulnetix config validate`. See [Platform IaC](/platform-iac/). |

The quality gate itself, including its EOL policy, is documented in [Quality gates](/quality-gates/).
