---
title: Crypto Inventory
description: The Resolve Platform page listing the algorithms, certificates and crypto libraries your CBOM scans found, with post-quantum readiness and a standards lens.
order: 3
sources: [website/src/pages/resolve/crypto-inventory.vue, website/src/pages/resolve/crypto-inventory-detail.vue, website/src/shared/crypto-standards.ts, website/src/shared/plan-features.ts, website/src/shared/plan-pages.ts, website/src/shared/console-nav.ts, vdb-site/api/main.go]
checked: [website@7f3b734cd, vdb-site@d2ea72f23]
updated: 05 Nov 2026
---

**Inventory › Crypto Inventory** (`/resolve/crypto-inventory`) lists the cryptographic algorithms, certificates and crypto libraries found across your repositories, each classified for post-quantum posture. Use it to see which repositories still depend on quantum-vulnerable or deprecated cryptography, and to plan the migration.

## How scans arrive

| Way in | What it does |
|---|---|
| [vulnetix cbom](/sbom/cbom/overview/) | Scans a repository and uploads the CBOM automatically when you are signed in |
| **Upload CBOM** | Imports an existing CycloneDX CBOM (`.json`, `.cdx`, `.cdx.json`, `.bom.json`). You can also drop the file on the page. The new scan appears under its repository, with **View scan**. |

## The list

CBOM scans are grouped by repository. Each group shows a post-quantum readiness meter from its latest snapshot, and expands from the latest snapshot to older ones.

Readiness is the share of assessed algorithms that are ready:

- **Ready** is quantum-safe plus hybrid.
- **Not ready** is quantum-vulnerable plus deprecated.
- Algorithms with no known posture are left out of the percentage.

A snapshot row shows the date, branch, the scanning tool and version, the catalogue version, and counts of algorithms, certificates, libraries, and of **quantum-vulnerable**, **deprecated** and **quantum-safe** algorithms. Open a row for the scan detail, or delete it from the row.

## Scan detail

`/resolve/crypto-inventory/<uuid>` shows the repository, branch, commit, tool and serial number, then the totals: **Components**, **Algorithms**, **Certificates**, **Libraries** and **Evidence**. A **Post-quantum readiness** meter breaks the algorithms into **Quantum-safe**, **Hybrid**, **Quantum-vulnerable** and **Deprecated**.

### Compliance lens

The **Compliance lens** switches the view between post-quantum posture and one standards body's guidance. The bodies are always the same list, whatever the scan mentions:

| Body | Jurisdiction |
|---|---|
| NIST | United States |
| CNSA 2.0 | United States, NSA |
| BSI | Germany |
| NCSC | United Kingdom |
| AIVD | Netherlands |
| ACSC | Australia |
| CCCS | Canada |
| NÚKIB | Czechia |
| KpqC | South Korea |

Under a body, algorithms are sorted riskiest first and counted as approved, conditional, or deprecated and disallowed. The [standards matrix](/sbom/cbom/standards-matrix/) lists each body's rulings.

### Components

Each component shows what is known about it: type, primitive, SPDX id, OID, parameter set, classical security in bits, NIST quantum security level, provider and languages, with the evidence that located it. **Copy purl** copies a component's package URL where it has one.

**Ignore this component** opens a [suppression](/vulnerability-management/findings/suppressions/) for it. Ignored components are hidden by default and can be shown again; **Stop ignoring this component** removes the rule. The totals, readiness meter and lens are counted without ignored components. **Delete scan** removes the snapshot with its components and evidence.

## Plan

The page needs a signed-in account and works on every plan.

## Related

- [CBOM overview](/sbom/cbom/overview/) and [algorithms](/sbom/cbom/algorithms/).
- [SBOM Monitoring](/sbom/console/sbom-monitoring/) and [AI Inventory](/sbom/console/ai-inventory/).
