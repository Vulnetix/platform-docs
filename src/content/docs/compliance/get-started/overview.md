---
title: Compliance reports overview
nav: Overview
description: Compliance reports map your organisation's scans, findings, inventories and triage records onto the controls of ten frameworks for a reporting period, and export the result as PDF, OSCAL assessment results and an evidence bundle.
order: 1
sources: [vdb-site/api/internal/handler/compliance_reports.go, vdb-site/api/internal/handler/compliance_export.go, vdb-site/api/internal/handler/compliance_oscal.go, vdb-site/api/internal/handler/entitlements.go, vdb-site/api/main.go, website/src/shared/routes.ts, website/src/components/compliance/ComplianceReportFrame.vue]
checked: [vdb-site@1a06d67, website@ad775f37, vdb-cyclonedx@eaf787c]
updated: 02 Nov 2026
---

A compliance report is a named, dated view of one framework over your organisation. You choose the framework, the reporting period and which repositories are in scope. Vulnetix maps the evidence it already holds for that scope and period (scanner runs, findings and their triage, VEX, SBOMs, AI and crypto inventories, KEV and end-of-life exposure, quality-gate and firewall policy, provenance) onto the framework's controls, and marks each control with a status. You add what telemetry cannot show: uploaded documents, notes, and for the assessor-driven frameworks, an assessor's finding per control.

Evidence is computed when you open or export the report, not stored. Your uploads, notes, scope, settings and assessor findings are stored with the report.

## Frameworks

| Framework | `framework` id | Resolve Platform page | What it maps |
|---|---|---|---|
| EU Artificial Intelligence Act | `eu_ai_act` | [/resolve/eu-ai-act](https://www.vulnetix.com/resolve/eu-ai-act) | 21 articles, from Article 4 to Article 73 |
| NIST AI Risk Management Framework 1.0 | `nist_ai_rmf` | [/resolve/nist-ai-rmf](https://www.vulnetix.com/resolve/nist-ai-rmf) | 22 of the 72 core subcategories |
| ISO/IEC 42001:2023 | `iso_42001` | [/resolve/iso-42001](https://www.vulnetix.com/resolve/iso-42001) | 21 of 38 Annex A controls and 6 of 25 clause requirements |
| OWASP Top 10 (2025) | `owasp_top_10` | [/resolve/owasp-top-10](https://www.vulnetix.com/resolve/owasp-top-10) | The 10 categories, by CWE, plus program-assurance controls |
| PCI DSS v4.0.1 | `pci_dss` | [/resolve/pci-dss](https://www.vulnetix.com/resolve/pci-dss) | 250 requirements in 12 families, with assessor findings |
| ISO/IEC 27001:2022 | `iso_27001` | [/resolve/iso-27001](https://www.vulnetix.com/resolve/iso-27001) | Statement of Applicability: 93 Annex A controls and 25 clause requirements |
| OWASP DevSecOps Maturity Model | `owasp_dsomm` | [/resolve/owasp-dsomm](https://www.vulnetix.com/resolve/owasp-dsomm) | 193 activities in 5 dimensions, levels 1 to 5 |
| EU Cyber Resilience Act | `eu_cra` | [/resolve/eu-cra](https://www.vulnetix.com/resolve/eu-cra) | 34 of about 65 obligations (Annex I, Annex II, Articles 13 and 14) |
| Scan Coverage | `coverage` | [/resolve/coverage](https://www.vulnetix.com/resolve/coverage) | 26 scanner and assurance categories |
| Exposure & Remediation Performance | `exposure` | [/resolve/exposure](https://www.vulnetix.com/resolve/exposure) | 15 sections of exposure and remediation metrics |

Details of each are in [AI governance frameworks](/compliance/frameworks/ai-governance/), [Security standards](/compliance/frameworks/security-standards/) and [Coverage and Exposure](/compliance/frameworks/coverage-and-exposure/). SLSA, NIST SSDF and a cryptography policy over your CBOM are measured as [compliance targets](/compliance/get-started/targets/), not reports. Report frameworks that are not supported yet are listed on [Planned frameworks](/compliance/frameworks/planned/).

## Plan

Compliance reports need the **Pro** plan or higher (`compliance-reports` feature). On Community, the console shows an upgrade panel and the API answers `200` with `"planLocked": true, "requiredPlan": "pro"` and an empty `reports` list. No partial data is returned.

## Exports

| Export | Route | For |
|---|---|---|
| PDF | `GET /v1/compliance/reports/{uuid}/export.pdf` | Reviewers |
| OSCAL assessment results, v1.1.2 | `GET /v1/compliance/reports/{uuid}/export.oscal.json` | GRC tools |
| Evidence bundle | `GET /v1/compliance/reports/{uuid}/evidence.zip` | Auditors: every uploaded file plus machine-generated SBOM, VEX, CBOM, AI-BOM and per-framework JSON |

See [Exports](/compliance/exports/pdf-and-evidence-bundle/) and [OSCAL export](/compliance/exports/oscal/).

## Scheduling

A report you create by hand covers the fixed period you give it, and its evidence is recomputed every time it is opened or exported. When a period has ended, the console offers **Extend to today**. To have a report made for you every week, month, quarter or year, create a [compliance target](/compliance/get-started/targets/): each run creates an ordinary report for the period before it. To produce exports on a timetable, call the [export routes](/compliance/reference/api/) from your own scheduler with an API key.

## Platform IaC

Compliance reports themselves have no config-as-code: reports, scope and assessor findings are created in the console or through the [HTTP API](/compliance/reference/api/). What is measured, and how often, is: a [`ComplianceTarget`](/platform-iac/kinds/compliance-target/) document declares a report framework, a SLSA level, NIST SSDF practices or a cryptography policy on a cadence, and [Terraform and OpenTofu](/platform-iac/terraform/) manages it. See [Compliance targets](/compliance/get-started/targets/).
