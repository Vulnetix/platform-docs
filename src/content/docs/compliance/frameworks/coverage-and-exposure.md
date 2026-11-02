---
title: Coverage and Exposure reports
nav: Coverage and Exposure
description: The two Vulnetix operational reports, Scan Coverage (which scanners and controls ran across which repositories) and Exposure & Remediation Performance (how the vulnerability program performed), and how each row is graded.
order: 3
sources: [vdb-site/api/internal/coverage/coverage.go, vdb-site/api/internal/coverage/classify.go, vdb-site/api/internal/exposure/exposure.go, vdb-site/api/internal/handler/compliance_coverage.go, vdb-site/api/internal/handler/compliance_exposure.go, vdb-site/api/internal/handler/compliance_export.go]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

These two reports are not external standards. They answer the questions an auditor asks before any standard: was everything scanned, and did the findings get fixed. Both are computed from telemetry, with no assessor form, and export the same way as every other framework.

## Scan Coverage (`coverage`)

Console: [/resolve/coverage](https://www.vulnetix.com/resolve/coverage). One row per category, in this order:

| Category id | Row |
|---|---|
| `sca` | Software Composition (SCA) |
| `sast` | Static Analysis (SAST) |
| `secrets` | Secrets |
| `iac` | IaC & Cloud Posture |
| `containers` | Containers |
| `license` | License |
| `sbom` | SBOM |
| `aibom` | AI-BOM |
| `cbom` | Cryptography (CBOM) |
| `intel` | Business Intelligence |
| `malware` | Malware |
| `eol` | End-of-Life |
| `firewall` | Package Firewall |
| `reachability` | Reachability Analysis |
| `binaries` | Binary & Artifact Integrity |
| `review` | Pre-release Review |
| `provenance` | Supply-chain Provenance |
| `tests` | Test Configuration |
| `gate` | Build-time Quality Gate |
| `decisions` | Prioritization Decision Records |
| `audit-log` | Audit Trail |
| `dast` | Dynamic Analysis (DAST) |
| `quality` | Code Quality |
| `performance` | Performance |
| `compliance` | Compliance Scanning |
| `other` | Other Assurance |
| `unclassified` | Unclassified runs: runs no signal could place, listed so every run in the period is accounted for |

Scanner categories are graded on the runs in the period:

| Status | Shown as | When |
|---|---|---|
| `satisfied` | Active | At least one run, the latest within 30 days of the period end, covering every repository in scope |
| `partial` | Stale or partial | Runs exist, but the latest is more than 30 days before the period end, or some repositories in scope have none |
| `gap` | No coverage | No run in the period |
| `informational` | Telemetry | Reported, not graded |

The assurance rows (firewall, gate, review, provenance, audit trail and similar) say whether the control operates, not how much scanning it received. Each row lists the tools that produced its runs, including third-party scanners whose SARIF you uploaded. The PDF and the evidence bundle (`machine-evidence/coverage.json`) carry the full matrix.

## Exposure & Remediation Performance (`exposure`)

Console: [/resolve/exposure](https://www.vulnetix.com/resolve/exposure). A view of the vulnerability program across its lifecycle, in 15 sections, in this order:

| Id | Section |
|---|---|
| `scope` | Assessment Scope |
| `funnel` | Exposure Funnel |
| `mobilization` | Mobilization |
| `fix-verification` | Fix Verification |
| `mttr-sla` | Remediation vs SLA |
| `ssvc` | SSVC Disposition |
| `aging` | Finding Aging |
| `kev` | Known-Exploited Exposure |
| `velocity` | Triage Velocity |
| `attack` | MITRE ATT&CK Exposure |
| `supply-chain` | Supply-Chain Health |
| `strategy` | Risk Prioritization Governance |
| `disposition` | Result Disposition Trail |
| `reachability` | Reachability Analysis |
| `incident` | Incident Response |

A section reads **On track**, **Attention**, **Off track** or **Reported, not graded**. Remediation speed is measured against the windows in your triage policy, so set one before you rely on `mttr-sla`. The export carries a metrics table with every number the sections are graded on, and `machine-evidence/exposure-metrics.json` in the evidence bundle.

Findings closed by a triage disposition are excluded from the open risk surface; the console shows how many in a strip above the report.
