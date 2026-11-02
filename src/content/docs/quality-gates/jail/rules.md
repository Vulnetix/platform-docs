---
title: Jail rules
nav: Rules
description: Every field of a Jail rule, the VULN, EOL, GOAL and HYGIENE kinds, aggregates, operators, goals with deadlines and ratchets, and the validation errors.
order: 2
sources: [saas/prisma/models/jail.prisma, vdb-site/api/internal/handler/jail_policy.go, vdb-api/internal/handler/jail_eval.go]
checked: [vdb-site@1a06d67, saas@50cedf37, vdb-api@4145f0a]
updated: 02 Nov 2026
---

Every rule does the same thing: select a population, aggregate it, compare the result with a threshold.

## Kinds

| Kind | Population |
|---|---|
| `VULN` | Open vulnerability findings in the latest scan per tool |
| `EOL` | Dependencies at or approaching end of life, graded with the [EOL horizons](/quality-gates/gate/eol-policy/#horizons) |
| `GOAL` | Facts matching a target pattern: a migration or refactor target with a deadline |
| `HYGIENE` | Secrets, license, IaC, container and malware findings. With no `category`, all five. |

## Fields

| Field | Values | Notes |
|---|---|---|
| `kind` | `VULN`, `EOL`, `GOAL`, `HYGIENE` | required |
| `label` | text | required; shown in output and as `jail:<rule>` in scan output |
| `orderIndex` | int | display order and headline reason only |
| `enabled` | bool | default `true` |
| `category` | `SCA`, `SAST`, `SECRETS`, `IAC`, `OCI`, `LICENSE`, `MALWARE` | `INFRA` and `CONTAINER` are accepted as aliases |
| `toolName` | text | restrict to one scanner |
| `ecosystem` | text | restrict to one package ecosystem |
| `severityFloor` | `low`, `medium`, `high`, `critical` | count only findings at or above |
| `flags` | JSON array of `kev`, `malicious`, `hasFix`, `reachable`, `direct` | every listed attribute must be true |
| `targetPattern` | `path.Match` glob over the item's identifier (purl, package, rule ID) | required for `GOAL` |
| `aggregate` | `COUNT`, `COUNT_PAST_SLA`, `MAX_AGE_DAYS`, `PERCENT` | required |
| `operator` | `GT`, `GTE`, `LT`, `LTE`, `EQ`, `NEQ`, `BETWEEN`, `OUTSIDE` | required |
| `thresholdLow` | number | required |
| `thresholdHigh` | number | required for `BETWEEN` and `OUTSIDE`; not below `thresholdLow` |
| `deadline` | epoch ms | `GOAL` only |
| `ratchet` | bool | `GOAL` only |
| `onBreach` | `BLOCK`, `WARN` | default `BLOCK` |
| `stalenessDays` | `0` to `365` | `null` inherits the policy's `defaultStalenessDays` |
| `onStale` | `fail`, `warn`, `pass` | `null` inherits the policy's `onStale` |

## Aggregates

| Aggregate | Observed value |
|---|---|
| `COUNT` | Number of matching items |
| `COUNT_PAST_SLA` | Matching items past their remediation window. The window comes from the organization's linked [triage policy](https://www.vulnetix.com/resolve/triage-policy) (per-severity remediation days plus allowance). `VULN` rules only; with no linked triage policy the rule is indeterminate. |
| `MAX_AGE_DAYS` | Age in days of the oldest matching item |
| `PERCENT` | Matching items as a percentage of the population. An empty population is `0`, never a breach. |

## Operators

The rule breaches when the comparison is true.

| Operator | Breaches when observed is |
|---|---|
| `GT`, `GTE` | greater than, or greater than or equal to, `thresholdLow` |
| `LT`, `LTE` | less than, or less than or equal to, `thresholdLow` |
| `EQ`, `NEQ` | equal to, or not equal to, `thresholdLow` |
| `BETWEEN` | from `thresholdLow` to `thresholdHigh`, inclusive |
| `OUTSIDE` | below `thresholdLow` or above `thresholdHigh` |

An operator the server does not recognise never breaches.

## Goals

A `GOAL` rule states a target and a date, for example "usages of `pkg:npm/moment*` must reach 0 by 1 Dec 2026": `kind GOAL`, `targetPattern pkg:npm/moment*`, `aggregate COUNT`, `operator GT`, `thresholdLow 0`, `deadline` 1 Dec 2026.

- Before the deadline a breach is `warn`, whatever `onBreach` says. A goal that jails you the day it is written is a threshold.
- After the deadline it uses `onBreach`.
- With `ratchet` on, it also breaches when the observed value rose against the same branch's last assessment of the rule, even before the deadline. A branch with no earlier assessment records a baseline and passes. `jail explain` never moves the baseline.

## Examples

| Intent | kind | Selectors | aggregate | operator | threshold |
|---|---|---|---|---|---|
| No critical KEV vulnerabilities | `VULN` | `severityFloor critical`, `flags ["kev"]` | `COUNT` | `GT` | `0` |
| No more than 5 high vulns past SLA | `VULN` | `severityFloor high` | `COUNT_PAST_SLA` | `GT` | `5` |
| No retired runtimes | `EOL` | | `COUNT` | `GT` | `0` |
| No secret older than 7 days | `HYGIENE` | `category SECRETS` | `MAX_AGE_DAYS` | `GT` | `7` |

## Validation errors

| Error | Cause |
|---|---|
| `kind must be one of VULN, EOL, GOAL, HYGIENE` | |
| `label is required` | |
| `aggregate must be one of COUNT, COUNT_PAST_SLA, MAX_AGE_DAYS, PERCENT` | |
| `operator must be one of GT, GTE, LT, LTE, EQ, NEQ, BETWEEN, OUTSIDE` | |
| `BETWEEN and OUTSIDE require thresholdHigh` | |
| `thresholdHigh must not be below thresholdLow` | |
| `COUNT_PAST_SLA applies to VULN rules only` | |
| `severityFloor must be one of low, medium, high, critical` | |
| `onBreach must be BLOCK or WARN` | |
| `onStale must be one of fail, warn, pass` | |
| `stalenessDays must be between 0 and 365` | |
| `a GOAL rule requires a targetPattern` | |
| `ratchet applies to GOAL rules only` | |
| `flags must be a JSON array of strings` | |
