---
title: PDF and evidence bundle
description: What the PDF export of a compliance report contains, and the folder layout of the evidence bundle zip, including the machine-generated SBOM, VEX, CBOM, AI-BOM and per-framework JSON it adds to your uploads.
order: 1
sources: [vdb-site/api/internal/handler/compliance_export.go, vdb-site/api/internal/handler/compliance_machine_evidence.go, vdb-site/api/internal/handler/malware_stix.go, website/src/components/compliance/ReportCommandBar.vue, website/src/components/compliance/ComplianceReportFrame.vue]
checked: [vdb-site@1a06d67, website@ad775f37]
updated: 02 Nov 2026
---

Every report exports three ways, from **Export** on the report's command bar or from the API. All three build the report fresh from the evidence, the same way the Resolve Platform page does, so an export always matches the page at the time you made it.

| Export | Route | Content type | File name |
|---|---|---|---|
| PDF | `GET /v1/compliance/reports/{uuid}/export.pdf` | `application/pdf` | `<report name>.pdf` |
| OSCAL | `GET /v1/compliance/reports/{uuid}/export.oscal.json` | `application/json` | `<report name>-oscal.json`. See [OSCAL export](/compliance/exports/oscal/) |
| Evidence bundle | `GET /v1/compliance/reports/{uuid}/evidence.zip` | `application/zip` | `evidence.zip` |

Add `?includeArchived=true` to include archived notes and evidence files. The Resolve Platform's **Include archived** box sets it.

## PDF

The PDF is the report for a human reviewer:

- the framework name, report name, period, scope (or "organisation-wide") and your context text;
- summary counts of controls by status;
- a coverage note for frameworks Vulnetix maps in part (NIST AI RMF, ISO/IEC 42001, OWASP Top 10, PCI DSS, EU CRA), saying how much of the standard the report covers;
- a data-integrity notice if any evidence source failed to load, and a truncation notice if a query cap cut a population short. Treat a report with either notice as unsupported, not as clean;
- every section and control with its status label, statement, rationale, evidence, gaps, notes and attached files;
- for PCI DSS, ISO/IEC 27001 and DSOMM, the testing procedures and the assessor's reporting details under each control, and the summary table (SoA completion, DSOMM maturity matrix);
- for Coverage and Exposure, the full category matrix or metrics table.

## Evidence bundle

The zip streams as it is built. Its layout:

| Path | Contents |
|---|---|
| `MANIFEST.txt` | Report id, generation time, and one line per file with its uploader and `sha256:`. A file that could not be read is listed as `MISSING`, `FAILED` or `TRUNCATED` instead of failing the download, and a file whose hash differs from the one recorded at upload is marked `MISMATCH` |
| `_report/<file>` | Evidence uploaded to the report as a whole |
| `<control id>/<file>` | Evidence uploaded to one control. A repeated name gets a numeric prefix |
| `machine-evidence/control-posture.json` | The organisation posture the controls are graded on: scanner runs, provenance and attestation counts, policy settings |
| `machine-evidence/sbom/<name>-<time>.cdx.json` or `.spdx.json` | SBOM documents for the scope, at most 100 |
| `machine-evidence/sbom-inventory.json` | An index of the SBOMs |
| `machine-evidence/cbom/<name>-<id>.cdx.json` | CBOM documents |
| `machine-evidence/aibom/<name>-<id>.cdx.json` | AI-BOM documents |
| `machine-evidence/vex/<format>-<id>-v<n>.json` | VEX documents ingested or minted for the organisation |
| `machine-evidence/vex/triage-derived.openvex.json` | An OpenVEX document derived from your triage decisions in scope |
| `machine-evidence/cvelistv5/<CVE>.json` | The CVE record for every CVE the report references |
| `machine-evidence/assessments.json` | Assessor findings (PCI DSS, ISO/IEC 27001, DSOMM) |
| `machine-evidence/<framework>.json` | The framework mapping as data: `pcidss-requirements.json`, `iso27001-soa.json`, `dsomm-maturity.json`, `coverage.json`, `exposure-metrics.json`, `cra-readiness.json`, `eu-ai-act-articles.json`, `nist-ai-rmf-functions.json`, `iso42001-annex-a.json`, `owasp-top10-categories.json` |
| `malware/malware-iocs.stix.json` | A STIX 2.1 bundle of the malware indicators found in your organisation |

```bash
curl -s -H "Authorization: ApiKey ${VULNETIX_ORG_ID}:${VULNETIX_API_KEY}" \
  -o evidence.zip \
  "https://www.vulnetix.com/api/site/v1/compliance/reports/$REPORT_ID/evidence.zip"
unzip -l evidence.zip
```

Each upload's SHA-256 is recorded when it is uploaded. The manifest prints the hash of the bytes actually written to the zip, so an auditor can check every file against it.
