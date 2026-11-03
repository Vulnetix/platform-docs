---
title: Security standards
description: What the OWASP Top 10, PCI DSS, ISO/IEC 27001, OWASP DSOMM and EU Cyber Resilience Act reports map, which of them take assessor findings, and what each export says it does not cover.
order: 2
sources: [vdb-site/api/internal/owasp/categories.go, vdb-site/api/internal/owasp/owasp.go, vdb-site/api/internal/pcidss/catalog.json, vdb-site/api/internal/pcidss/pcidss.go, vdb-site/api/internal/iso27001/catalog.go, vdb-site/api/internal/iso27001/iso27001.go, vdb-site/api/internal/dsomm/catalog.json, vdb-site/api/internal/dsomm/dsomm.go, vdb-site/api/internal/cra/cra.go, vdb-site/api/internal/handler/compliance_export.go, vdb-site/api/internal/handler/compliance_assessments.go, vdb-site/api/internal/handler/compliance_dsomm.go]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

Two kinds of report are on this page.

- **Computed**: OWASP Top 10 and EU CRA. Every status comes from evidence and uploads; there is no assessor form.
- **Assessor-driven**: PCI DSS, ISO/IEC 27001 and OWASP DSOMM. Vulnetix pre-fills each control with the telemetry it holds and suggests a status. An assessor records the finding, the method or justification, and the reporting details. The assessor's finding is what the export reports.

## OWASP Top 10:2025 (`owasp_top_10`)

