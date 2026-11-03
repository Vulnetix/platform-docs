---
title: AI governance frameworks
nav: AI governance
description: What the EU AI Act, NIST AI RMF and ISO/IEC 42001 reports map, which articles, subcategories and controls they cover, and what evidence moves each one.
order: 1
sources: [vdb-cyclonedx/euaiact/report.go, vdb-cyclonedx/nistairmf/report.go, vdb-cyclonedx/nistairmf/nistairmf.go, vdb-cyclonedx/iso42001/report.go, vdb-cyclonedx/iso42001/clauses.go, vdb-cyclonedx/iso42001/iso42001.go, vdb-site/api/internal/handler/compliance_export.go, vdb-site/api/internal/handler/compliance_posture.go]
checked: [vdb-cyclonedx@eaf787c, vdb-site@1a06d67]
updated: 02 Nov 2026
---

The three AI frameworks share one evidence base: the AI inventory that `vulnetix aibom` builds (models, providers, AI SDKs, agents, the infrastructure and data they touch), plus the organisation's scans, triage policy, findings, VEX, provenance and uploaded documents. Each control gets one of five statuses: `satisfied`, `partial`, `gap`, `informational` or `not-applicable`. See [Status vocabulary](/compliance/reference/statuses/).

## EU Artificial Intelligence Act (`eu_ai_act`)

Resolve Platform: [/resolve/eu-ai-act](https://www.vulnetix.com/resolve/eu-ai-act). The report maps 21 articles of Regulation (EU) 2024/1689, in article order:

| Article | Subject |
|---|---|
| 4 | AI literacy |
| 5 | Prohibited AI practices |
| 6 | Classification of high-risk AI systems |
| 9 | Risk management system |
| 10 | Data and data governance |
| 11 / Annex IV | Technical documentation |
| 12 | Record-keeping |
| 13 | Instructions for use |
| 14 | Human oversight |
| 15 | Accuracy, robustness and cybersecurity |
| 17 | Quality management system |
| 18 | Documentation keeping |
| 19 | Automatically generated logs |
| 20 | Corrective actions and duty of information |
| 26 | Obligations of deployers of high-risk AI systems |
| 50 | Transparency obligations |
| 51 | General-purpose AI: classification and systemic-risk designation |
| 53 | Obligations for providers of general-purpose AI models |
| 55 | Obligations for providers of GPAI models with systemic risk |
| 72 | Post-market monitoring |
| 73 | Reporting of serious incidents |

> [!WHY] Why Articles 5 and 6 need a document from you
> Whether a system is prohibited or high-risk depends on what it is used for (biometrics, employment, credit and the other Annex III uses), not on which libraries it imports. A component inventory cannot show that. Both articles are reported as your organisation's determination, and they move to `satisfied` when you attach it. Until an Annex III classification is on record, the high-risk articles are reported unconditionally: they state what would be required if the system is high-risk, not a finding that it is.

Article 11 / Annex IV is partly evidenced by the inventory and SBOMs (Annex IV section 2: components, compute and data). The intended purpose, the monitoring and control description and the validation results are sections the provider writes; attach them to the control.

The console page draws the Act's risk pyramid from the classifications on record.

## NIST AI Risk Management Framework (`nist_ai_rmf`)

Resolve Platform: [/resolve/nist-ai-rmf](https://www.vulnetix.com/resolve/nist-ai-rmf). The report maps 22 of the 72 subcategories in the AI RMF 1.0 core, the ones an AI inventory, scan telemetry and triage records can evidence:

| Function | Subcategories mapped |
|---|---|
| GOVERN | 1.2, 1.6, 3.1, 4.1, 6.1, 6.2 |
| MAP | 1.1, 2.1, 2.2, 3.1, 4.1, 5.1 |
| MEASURE | 1.1, 2.1, 2.7, 3.1 |
| MANAGE | 1.1, 2.1, 2.2, 3.1, 4.1, 4.3 |

Every export says so: the other 50 subcategories are out of scope and are neither assessed nor implied to be met. GOVERN 3.1, for example, cites your triage policy's remediation windows per severity and its triage threshold.

## ISO/IEC 42001:2023 (`iso_42001`)

Resolve Platform: [/resolve/iso-42001](https://www.vulnetix.com/resolve/iso-42001). The report has two parts.

**Annex A**: 21 of the 38 controls.

| Category | Controls mapped |
|---|---|
| A.2 Policies related to AI | A.2.2 |
| A.3 Internal organization | A.3.2, A.3.3 |
| A.4 Resources for AI systems | A.4.2, A.4.4, A.4.5 |
| A.5 Assessing impacts of AI systems | A.5.2, A.5.4 |
| A.6 AI system life cycle | A.6.2.3, A.6.2.4, A.6.2.5, A.6.2.6, A.6.2.7, A.6.2.8 |
| A.7 Data for AI systems | A.7.2, A.7.5 |
| A.8 Information for interested parties | A.8.3 |
| A.9 Responsible use of AI systems | A.9.2 |
| A.10 Third-party relationships | A.10.2, A.10.3 |

**Management-system clauses 4 to 10**: 6 of the 25 requirements, as category `C`: C.4.1 (context and scope), C.6.1.2, C.6.1.3, C.8.1, C.9.1 and C.10.1. Telemetry evidences part of each and never satisfies one on its own. Scope, objectives, competence, internal audit and management review need uploaded evidence.

The coverage note counts the two parts separately, so added clause coverage is never read as added Annex A coverage.

## Evidence that moves AI controls

| Evidence | Moves |
|---|---|
| An AI inventory scan in the period | Inventory, provenance and documentation controls in all three frameworks |
| A triage policy with remediation windows | Risk-management controls (EU AI Act Article 9, NIST GOVERN 3.1, MANAGE) |
| Scans and findings on AI components | Accuracy, robustness and cybersecurity (Article 15, MEASURE 2.7) |
| Uploaded documents on a control | Any control whose evidence is organisational: Articles 4, 5, 6, 13, 17; ISO clause requirements |
