---
title: Planned frameworks and targets
nav: Planned
description: Compliance work that is planned but not in the product today, SLSA, NIST SSDF and crypto or post-quantum readiness reports, compliance targets with a cadence, and declaring them as code, and what you can use meanwhile.
order: 4
sources: [vdb-site/api/internal/handler/compliance_reports.go, vdb-site/api/internal/handler/compliance_posture.go, vdb-site/api/internal/coverage/coverage.go]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

The ten frameworks in the [overview](/compliance/#frameworks) are the complete list the API accepts today. Creating a report with any other `framework` value returns `400 {"error":"framework and name are required"}`, and filtering by one returns `400 {"error":"unknown framework"}`.

## Planned

| Item | Status | What exists meanwhile |
|---|---|---|
| SLSA report and SLSA level targets | Planned | SLSA provenance and attestation counts are loaded as report evidence, for example in the Coverage report's `provenance` row, and are in the evidence bundle's `control-posture.json`. Software Factory shows the SLSA level each repository reaches on [Trust and SLSA](/software-factory/evidence/trust-and-slsa/) |
| NIST SSDF (SP 800-218) report | Planned | The OWASP DSOMM and ISO/IEC 27001 reports cover much of the same secure-development ground |
| Crypto and post-quantum readiness: an allowed-algorithm policy over your CBOM | Planned | CBOM scans (`vulnetix cbom`) feed the CRA cryptography control and the Coverage `cbom` row; CBOM documents are in the evidence bundle |
| EU AI Act targets (a declared risk class and obligations per AI system) | Planned | The [EU AI Act report](/compliance/frameworks/ai-governance/#eu-artificial-intelligence-act-eu_ai_act) maps 21 articles today; classifications are attached as evidence on Articles 5 and 6 |
| Compliance targets with a cadence (a framework, a scope and a recurring period, regenerated on a schedule) | Planned | Create a report per period, and call the [export routes](/compliance/reference/api/) from your own scheduler |
| Compliance targets as config-as-code (`vulnetix.com/v1` documents) | Planned | See [Platform IaC](/platform-iac/) |

Nothing in this table is available yet. These pages will be updated when each one ships.
