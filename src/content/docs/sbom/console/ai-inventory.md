---
title: AI Inventory
description: The console page that lists the AI coding agents, SDKs and models found by your AI-BOM scans, what the AI Firewall observed, and compliance evidence.
order: 2
sources: [website/src/pages/resolve/ai-inventory.vue, website/src/pages/resolve/ai-inventory-detail.vue, website/src/components/ai/AiPostureHeader.vue, website/src/components/ai/ObservedCapabilities.vue, website/src/components/ai/ComplianceSnapshots.vue, website/src/shared/plan-features.ts, website/src/shared/console-nav.ts, vdb-site/api/main.go]
checked: [website@7f3b734cd, vdb-site@d2ea72f23]
updated: 05 Nov 2026
---

**Inventory › AI Inventory** (`/resolve/ai-inventory`) answers "what AI do we have?": the AI coding agents, AI SDKs and models declared across your repositories, and the tools and MCP servers your agents were seen carrying at runtime. Use it to find AI usage nobody declared, and as evidence for an AI framework.

## How scans arrive

| Way in | What it does |
|---|---|
| [vulnetix aibom](/sbom/aibom/overview/) | Scans a repository and uploads the AI-BOM automatically when you are signed in |
| **Upload AIBOM** | Imports an existing CycloneDX AI-BOM (`.json`, `.cdx`, `.cdx.json`, `.bom.json`). You can also drop the file on the page. The page then names the repository it landed under and the tool, SDK and model counts, with **View scan**. |

## The posture header

Four numbers above the tabs: repositories, tools, MCP servers and models. Below them, an indicator counts capabilities the AI Firewall observed that have no match in any AI-BOM scan. It is a heuristic and is labelled as one: runtime names and AI-BOM component names do not share a namespace. It is hidden until there is a scan to compare against. Pressing it opens **Observed** filtered to those rows.

## Tabs

### Declared

AI-BOM scans grouped by repository. Each group shows its latest snapshot, and expands to older ones. A snapshot row shows the date, branch, the scanning tool and version, the catalogue version, and the number of tools, SDKs and models. Delete a snapshot from its row.

### Observed

What the [AI Firewall](/ai-firewall/) has seen agents carry: tools, MCP servers and skills, with the client that offered them. It records that a capability exists, never that anyone used it, and no prompts, arguments or results are read. This tab only describes the estate. Rules are set on the AI Firewall page.

### Compliance

Compliance posture against the EU AI Act, NIST AI RMF and ISO 42001, loaded the first time the tab opens.

## Scan detail

Opening a snapshot (`/resolve/ai-inventory/<uuid>`) shows the repository, branch, commit, tool, catalogue version, CycloneDX version and serial number. Components are grouped into:

| Group | Holds |
|---|---|
| **AI Coding Agents** | Assistants configured to read, write or review code in the repository |
| **AI Provider Services** | Hosted model providers and AI platforms wired into the project |
| **AI SDKs & Frameworks** | Libraries the source code uses to call models |
| **Models** | Model identifiers extracted from source and configuration |
| **AI Infrastructure** | Serving runtimes, training frameworks, vector databases, accelerators and agent platforms declared in IaC |
| **Data & Model Artifacts** | Datasets and model weights mounted or referenced by AI workloads |
| **Conventions** | Shared instruction and ignore conventions in the repository |

Each component lists its provider, version, number of uses and the evidence behind it. A model not in the known-model catalogue is marked. Filter by AI Firewall governance: **All**, **Allowed**, **Denied** or **Ungoverned**. **Ignore this component** opens a [suppression](/vulnerability-management/findings/suppressions/) for it, and **Delete scan** removes the snapshot with its components and evidence.

The detail page also maps the scan to EU AI Act articles, NIST AI RMF functions and ISO 42001 Annex A controls, each marked complete, partial, gap, review or n/a. This mapping is evidence input and does not certify compliance.

## Plan

Listing and reading AI-BOM scans works on every plan once signed in. The **Compliance** tab and the framework mapping on a scan need **Pro** or above.

## Related

- [AI-BOM overview](/sbom/aibom/overview/) and [supported tools](/sbom/aibom/supported-tools/).
- [SBOM Monitoring](/sbom/console/sbom-monitoring/) and [Crypto Inventory](/sbom/console/crypto-inventory/).
