---
title: Quality gates and Jail
nav: Overview
description: The two organization policies that fail a pipeline, the Quality Gate for one scan's findings and Jail for a repository's accumulated state, and how they differ.
order: 1
sources: [cli/cmd/quality_gate_enforce.go, cli/cmd/scan.go, cli/cmd/jail.go, cli/cmd/config.go, saas/prisma/models/quality-gate.prisma, saas/prisma/models/jail.prisma, vdb-site/api/main.go]
checked: [cli@4c8c3b7, saas@50cedf37, vdb-site@1a06d67, config-schemas@9bda9e1]
updated: 02 Nov 2026
---

Vulnetix has two organization policies that decide whether CI goes red. They answer different questions and are configured separately.

| | Quality Gate | Jail |
|---|---|---|
| Question | Should this scan's findings break this build? | Is this repository, across every tool that has reported for it, in breach of policy? |
| Evaluated | In the CLI, against one run's findings | On the server, against the latest result per tool per category |
| Configured as | Nine settings plus four EOL severities, one row per organization | An ordered list of rules, an org default plus optional per-repository overrides |
| Runs in | `vulnetix scan`, `sca`, `sast`, `secrets`, `containers`, `iac` | `vulnetix jail`, or `--jail` on the scan commands |
| Exit codes | `0` pass, `1` a gate breached | `0` clear, `1` jailed, `2` usage error, `3` indeterminate |
| Console | [www.vulnetix.com/resolve/quality-gate](https://www.vulnetix.com/resolve/quality-gate) | [www.vulnetix.com/resolve/jail](https://www.vulnetix.com/resolve/jail) |
| CLI | `vulnetix config set quality-gate`, `config set eol-policy` | `vulnetix jail`, `jail exempt` |

Both belong to the organization (the tenant), so every member of a Teams organization is held to the same policy.

## Quality Gate

The Quality Gate is the org-wide version of the scan's gate flags (`--severity`, `--exploits`, `--block-malware`, `--block-eol`, `--block-unpinned`, `--cooldown`, `--version-lag`, and the SCA autofix limits). A setting the organization has set overrides the flag on every authenticated scan, even a flag passed on the command line. A setting left unset leaves the flag in charge.

- [Settings](/quality-gates/gate/settings/): every field, its values and its flag.
- [EOL policy](/quality-gates/gate/eol-policy/): how end-of-life dates are graded into severities.
- [Enforcement in CI](/quality-gates/gate/enforcement-in-ci/): the override rule, verbose output and pipeline examples.

## Jail

A repository is jailed when it breaches a policy rule over its accumulated state: vulnerabilities past their remediation window, dependencies past end of life, migrations that missed their deadline, hygiene categories that regressed.

- [How Jail works](/quality-gates/jail/how-jail-works/): latest-state evaluation, staleness and verdicts.
- [Rules](/quality-gates/jail/rules/): kinds, selectors, aggregates, operators, goals and ratchets.
- [Exemptions](/quality-gates/jail/exemptions/): time-boxed waivers that never hide the evidence.
- [Jail in CI](/quality-gates/jail/in-ci/): the standalone gate, `--jail`, artefacts and adoption.

The Package Firewall is a third enforcement point, at install time rather than scan time; see [Package Firewall](/package-firewall/).

## Platform IaC

The Quality Gate has a released config kind. [`QualityGate.schema.json` v1.0.1](https://github.com/Vulnetix/config-schemas/releases/download/v1.0.1/QualityGate.schema.json) describes a `kind: QualityGate` document (`apiVersion: vulnetix.com/v1`), and `vulnetix config validate` checks such documents offline in `.vulnetix/config`. Applying a document to the organization is not available yet: today you set the gate imperatively with `vulnetix config set quality-gate` and `vulnetix config set eol-policy`. The field reference is at [QualityGate](/platform-iac/kinds/quality-gate/).

Jail policy has no config kind yet; rules are authored in the console, and config-as-code for them is planned on [Platform IaC](/platform-iac/).
