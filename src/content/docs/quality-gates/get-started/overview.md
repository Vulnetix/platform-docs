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
| Resolve Platform | [www.vulnetix.com/resolve/quality-gate](https://www.vulnetix.com/resolve/quality-gate) | [www.vulnetix.com/resolve/jail](https://www.vulnetix.com/resolve/jail) |
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

## GitHub Actions

Run the Jail gate in a workflow with the [jail GitHub Action](/quality-gates/github-actions/jail/).

## Platform IaC

The organization's quality gate is the [`QualityGate`](/platform-iac/kinds/quality-gate/) kind, with every field mapped to its scan flag on that page. `vulnetix config apply` sets it, or `vulnetix config set quality-gate` and `config set eol-policy`. Jail policy is [`JailPolicy`](/platform-iac/kinds/jail-policy/) (the ordered rules, for the tenant default or one repository) and [`JailExemption`](/platform-iac/kinds/jail-exemption/) (a time-boxed waiver). A jail rule can take a `when`; see [where it is evaluated](/platform-iac/reference/cel/#jailpolicy). The licence files are [`LicensePolicy`](/platform-iac/kinds/license-policy/) and [`LicenseExceptions`](/platform-iac/kinds/license-exceptions/). See the [kind catalogue](/platform-iac/kinds/catalogue/).

When [Drift protection](/platform-iac/guides/drift-protection/) is on, a change made in the console or through a legacy API to the quality gate, jail policy or jail exemptions that is managed as code (by Terraform or a repository) is refused with HTTP 409 `managed_by_platform_iac`. Change it where it is declared, or ask an owner to turn Drift protection off.
