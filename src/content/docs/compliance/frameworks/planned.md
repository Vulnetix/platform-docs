---
title: Planned frameworks and targets
nav: Planned
description: Compliance work planned but not yet shipped, such as full SLSA, NIST SSDF, post-quantum readiness and EU AI Act classification, and what to use meanwhile.
order: 4
sources: [vdb-site/api/internal/handler/compliance_reports.go, vdb-site/api/internal/handler/compliance_posture.go, vdb-site/api/internal/coverage/coverage.go]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

The ten frameworks in the [overview](/compliance/#frameworks) are the complete list the API accepts today. Creating a report with any other `framework` value returns `400 {"error":"framework and name are required"}`, and filtering by one returns `400 {"error":"unknown framework"}`.

## Planned

| Item | Status | What exists meanwhile |
|---|---|---|
| SLSA report with controls and an OSCAL export | Planned (a [SLSA level target](/compliance/get-started/targets/) is available) | SLSA provenance and attestation counts are loaded as report evidence, for example in the Coverage report's `provenance` row, and are in the evidence bundle's `control-posture.json`. Software Factory shows the SLSA level each repository reaches on [Trust and SLSA](/software-factory/evidence/trust-and-slsa/) |
| NIST SSDF (SP 800-218) report with controls and an OSCAL export | Planned (an [SSDF target](/compliance/get-started/targets/) is available) | The OWASP DSOMM and ISO/IEC 27001 reports cover much of the same secure-development ground |
| Crypto and post-quantum readiness report | Planned (an [allowed-algorithm policy over your CBOM](/compliance/get-started/targets/#cryptography-policy) is available as a target) | CBOM scans (`vulnetix cbom`) feed the CRA cryptography control and the Coverage `cbom` row; CBOM documents are in the evidence bundle |
| EU AI Act targets (a declared risk class and obligations per AI system) | Planned | The [EU AI Act report](/compliance/frameworks/ai-governance/#eu-artificial-intelligence-act-eu_ai_act) maps 21 articles today; classifications are attached as evidence on Articles 5 and 6 |

The report-shaped items in this table are not available yet; the targets they would use are. These pages will be updated when each one ships.
