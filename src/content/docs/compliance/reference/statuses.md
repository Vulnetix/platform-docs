---
title: Status vocabulary
description: The five control statuses every compliance report uses, each framework's label for them, and assessor finding values for PCI DSS, ISO/IEC 27001 and OWASP DSOMM.
order: 2
sources: [vdb-cyclonedx/euaiact/euaiact.go, vdb-site/api/internal/handler/compliance_export.go, vdb-site/api/internal/handler/compliance_assessments.go, vdb-site/api/internal/pcidss/pcidss.go, vdb-site/api/internal/iso27001/iso27001.go, vdb-site/api/internal/dsomm/dsomm.go, vdb-site/api/internal/handler/compliance_oscal.go]
checked: [vdb-cyclonedx@eaf787c, vdb-site@1a06d67]
updated: 02 Nov 2026
---

## Control status

Every control in every framework has one of five statuses. The evidence map, the PDF summary counts and the OSCAL `assessment-status` prop all use these tokens.

| Token | Meaning |
|---|---|
| `satisfied` | The evidence meets the control |
| `partial` | Some evidence, with gaps listed |
| `gap` | No evidence, or evidence that the control is not met |
| `informational` | Reported for context, or needs a person's review; not graded |
| `not-applicable` | Does not apply to this organisation or scope |

## Labels per framework

The same token is worded for what the framework measures:

| Framework | `satisfied` | `partial` | `gap` | `informational` | `not-applicable` |
|---|---|---|---|---|---|
| EU AI Act, NIST AI RMF, ISO/IEC 42001, EU CRA | Evidence complete | Partial evidence | No evidence | Review required | Not applicable |
| OWASP Top 10 (categories) | No findings | Findings triaged | Open findings | Not assessed | Not applicable |
| PCI DSS | In Place | In Place \* | Not in Place | Not Tested | Not Applicable |
| ISO/IEC 27001 | Implemented | Partially implemented | Not implemented | Not assessed | Excluded |
| OWASP DSOMM | Implemented | Partially implemented | Not implemented | Not assessed | Not applicable |
| Scan Coverage | Active | Stale or partial | No coverage | Telemetry | Not applicable |
| Exposure | On track | Attention | Off track | Reported, not graded | Not applicable |

OWASP Top 10's program-assurance rows use the first row's wording, because they are controls, not weakness counts. On PCI DSS, `In Place *` is an In Place finding with no reporting details recorded.

## Assessor findings

PCI DSS, ISO/IEC 27001 and DSOMM take an assessor's finding per control through `PUT /reports/{uuid}/assessments/{controlId}`. The finding decides the control's status in every export.

| Framework | `status` values | Default | `method` values |
|---|---|---|---|
| PCI DSS (`pci_dss`) | `in_place`, `not_in_place`, `not_applicable`, `not_tested` | `not_tested` | `standard`, `compensating`, `customized` |
| ISO/IEC 27001 (`iso_27001`) | `implemented`, `partially_implemented`, `not_implemented`, `not_applicable` | `unassessed` | Justification: `legal`, `contractual`, `business`, `risk_assessment`, `best_practice`, `excluded` |
| OWASP DSOMM (`owasp_dsomm`) | `implemented`, `partially_implemented`, `not_implemented`, `not_applicable` | `unassessed` | None; a `method` is rejected |

A PCI DSS method describes how a requirement is met, so it is rejected on a `not_in_place` or `not_applicable` finding.

`procedureDetails` holds the free text:

| Framework | Keys |
|---|---|
| PCI DSS | Testing procedure ids, each mapped to its reporting details |
| ISO/IEC 27001 | `justification`, `implementation` |
| OWASP DSOMM | `implementation`, `evidence` |

## In OSCAL

| Token | OSCAL `state` | OSCAL `reason` |
|---|---|---|
| `satisfied` | `satisfied` | `pass` |
| `gap` | `not-satisfied` | `fail` |
| `partial`, `informational`, `not-applicable` | `not-satisfied` | `other` |

See [OSCAL export](/compliance/exports/oscal/#status-mapping).
