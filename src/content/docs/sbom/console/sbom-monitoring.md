---
title: SBOM Monitoring
description: The Resolve Platform page that lists your uploaded CycloneDX SBOMs and monitored scans, their components and vulnerabilities, and the alerts set on them.
order: 1
sources: [website/src/pages/resolve/uploads.vue, website/src/components/scanner-results/workbench/ScanHeader.vue, website/src/composables/useScannerResults.ts, website/src/shared/plan-features.ts, website/src/shared/console-nav.ts, vdb-site/api/main.go, vdb-site/api/internal/handler/uploads.go, cli/cmd/upload.go, cli/cmd/upload_publish.go]
checked: [website@7f3b734cd, vdb-site@d2ea72f23, cli@v4.17.1]
updated: 05 Nov 2026
---

**Inventory › SBOM Monitoring** (`/resolve/uploads`) lists the SBOMs your organisation keeps under watch, grouped by repository, with the components and vulnerability advisories each one carries. Use it to see which delivered or third-party bill of materials is affected by a vulnerability, and to set an alert on it.

## How documents arrive

| Way in | What appears |
|---|---|
| Upload in the Resolve Platform | Drag a CycloneDX BOM anywhere on the page. CycloneDX 1.2 to 1.7 is supported. The file is validated against the CycloneDX schema first, and a file that fails is not uploaded: the page lists up to ten failures with the path and message of each. |
| **Monitor SBOM** on a scan | On a supply-chain scan in **Scanner Results**, **Monitor SBOM** adds that scan here as a **Monitored** row. It references the original scan and is not processed again, so its counts match the scan report. The scan page then links **View in SBOM monitoring**. |

Reports from other tools are published with [vulnetix upload](/cli/commands/upload/), which records them as scans in Scanner Results. Monitor one from there to bring it onto this page.

An upload is processed in stages, shown as a progress bar on its row: downloading, parsing, indexing components, matching vulnerabilities, finalising and notifying.

## The list

Rows are grouped by repository. Each group shows how many uploads and monitored scans it holds, and collapses.

| Column | Shows |
|---|---|
| **Name** | The filename, or for a monitored row the app, repository or tool name and version |
| **Type** | For an upload, the CycloneDX spec version and file size. For a monitored row, the tool and scan category. |
| **Components** | Direct and transitive components, with how many are production scope and how many are direct |
| **Vulns** | Distinct vulnerability advisories |
| **When** | When it was uploaded or monitored |
| **Status** | `PENDING`, `PROCESSING` with the current stage, `SUCCESS` or `FAILED` |
| **Actions** | Download, monitor, delete, or stop monitoring |

Filter with the **Uploads** and **Monitored** chips, or **Filter by repo, app or filename**. Select rows to **Delete selected**. Deleting an upload removes the file. **Stop monitoring** on a monitored row removes it from this page and leaves the original scan in place.

### Monitor an upload

**Monitor** on an upload opens a notification rule, prefilled with the document's app name and version, that alerts Slack, Discord, Google Chat or GitHub when a new vulnerability affects it.

## The detail drawer

Opening a row shows two tabs.

| Tab | Shows |
|---|---|
| **Findings** | Each advisory and package with its severity and status, a mark for a CISA Known Exploited Vulnerability, and a link to the threat detail for a package flagged as malware |
| **Dependencies** | Each package with its ecosystem, scope, whether it is transitive, and its vulnerabilities |

When a processed document has a scan behind it, **Open full report** opens that scan in Scanner Results.

## Reporting periods

A compliance report's evidence link opens this page with `?from=` and `?to=`, so it lists only the documents uploaded in that period. A notice says so, and **Show all** clears it.

## Plan

The page needs a signed-in account and works on every plan.

## Related

- [Generate an SBOM](/sbom/generate/cdx/) with the CLI.
- [AI Inventory](/sbom/console/ai-inventory/) and [Crypto Inventory](/sbom/console/crypto-inventory/) read AI-BOM and CBOM scans.
