---
title: Sidebar and export
description: The sidebar's identifier list, sorting and filters, the detail view, and the CSV export with every column it writes.
order: 2
sources: [browser-extension/src/ui/views/TabView.vue, browser-extension/src/ui/views/DetailView.vue, browser-extension/src/entrypoints/background.ts, browser-extension/src/lib/api.ts, browser-extension/src/shared/export.ts, browser-extension/src/shared/csv.ts, browser-extension/src/ui/download.ts, browser-extension/wxt.config.ts]
checked: [browser-extension@d25ce74]
updated: 02 Nov 2026
---

## Opening it

| Browser | Opens with | Without a click |
|---|---|---|
| Chromium | Toolbar icon, or <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> | Cannot open by itself: `sidePanel.open()` needs a user gesture. The toolbar badge shows the number of identifiers found. |
| Firefox | Toolbar button toggles it, or <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> | Opens automatically when identifiers are found if **Open automatically** is on |

Change the shortcut in `chrome://extensions/shortcuts` or Firefox's **Manage Extension Shortcuts**.

## The list

The sidebar shows the identifiers found on the active tab. Opening it fetches the first batch (25 by default, **Batch size** in Settings) with up to 4 requests at a time (**Concurrent requests**). **Load N more** fetches the next batch. With no identifiers it offers **Rescan page**.

| Sort | Order |
|---|---|
| Document order | As they appear on the page (default) |
| Severity | Highest score first |
| KEV first | KEV-listed first |
| Published | Newest first |

| Filter chip | Keeps |
|---|---|
| KEV | KEV-listed |
| Malware | Flagged as malware |
| High+ | Severity `CRITICAL` or `HIGH` |
| Exploit | Identifiers with a known exploit |

Filters combine. They apply to identifiers already loaded.

## Detail view

Click a card to open its detail view. It loads the summary plus nine sections from the VDB's `POST /v2/cli.*` endpoints, one request each:

`cli.kev`, `cli.exploits`, `cli.affected`, `cli.advisories`, `cli.fixes`, `cli.workarounds`, `cli.attack-techniques`, `cli.iocs`, `cli.sightings`.

A section that fails is left out rather than shown empty.

## Export to CSV

**Export N as CSV** writes the identifiers already loaded in the sidebar to `vulnetix-<host>-<YYYY-MM-DD>.csv`. It never looks up new identifiers. Each row is enriched with the same nine `cli.*` sections, as nine bulk requests for the whole list, however many rows. When the daily quota is exhausted, enrichment is skipped and the export carries cached data only.

The file is UTF-8 with a byte order mark and CRLF line endings, so Excel opens it without mangling characters. List values within a cell are separated by `; `.

| Group | Columns |
|---|---|
| Identity | `id`, `aliases`, `title`, `description`, `sources` |
| Scores | `severity`, `primary_score_label`, `primary_score_value`, `cvss_version`, `cvss_base_score`, `cvss_severity`, `cvss_vector`, `cvss_all`, `epss_score`, `epss_percentile` |
| Weakness | `cwe_ids`, `cwe_names` |
| Dates | `published`, `updated`, `reserved`, `age` |
| Affected | `vendor`, `product`, `ecosystem`, `versions`, `purl`, `cpes`, `repository` |
| Exploitation | `is_kev`, `kev_source`, `kev_date_added`, `kev_due_date`, `is_ransomware`, `is_malware`, `exploit_maturity`, `exploit_count`, `exploit_sources`, `exploit_urls`, `poc_count`, `attack_techniques`, `ioc_count`, `sighting_count` |
| Remediation | `has_fix`, `fixed_versions`, `has_workaround`, `workaround_summary` |
| Links | `advisory_url`, `references`, `vulnetix_api_url`, `vulnetix_console_url` |
| Context | `page_url`, `page_title`, `exported_at`, `data_error` |
| Raw | `json`: the extracted facts and the per-identifier `cli.*` sections, for anything the columns do not cover |

The page URL and title are written into the file on your machine only. They are not sent anywhere.
