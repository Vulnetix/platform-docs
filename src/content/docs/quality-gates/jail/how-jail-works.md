---
title: How Jail works
description: How vulnetix jail evaluates a repository against the organization's policy, latest state per category, staleness, enforcement mode and verdicts.
order: 1
sources: [saas/prisma/models/jail.prisma, cli/cmd/jail.go, vdb-site/api/internal/handler/jail_policy.go, vdb-api/internal/handler/jail_eval.go]
checked: [cli@4c8c3b7, vdb-site@1a06d67, saas@50cedf37, vdb-api@4145f0a]
updated: 02 Nov 2026
---

A repository is jailed when it breaches a rule in the organization's Jail policy. `vulnetix jail` asks the server whether this repository is in breach, writes the evidence, and sets the exit code. The policy is evaluated server-side by the VDB API.

## Policy

| Field | Values | Default | Meaning |
|---|---|---|---|
| `repoName` | `null` or `owner/name` | `null` | `null` is the organization default. A per-repository policy replaces the default outright for that repository. |
| `name` | text | required | |
| `enabled` | bool | `true` | |
| `enforcementMode` | `enforce`, `warn` | `enforce` | `warn` downgrades every rule's breach to a warning, server-side. It is the switch that disarms Jail without a CLI release. |
| `defaultStalenessDays` | `0` to `365` | `7` | Staleness window for rules that do not set their own |
| `onStale` | `fail`, `warn`, `pass` | `fail` | What to do when a rule's evidence is stale or missing |

Rules are authored in the Resolve Platform at [www.vulnetix.com/resolve/jail](https://www.vulnetix.com/resolve/jail). See [Rules](/quality-gates/jail/rules/). An organization with no policy reports `no policy` and exits `0`.

## Latest state only

Each rule is evaluated against the newest scan of each tool, within each category. A repository scanned nightly for a year contributes one result per tool, not 365; otherwise every accumulated threshold would breach for good.

"Latest" is resolved per category, not per repository. Categories run in separate CI jobs and drift apart, and anchoring them all to the repository's newest commit would hide any category that did not run on it.

Jail never writes scan state. Its own assessment history (`JailAssessment`) is kept apart from scan snapshots, so running the gate cannot refresh the freshness clock it measures.

## Staleness

A rule whose evidence is older than its staleness window, or missing, cannot be graded. The rule's `onStale` (or the policy's) decides:

| `onStale` | Behaviour |
|---|---|
| `fail` | The rule is `indeterminate`; the run exits `3`. |
| `warn` | The rule is graded on whatever evidence exists, and the verdict says so. |
| `pass` | The rule is `skipped`. |

> [!WHY] Why the default is fail
> A gate that silently passes on missing evidence is worse than no gate. Exit `3` tells whoever owns CI that a scan stage stopped running, which is a different fix from a breach.

Commit drift between categories is reported, never gated. A pull-request build scans the merge commit while the gate runs on the head commit, so treating a mismatch as missing coverage would jail every PR.

## Verdicts

| Verdict | Meaning |
|---|---|
| `clear` | The observed value does not breach the threshold. |
| `breach` | It does, and the rule's `onBreach` is `BLOCK`. |
| `warn` | It does, but the rule is `WARN`, the policy is in `warn` mode, or a goal's deadline has not passed. |
| `exempt` | It does, and an active exemption covers it. The real value is still reported. |
| `indeterminate` | The evidence is stale or missing and `onStale` is `fail`, or the rule cannot be evaluated (for example `COUNT_PAST_SLA` with no linked triage policy). |
| `skipped` | Stale evidence with `onStale: pass`. |

Every enabled rule is evaluated on every run. Rule order decides presentation and which rule supplies the headline reason, never which rules are checked.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Clear: nothing breached |
| `1` | Jailed: at least one rule breached |
| `2` | Usage or configuration error |
| `3` | Indeterminate: the backend state a rule needs is stale or missing |

When one rule breaches and another is indeterminate, the exit code is `1`. A definite violation on data that exists is not made less true by an unknown elsewhere.
