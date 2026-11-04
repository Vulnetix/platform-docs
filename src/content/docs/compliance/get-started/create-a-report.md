---
title: Create and complete a report
nav: Create a report
description: Create a compliance report for a framework, set its period and repository scope, attach evidence and notes, record assessor findings, and archive it, in the Resolve Platform or through the API.
order: 2
sources: [vdb-site/api/internal/handler/compliance_reports.go, vdb-site/api/internal/handler/compliance_evidence.go, vdb-site/api/internal/handler/compliance_assessments.go, vdb-site/api/internal/handler/compliance_evidence_map.go, vdb-site/api/internal/handler/compliance_dsomm.go, website/src/components/compliance/ReportSetup.vue, website/src/components/compliance/ReportCommandBar.vue, website/src/components/compliance/ComplianceReportFrame.vue, website/src/worker.ts]
checked: [vdb-site@1a06d67, website@ad775f37]
updated: 02 Nov 2026
---

## Before you start

A report can only map evidence that exists. Each framework draws on different sources, so run the scans it needs first:

| Evidence | Produced by |
|---|---|
| Findings, scanner runs, SBOMs | [`vulnetix scan`](/cli/), [`vulnetix sca`](/sca/), SAST, secrets, IaC and container scans |
| Triage decisions, VEX | [Vulnerability management](/vulnerability-management/) |
| AI inventory (AI-BOM) | `vulnetix aibom` |
| Crypto inventory (CBOM) | `vulnetix cbom` |
| Quality gate, package firewall, EOL policy | [Quality gates](/quality-gates/), [Package firewall](/package-firewall/) |
| Threat models | The Resolve Platform's threat-model page |

Reports run on the **Pro** plan or higher.

## In the Resolve Platform

1. Open the framework's page, for example **Reports > OWASP Top 10** at [/resolve/owasp-top-10](https://www.vulnetix.com/resolve/owasp-top-10). The full list is in the [overview](/compliance/#frameworks).
2. **Name the report.** The name is used for export file names.
3. **Choose the period**: Last 12 months (the default), Year to date, Previous calendar year, or Custom dates. Every control, finding and file is bounded by it. The end must not be before the start.
4. **Set the scope**: Whole organisation, or Choose repositories (`owner/name`, then Enter). At least one repository is required in the second case.
5. Optionally add **Context for reviewers**, which is printed with the report.
6. Create it. The page shows each control with its status, the evidence behind it, its gaps and links to the records.

From the report's command bar you can switch between reports for the framework, change the period and scope, and **Export** as PDF, OSCAL or an evidence bundle.

When a report's period has ended, a notice says that later scans and repositories are not counted and offers **Extend to today**.

## Evidence, notes and assessor findings

| What | Where | Stored |
|---|---|---|
| Manual evidence | Attach a file to the report, or to one control. Optional title, context text and its own reporting period | In Vulnetix storage, with its SHA-256 |
| Notes | A thread per control, or on the report | Yes; deleting a note archives it |
| Assessor findings | PCI DSS, ISO/IEC 27001 and DSOMM only: a status, a method or justification, and free text per testing procedure | Yes |
| DSOMM targets | A target level from 1 to 5 per dimension or `dimension/sub-dimension`, at most 64 | In the report's `settings` |

Some controls can only be satisfied by a document: Article 5 and Article 6 of the EU AI Act are your organisation's own determinations, as are the CRA Annex II user information items. Attaching evidence to such a control changes its status.

For PCI DSS, ISO/IEC 27001 and DSOMM, Vulnetix pre-fills the assessor's reporting details with the telemetry it holds when the report is created. Changing the scope or the period recomputes the pre-filled text you have not edited. Text you have edited is kept.

## Archiving

Deleting a report, a note or an evidence file archives it rather than removing it. Archived items are hidden in the Resolve Platform and left out of exports unless you tick **Include archived** (the `includeArchived=true` query parameter).

## Through the API

The same routes the Resolve Platform uses are served at `https://www.vulnetix.com/api/site/v1/compliance/...` and accept an [API key](/vdb-api/api/authentication/#api-key) header. All times are Unix epoch milliseconds.

```bash
BASE=https://www.vulnetix.com/api/site/v1/compliance
AUTH="Authorization: ApiKey ${VULNETIX_ORG_ID}:${VULNETIX_API_KEY}"

# Create an OWASP Top 10 report for Q3 2026
id=$(curl -s -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"framework":"owasp_top_10","name":"Q3 2026 OWASP","periodStart":1782864000000,"periodEnd":1790812799000}' \
  "$BASE/reports" | jq -r .uuid)

# Narrow it to two repositories
curl -s -X PUT -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"scope":[{"repoName":"acme/api"},{"repoName":"acme/web"}]}' \
  "$BASE/reports/$id/scope"

# Attach a policy document to the whole report
curl -s -H "$AUTH" -F file=@secure-coding-policy.pdf -F title="Secure coding policy" \
  "$BASE/reports/$id/evidence"

# Read the control mapping
curl -s -H "$AUTH" "$BASE/reports/$id/evidence-map" | jq .
```

Every route and body is in the [API reference](/compliance/reference/api/).

The evidence map takes up to 25 seconds to build for a large organisation. A build that runs out of time returns what it has, with an `INCOMPLETE DATA` notice naming the sources it could not load, and finishes in the background; the next request is complete. A finished map is cached for 5 minutes per report, scope, period and set of uploads.