Resolve Platform: [/resolve/owasp-top-10](https://www.vulnetix.com/resolve/owasp-top-10).

Findings in the period are placed in categories by their CWEs.

| Code | Category |
|---|---|
| A01 | Broken Access Control |
| A02 | Security Misconfiguration |
| A03 | Software Supply Chain Failures |
| A04 | Cryptographic Failures |
| A05 | Injection |
| A06 | Insecure Design |
| A07 | Authentication Failures |
| A08 | Software or Data Integrity Failures |
| A09 | Security Logging & Alerting Failures |
| A10 | Mishandling of Exceptional Conditions |

A category reads **No findings**, **Findings triaged** (every finding has a triage decision) or **Open findings**. Findings whose CWEs fall outside the taxonomy, or that carry no CWE, are listed in an `UNMAPPED` row.

A **Program assurance** section qualifies the category verdicts: Analysis breadth, Result review, Reachability qualification, Build-time enforcement and Remediation prioritization. These are ordinary controls (met or not) and are not counted in the category summary.

> [!CAREFUL] A clean category is not a clean codebase
> The Top 10:2025 has no memory-safety category, so CWE-787, CWE-125, CWE-416 and CWE-119 sit outside every category. A report can read clean while those findings are open. The export states this in its coverage note. If no scanner ran in the period, the Analysis breadth row says every clean verdict is unsupported.

## PCI DSS v4.0.1 (`pci_dss`)

Resolve Platform: [/resolve/pci-dss](https://www.vulnetix.com/resolve/pci-dss). The catalogue holds all 12 requirement families and 250 requirements, each with its testing procedures.

| Family | Requirements |
|---|---|
| 1 Install and maintain network security controls | 19 |
| 2 Apply secure configurations | 11 |
| 3 Protect stored account data | 29 |
| 4 Protect cardholder data with strong cryptography in transit | 6 |
| 5 Protect systems from malicious software | 13 |
| 6 Develop and maintain secure systems and software | 19 |
| 7 Restrict access by business need to know | 12 |
| 8 Identify users and authenticate access | 29 |
| 9 Restrict physical access to cardholder data | 27 |
| 10 Log and monitor all access | 27 |
| 11 Test security of systems and networks regularly | 21 |
| 12 Support information security with policies and programs | 37 |

Per requirement, the assessor records:

| Field | Values |
|---|---|
| `status` | `in_place`, `not_in_place`, `not_applicable`, `not_tested` (the default) |
| `method` | `standard`, `compensating`, `customized`. Not allowed with `not_in_place` or `not_applicable` |
| `procedureDetails` | Reporting details per testing procedure id |
| `scopeConfirmed` | The repositories the assessor confirmed in scope |

Vulnetix telemetry for a family (scanning for Requirement 11, secure development for Requirement 6, and so on) is shown as a separate "Requirement N telemetry" entry, not attached to any single requirement. An **In Place** finding is shown as **In Place \*** when none of its testing procedures has reporting details.

> [!CAREFUL] This is assessment evidence, not a Report on Compliance
> The PCI DSS export carries the requirements, testing procedures and the assessor's findings. It does not carry ROC Part I or Part II, the executive summary, the scope and segmentation statement, the sampling rationale, ASV scan results, or Appendices A1, A2 and A3. Read the appendices' absence as not assessed, not as not applicable. Do not hand the export to an acquirer as a ROC.

## ISO/IEC 27001:2022 Statement of Applicability (`iso_27001`)

Resolve Platform: [/resolve/iso-27001](https://www.vulnetix.com/resolve/iso-27001). The report is a Statement of Applicability over all 93 Annex A controls and the 25 clause requirements of clauses 4 to 10.

| Theme | Controls |
|---|---|
| A.5 Organizational | 37 |
| A.6 People | 8 |
| A.7 Physical | 14 |
| A.8 Technological | 34 |
| C Clauses 4 to 10 | 25 |

Per control, the assessor records:

| Field | Values |
|---|---|
| `status` | `implemented`, `partially_implemented`, `not_implemented`, `not_applicable`. Unset is `unassessed` |
| `method` (the justification for inclusion or exclusion) | `legal`, `contractual`, `business`, `risk_assessment`, `best_practice`, `excluded` |
| `procedureDetails` | `justification` and `implementation` text |

The export opens with a completion table per theme: Implemented, Partial, Not implemented, Excluded, Not assessed and Documented.

## OWASP DevSecOps Maturity Model (`owasp_dsomm`)

Resolve Platform: [/resolve/owasp-dsomm](https://www.vulnetix.com/resolve/owasp-dsomm). The catalogue is DSOMM `activities-2026-07` from [dsomm.owasp.org](https://dsomm.owasp.org/): 193 activities at levels 1 to 5.

| Dimension | Sub-dimensions | Activities |
|---|---|---|
| Build and Deployment | Build, Deployment, Patch Management | 27 |
| Culture and Organization | Design, Education and Guidance, Process | 28 |
| Implementation | Application Hardening, Development and Source Control, Infrastructure Hardening | 41 |
| Information Gathering | Logging, Monitoring, Test KPI | 30 |
| Test and Verification | Application tests, Consolidation, Dynamic depth for applications, Dynamic depth for infrastructure, Static depth for applications, Static depth for infrastructure, Test Intensity | 67 |

Per activity the assessor records `status` (`implemented`, `partially_implemented`, `not_implemented`, `not_applicable`; unset is `unassessed`) and `implementation` and `evidence` text. DSOMM has no method field.

Set target levels in the report's settings: a level from 1 to 5 keyed by dimension (`"Implementation"`) or `dimension/sub-dimension` (`"Implementation/Infrastructure Hardening"`), at most 64 keys. The export's maturity matrix shows target, score, level-by-level progress and gaps.

```bash
curl -s -X PATCH -H "Authorization: ApiKey ${VULNETIX_ORG_ID}:${VULNETIX_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{"settings":{"targets":{"Implementation":3,"Test and Verification/Static depth for applications":4}}}' \
  "https://www.vulnetix.com/api/site/v1/compliance/reports/$REPORT_ID"
```

## EU Cyber Resilience Act readiness (`eu_cra`)

Resolve Platform: [/resolve/eu-cra](https://www.vulnetix.com/resolve/eu-cra). The report assesses 34 obligations of Regulation (EU) 2024/2847, out of about 65 identifiable in the regulation.

| Section | Ids | Count |
|---|---|---|
| Annex I Part I: essential cybersecurity requirements | `I.1`, and `I.2(a)` to `I.2(l)` except `I.2(f)` | 13 |
| Annex I Part II: vulnerability handling | `II.1` to `II.8` | 8 |
| Annex II: information and instructions to the user | `AII.1` to `AII.9` | 9 |
| Articles 13 and 14: support, EOL and reporting readiness | `13.8`, `14.1`, `14.2`, `14.3` | 4 |

Evidence includes SBOMs per product, KEV and known-exploitable exposure, fix times, how many weeks of the period had a scan, EOL exposure, CBOM crypto posture and threat models. Several obligations (`II.5` coordinated disclosure policy, `II.6` contact channels, most of Annex II) are documents you upload.

> [!CAREFUL] No statutory clock is evaluated
> The report checks readiness for Article 14 reporting. It does not test the 24-hour, 72-hour, 14-day or one-month deadlines against real timestamps, and it does not cover Annex VII or most of Articles 13 and 14. Obligations absent from the report are neither assessed nor implied to be met.
