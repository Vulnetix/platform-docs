---
title: Permissions and privacy
description: Every manifest permission and why it is requested, what is sent to which host, what is stored in the browser profile, and the Firefox data-collection declaration.
order: 3
sources: [browser-extension/wxt.config.ts, browser-extension/src/entrypoints/content.ts, browser-extension/src/lib/api.ts, browser-extension/src/lib/cache.ts, browser-extension/PRIVACY.md, browser-extension/README.md, browser-extension/scripts/check-manifest.mjs]
checked: [browser-extension@d25ce74]
updated: 02 Nov 2026
---

## Manifest permissions

| Permission | Browsers | Why |
|---|---|---|
| `storage` | Both | Credential, summary cache, settings, per-tab state |
| `alarms` | Both | The 6-hourly cache clean-up, without keeping the worker alive |
| `sidePanel` | Chromium | The sidebar. Firefox's `sidebar_action` needs no permission. |
| `host_permissions`: `https://api.vdb.vulnetix.com/*`, `https://www.vulnetix.com/*` | Both | Neither host sends CORS headers a page could use, so all requests come from the background worker, which host permissions exempt from CORS |
| Content script on `http://*/*`, `https://*/*` | Both | Detection must run on any page. Excludes `*.vulnetix.com`. Top frame only. |
| `commands`: `open-sidebar` | Both | The <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd> shortcut |

Not requested: `tabs`, `scripting`, `webNavigation`, `cookies`, `offscreen`, `unlimitedStorage`, or a literal `<all_urls>`. `web_accessible_resources` is empty, and the extension pages' CSP is `script-src 'self'; object-src 'self'`. CI fails if any of this changes.

## What is sent

| Sent | To | When |
|---|---|---|
| A vulnerability identifier | `https://api.vdb.vulnetix.com` | You hover it, open the sidebar or a detail view, export, or have prefetch on |
| Your API key, as `Authorization: ApiKey <uuid>:<secret>` | `https://api.vdb.vulnetix.com` | With every lookup |
| A client name, then the device code | `https://www.vulnetix.com/api/site/v1/cli/device/*` | During browser sign-in only |

Nothing else: no page URL, title or content, no browsing history, no text you type, no telemetry, analytics or crash reports. The scanner skips form fields and editable regions entirely.

A lookup does tell the VDB which identifier your organisation's key asked about, so your organisation's VDB request log shows the identifiers this browser looked up. It does not show the page they were on.

The API key never enters a content script or a web page; only the background worker reads it. A test walks the content script's whole import graph to keep it that way.

## What is stored

All in this browser profile, none of it synced.

| Key | Area | Contents | Lifetime |
|---|---|---|---|
| `vx:auth` | `storage.local` | Principal UUID, secret, org ID, when obtained | Until sign-out |
| `vx:sum:<ID>` | `storage.local` | Cached summary | 24 hours, 1 hour for "not found" |
| `vx:settings` | `storage.local` | Settings and site list | Until changed |
| `vx:tabs`, `vx:ratelimit` | `storage.session` | Identifiers per tab, quota state | Until the browser closes |

`storage.local` is not encrypted at rest. Anyone with access to the profile directory can read the key. During sign-in, the device code is held in page memory only, never written to storage or logged.

## Firefox data collection declaration

The Firefox build declares `data_collection_permissions.required: ["websiteContent", "authenticationInfo"]`: identifiers found in page text are sent for lookup, and the API key travels with each request. Firefox 128 to 139 ignores the key; Mozilla's review reads it from the submission.
