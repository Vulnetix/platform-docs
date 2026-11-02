---
title: Quality Gate settings
nav: Settings
description: Every Quality Gate field with its scan flag, API field, QualityGate document field, allowed values and what it fails a build on.
order: 1
sources: [saas/prisma/models/quality-gate.prisma, vdb-site/api/internal/handler/quality_gate.go, cli/cmd/config.go, cli/cmd/quality_gate_enforce.go, cli/cmd/scan.go, config-schemas/schemas/QualityGate.schema.json]
checked: [cli@4c8c3b7, vdb-site@1a06d67, saas@50cedf37, config-schemas@9bda9e1]
updated: 02 Nov 2026
---

The gate is one `CliQualityGateConfig` row per organization. The nine enforcement settings are nullable: `null` means the organization has not set it, and the scan flag (or its default) applies.

## Enforcement settings

| Setting | Scan flag | `config set quality-gate` flag | API field | `QualityGate` field | Values | Fails the build when |
|---|---|---|---|---|---|---|
| Severity | `--severity` | `--severity` | `severity` | `spec.severity` | `low`, `medium`, `high`, `critical` | any vulnerability, or any SAST finding, is at or above the level |
| Exploits | `--exploits` | `--exploits` | `exploits` | `spec.exploits` | `poc`, `active`, `weaponized` | exploit maturity reaches the level: `poc` any public exploit, `active` CISA or EU KEV or actively exploited, `weaponized` in the wild only |
| Block malware | `--block-malware` | `--block-malware` | `blockMalware` | `spec.blockMalware` | bool | a dependency is a known malicious package, or malscan finds malware in the installed files |
| Block unpinned | `--block-unpinned` | `--block-unpinned` | `blockUnpinned` | `spec.blockUnpinned` | bool | a direct dependency uses a range (`^`, `~`, `>=`) instead of an exact version |
| Block EOL | `--block-eol` | `--block-eol` | `blockEol` | `spec.eol.block` | bool | a runtime or package is end of life at or above the block floor; see [EOL policy](/quality-gates/gate/eol-policy/) |
| Cooldown | `--cooldown` | `--cooldown` | `cooldown` | `spec.cooldownDays` | integer `>= 0`, `0` off | a dependency version was published in the last N days (best effort) |
| Version lag | `--version-lag` | `--version-lag` | `versionLag` | `spec.versionLag` | integer `>= 0`, `0` off | a dependency's installed version is one of the N most recently published versions of that package |
| SCA autofix strategy | `--sca-autofix-strategy` | `--sca-autofix-strategy` | `scaAutofixStrategy` | `spec.scaAutofix.strategy` | `latest`, `safest`, `stable`, `rolling` | not a gate: picks the target version for `--sca-autofix` (scan default `stable`) |
| SCA autofix max major bump | `--sca-autofix-max-major-bump` | `--sca-autofix-max-major-bump` | `scaAutofixMaxMajorBump` | `spec.scaAutofix.maxMajorBump` | integer `>= 0` | autofix refuses a target more than N majors away (`0` stays on the current major) |

Autofix strategies: `latest` the newest release; `safest` the release with the fewest known vulnerabilities; `stable` the newest release past its cooldown; `rolling` the newest release that is not malware, known vulnerabilities allowed. See [SCA autofix](/sca/).

> [!CAREFUL] Version lag means opposite things in the gate and the firewall
> In the Quality Gate, `versionLag = 3` fails a dependency that is one of the 3 newest releases: it makes you wait for N later releases. In the [Package Firewall](/package-firewall/policy/settings/#version-lag), `versionLag = 3` removes versions more than 3 releases behind the newest. The `QualityGate` schema's description ("more than this many releases behind the newest") describes the firewall meaning; the CLI does what this table says.

The scan flag `--sca-autofix-max-major-bump` also takes a negative number for no limit. The organization setting cannot: the API refuses values below `0`, so leave it unset to let members choose.

## EOL severities

Four more fields grade an end-of-life date into a severity. They are not nullable and always have a value. Defaults: retired `critical`, within 30 days `high`, this quarter `medium`, next quarter `low`. Each also takes `skip`. See [EOL policy](/quality-gates/gate/eol-policy/).

| Bucket | API field | `QualityGate` field | `config set eol-policy` flag |
|---|---|---|---|
| Retired | `eolRetiredSeverity` | `spec.eol.severities.retired` | `--retired-severity` |
| Within 30 days | `eolWithin30DaysSeverity` | `spec.eol.severities.within30Days` | `--within-30-days-severity` |
| This quarter | `eolThisQuarterSeverity` | `spec.eol.severities.thisQuarter` | `--this-quarter-severity` |
| Next quarter | `eolNextQuarterSeverity` | `spec.eol.severities.nextQuarter` | `--next-quarter-severity` |

## Setting and clearing

```bash
vulnetix config set quality-gate --severity high --block-malware true --cooldown 3
vulnetix config set quality-gate --severity null --cooldown null
vulnetix config get quality-gate
```

- A flag you pass is written; flags you do not pass keep their stored value.
- `null` unsets the setting for the organization. Unset is not the same as `false` or `0`: `--block-unpinned false` actively turns the gate off for every member, while `null` lets each pipeline decide.
- `config get quality-gate` shows unset settings as **not set**.

In the console every enforcement field has a **Not enforced** choice, which stores `null`. The console saves all nine fields at once, so saving the form writes every field as shown.

## API validation

| Field | Error |
|---|---|
| `severity` | `severity must be one of low, medium, high, critical` |
| `exploits` | `exploits must be one of poc, active, weaponized` |
| `scaAutofixStrategy` | `scaAutofixStrategy must be one of latest, safest, stable, rolling` |
| `cooldown`, `versionLag`, `scaAutofixMaxMajorBump` | `<field> must be >= 0` |
| `eol*Severity` | `<field> must be one of skip, low, medium, high, critical` |
