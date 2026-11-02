---
title: Browser extension
nav: Overview
description: The Vulnetix browser extension finds vulnerability identifiers in the text of any web page and shows VDB intelligence for them in a hover card and a browser sidebar.
order: 1
sources: [browser-extension/README.md, browser-extension/wxt.config.ts, browser-extension/src/entrypoints/content.ts, browser-extension/src/shared/identifiers.ts, browser-extension/src/lib/api.ts, browser-extension/package.json]
checked: [browser-extension@d25ce74]
updated: 02 Nov 2026
---

The extension scans the text of the page you are reading for identifiers such as `CVE-2024-3094`, `GHSA-...` or `RUSTSEC-...`, and gives you two ways to read them:

- **Hover card.** Each identifier gets a dotted underline. Hover it to see severity and score, title, affected package, age, KEV and ransomware status, exploit maturity and PoC count, with a link to the Resolve console.
- **Sidebar.** A real browser sidebar (side panel on Chromium, sidebar on Firefox) listing every identifier on the page, with sorting, filters, a detail view and CSV export.

Detection runs locally and costs nothing. Looking an identifier up spends a VDB request against your daily quota, so lookups only happen when you hover, open the sidebar, or turn on prefetch.

| Item | Value |
|---|---|
| Version | 0.2.1 |
| Browsers | Chromium 116+ (Chrome, Edge, Brave, Arc, Opera, Vivaldi), Firefox 128 ESR+ (also Zen, LibreWolf, Waterfox) |
| Manifest | MV3 on both |
| Runs on | Every `http` and `https` page except `*.vulnetix.com` |
| Talks to | `api.vdb.vulnetix.com` and `www.vulnetix.com`, from the background worker only |
| Telemetry | None |
| Shortcut | <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> opens the sidebar |

## Find the page for your task

| I want to | Read |
|---|---|
| Install it from a store, or sideload it | [Install](/browser-extension/get-started/install/) |
| Sign in with my browser session or an API key | [Sign in](/browser-extension/get-started/sign-in/) |
| Understand what the hover card shows | [Hover card](/browser-extension/using/hover-card/) |
| Export every identifier on a page to CSV | [Sidebar and export](/browser-extension/using/sidebar/) |
| Stop it running on a site | [Settings](/browser-extension/reference/settings/) |
| Know how many lookups I have left | [Quota and cache](/browser-extension/using/quota-and-cache/) |
| Check whether an identifier format is recognised | [Identifier formats](/browser-extension/reference/identifiers/) |
| Review the permissions and what is sent | [Permissions and privacy](/browser-extension/reference/permissions-and-privacy/) |

## Platform IaC

The browser extension has no config-as-code. Its settings live in the browser profile and are not synced. Config-as-code for this product is planned and is described on [/platform-iac/](/platform-iac/).
