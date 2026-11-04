---
title: Compliance HTTP API
nav: HTTP API
description: Every compliance report route, with request bodies, query parameters, responses and error codes. The Resolve Platform uses the same routes.
order: 1
sources: [vdb-site/api/main.go, vdb-site/api/internal/handler/compliance_reports.go, vdb-site/api/internal/handler/compliance_evidence.go, vdb-site/api/internal/handler/compliance_evidence_map.go, vdb-site/api/internal/handler/compliance_assessments.go, vdb-site/api/internal/handler/compliance_export.go, vdb-site/api/internal/handler/compliance_oscal.go, vdb-site/api/internal/handler/compliance_dsomm.go, vdb-site/api/internal/handler/auth_middleware.go, website/src/worker.ts]
checked: [vdb-site@1a06d67, website@ad775f37]
updated: 02 Nov 2026
---

## Base URL and authentication

```
https://www.vulnetix.com/api/site/v1/compliance
```

The Resolve Platform's proxy forwards `/api/site/v1/*` to the Vulnetix account API. Send either the Resolve Platform session cookie or an API key header:

```
Authorization: ApiKey <orgId>:<hex>
```

The key is the same one the [VDB API](/vdb-api/api/authentication/#api-key) uses. Reports belong to your organisation; a report id from another organisation answers `404`.

Every route needs the **Pro** plan or higher. Below it, every route answers `200` with `{"planLocked": true, "feature": "compliance-reports", "requiredPlan": "pro", "proOnly": true, "_entitlements": {...}, "reports": []}`. Times are Unix epoch milliseconds.

## Reports

| Method | Path | Body or query | Response |
|---|---|---|---|
| GET | `/reports` | `?framework=<id>` (optional) | `{"reports": [report, ...]}`, newest first, archived included |
| POST | `/reports` | `{"framework"*, "name"*, "periodStart", "periodEnd", "context"}` | `{"uuid": "..."}` |
| GET | `/reports/{uuid}` | `?framework=<id>` (optional; a mismatch is `404`) | `{"report": report, "scope": [...]}` |
| PATCH | `/reports/{uuid}` | Any of `name`, `periodStart`, `periodEnd`, `context`, `archived`, `settings` | `{"ok": true}` |
| DELETE | `/reports/{uuid}` | | `{"archived": true}`. Archives; nothing is deleted |

A `report` object:

```json
{
  "uuid": "6f1c...",
  "framework": "pci_dss",
  "name": "FY26 PCI",
  "periodStart": 1751328000000,
  "periodEnd": 1782863999000,
  "context": "Card-present estate only",
  "archived": false,
  "createdByEmail": "alice@example.com",
  "createdAt": 1793500000000,
  "updatedAt": 1793500000000,
  "scopeCount": 2,
  "settings": { "targets": { "Implementation": 3 } }
}
```

`framework` is one of `eu_ai_act`, `nist_ai_rmf`, `iso_42001`, `owasp_top_10`, `pci_dss`, `coverage`, `exposure`, `eu_cra`, `iso_27001`, `owasp_dsomm`.

On `PATCH`, `settings` replaces the stored settings whole; `{}` clears them. Today `settings` holds only DSOMM `targets`: up to 64 keys, each a dimension name or `dimension/sub-dimension`, each value 1 to 5. Unknown keys and values outside 1 to 5 are dropped. Changing `periodStart` or `periodEnd` recomputes the assessor pre-fill you have not edited.

Creating a PCI DSS, ISO/IEC 27001 or DSOMM report seeds its assessor rows from telemetry for the whole organisation.

## Scope

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/reports/{uuid}/scope` | | `{"scope": [entry, ...]}` |
| PUT | `/reports/{uuid}/scope` | `{"scope": [entry, ...]}`. Replaces the scope; `[]` is organisation-wide | `{"scope": [...]}` |

An entry is `{"repoName": "owner/name"}`, optionally with `githubRepositoryId` (number) or `collectionUuid`. Saving the scope recomputes the assessor pre-fill you have not edited.

## Evidence map

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/reports/{uuid}/evidence-map` | `?framework=<id>` (optional) | The framework's controls with status, rationale, evidence, gaps, and per-control note and evidence counts |

Built in up to 25 seconds; a build that runs out of time returns what loaded with an `INCOMPLETE DATA` notice and completes in the background. Cached for 5 minutes per report, scope, period and set of uploads.

## Notes

| Method | Path | Body or query | Response |
|---|---|---|---|
| GET | `/reports/{uuid}/notes` | `?archived=true` to include archived | `{"notes": [{"uuid", "controlId", "body", "authorEmail", "archived", "createdAt"}]}`, oldest first |
| POST | `/reports/{uuid}/notes` | `{"body"*, "controlId"}`. No `controlId` is a report-level note | `{"uuid": "..."}` |
| DELETE | `/reports/{uuid}/notes/{noteId}` | | `{"archived": true}` |

## Manual evidence

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/reports/{uuid}/evidence` | `?archived=true` to include archived | `{"evidence": [{"uuid", "controlId", "title", "artifactUuid", "fileName", "fileSize", "contentType", "reportingPeriodStart", "reportingPeriodEnd", "contextText", "archived", "uploadedByEmail", ...}]}` |
| POST | `/reports/{uuid}/evidence` | `multipart/form-data`: `file`* (not empty), `title` (default: the file name), `controlId`, `contextText`, `reportingPeriodStart`, `reportingPeriodEnd` | `{"uuid": "...", "artifactUuid": "..."}` |
| DELETE | `/reports/{uuid}/evidence/{evidenceId}` | | `{"archived": true}`. Archives the file |

## Assessor findings

PCI DSS, ISO/IEC 27001 and OWASP DSOMM only. See [Status vocabulary](/compliance/reference/statuses/#assessor-findings) for the values.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/reports/{uuid}/assessments` | | `{"assessments": [...]}` |
| PUT | `/reports/{uuid}/assessments/{controlId}` | Any of `status`, `method`, `procedureDetails` (object of procedure id or field name to text), `scopeConfirmed` (array of repository names) | `{"assessment": {...}}` |

`400` when `status` or `method` is not valid for the framework, when a method is set against `not_in_place` or `not_applicable`, or when `status` is longer than 64 characters.

## Exports

| Method | Path | Query | Response |
|---|---|---|---|
| GET | `/reports/{uuid}/export.pdf` | `includeArchived=true` | PDF attachment |
| GET | `/reports/{uuid}/export.oscal.json` | `includeArchived=true` | [OSCAL 1.1.2 assessment results](/compliance/exports/oscal/) |
| GET | `/reports/{uuid}/evidence.zip` | `includeArchived=true` | [Evidence bundle](/compliance/exports/pdf-and-evidence-bundle/#evidence-bundle) |

## Errors

Errors are `{"error": "<message>"}`.

| Status | `error` | Cause |
|---|---|---|
| 400 | `framework and name are required` | Create without a valid `framework` or a non-blank `name` |
| 400 | `unknown framework` | `?framework=` is not one of the ten ids |
| 400 | `invalid body`, `body is required`, `invalid multipart form`, `file is required`, `empty file` | Malformed request |
| 400 | `invalid status for <framework>`, `invalid method for <framework>`, `invalid controlId` | Assessor write rejected |
| 401 | `not authenticated` | No session and no valid API key |
| 404 | `not found` | No such report, note or file in your organisation |
| 500 | `create failed`, `query failed`, `storage unavailable`, ... | Server error; retry |
