---
title: OSCAL export
description: How a compliance report is written as an OSCAL 1.1.2 assessment-results document, how statuses, evidence, control ids and UUIDs are mapped, and what a GRC tool should read from it.
order: 2
sources: [vdb-site/api/internal/handler/compliance_oscal.go, vdb-site/api/internal/handler/compliance_oscal_test.go, vdb-site/api/internal/handler/threat_model_oscal.go, vdb-site/api/internal/handler/testdata/oscal-complete-1.1.2.schema.json, vdb-site/api/main.go]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

```bash
curl -s -H "Authorization: ApiKey ${VULNETIX_ORG_ID}:${VULNETIX_API_KEY}" \
  -o report-oscal.json \
  "https://www.vulnetix.com/api/site/v1/compliance/reports/$REPORT_ID/export.oscal.json"
```

The export is one OSCAL **assessment-results** document, `oscal-version` `1.1.2`, the same for all ten frameworks. Vulnetix's tests validate it against the official OSCAL 1.1.2 complete JSON schema. `?includeArchived=true` adds archived notes and evidence.

## Document structure

| OSCAL element | Filled with |
|---|---|
| `metadata.title` | Report name and framework name |
| `metadata.last-modified` | Export time |
| `import-ap.href` | `#<uuid>` of a back-matter resource (see below) |
| `back-matter.resources[0]` | The assessment approach: no separate assessment plan is published; the approach is Vulnetix's control mapping for the framework, run over the report's period and scope. Props `type: assessment-approach` and `framework: <framework id>` |
| `results[0].start`, `.end` | The report's period |
| `results[0].reviewed-controls` | Every control in the report, as `include-controls` |
| `results[0].observations` | One per evidence item and per uploaded file |
| `results[0].findings` | One per control |
| `results[0].remarks` | Data-integrity notice, coverage note, repository scope, report-level files and notes |

## Findings

Each control becomes a finding:

| Field | Value |
|---|---|
| `title` | Section title and the control as the standard writes it |
| `description` | The control statement, the rationale, and for assessor-driven frameworks each testing procedure with its reporting details |
| `target.type` | `objective-id` |
| `target.target-id` | The control id as an OSCAL token (below) |
| `target.title` | The status label shown in the Resolve Platform and PDF |
| `target.status` | `state` and `reason`, mapped from the Vulnetix status (below) |
| `props` | `assessment-status`: the Vulnetix status token; `control-label`: the original control label. Both in namespace `https://vulnetix.com/ns/oscal` |
| `remarks` | Each gap, as `Gap: ...`, and each note with its author |
| `related-observations` | The observations behind the control |

### Status mapping

OSCAL's objective status is binary. `reason` carries the distinction, so a not-applicable or informational control never reads as a failure:

| Vulnetix status | `state` | `reason` |
|---|---|---|
| `satisfied` | `satisfied` | `pass` |
| `gap` | `not-satisfied` | `fail` |
| `partial`, `informational`, `not-applicable` | `not-satisfied` | `other` |
| none set | `not-satisfied` | `other`, with `assessment-status` = `unassessed` |

Read the `assessment-status` prop when you need the exact Vulnetix status.

### Control ids

`control-id` and `target-id` must be NCName tokens in OSCAL, which several frameworks' labels are not. The exporter converts each label deterministically: any run of characters other than letters, digits, `.`, `-` and `_` becomes one `-`, and a leading digit is prefixed with `_`.

| Label | Token |
|---|---|
| `Article 11 / Annex IV` | `Article-11-Annex-IV` |
| `GOVERN 1.2` | `GOVERN-1.2` |
| `I.2(a)` | `I.2-a` |
| `1.1.1` | `_1.1.1` |
| `A.5.7` | `A.5.7` |

The original label is kept in the finding's `title` and in the `control-label` prop.

## Observations

| Field | Value |
|---|---|
| `title` | Control label and the evidence component, or the uploaded file's title |
| `description` | The evidence detail, with its record id in brackets when it has one. For uploads: who uploaded it, the file name and the context text |
| `methods` | `TEST` for scan, analysis and runtime evidence; `EXAMINE` for everything else (policy, logs, provenance, findings, reviews, uploaded documents) |
| `collected` | Export time |

## Stable UUIDs

Every UUID is a version 5 UUID over the report id and the control or element it names, in the namespace `https://vulnetix.com/ns/oscal`. Exporting an unchanged report again gives the same UUIDs, so a GRC tool can match findings across exports and a re-export can be diffed against the one an assessor filed.

## Threat models

Threat models export to OSCAL assessment results too, at `GET /v1/threat-model/{id}/export.oscal.json`, with the same UUID scheme. A result is the model assessed against one attack path, an observation is a vector that correlated, and a finding is a threat annotation.
