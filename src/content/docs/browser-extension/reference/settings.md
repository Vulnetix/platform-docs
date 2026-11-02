---
title: Settings
description: Every option on the extension's Settings page, its storage key, type, range and default.
order: 1
sources: [browser-extension/src/shared/types.ts, browser-extension/src/lib/settings.ts, browser-extension/src/ui/views/SettingsView.vue, browser-extension/src/entrypoints/content.ts]
checked: [browser-extension@d25ce74]
updated: 02 Nov 2026
---

Open Settings from the sidebar or the extension's options page. Settings are stored in `storage.local` under `vx:settings`, in this browser profile only, and are kept when you sign out.

| Option | Key | Type and range | Default | Effect |
|---|---|---|---|---|
| Prefetch on page load | `prefetchOnLoad` | boolean | `false` | Look up every identifier as each page loads. Spends one request per identifier per page. |
| Batch size | `sidebarBatchSize` | integer 1 to 200 | `25` | Identifiers the sidebar fetches per batch |
| Concurrent requests | `concurrency` | integer 1 to 16 | `4` | Parallel lookups. Drops to 1 when fewer than 50 requests remain today. |
| Open automatically when identifiers are found | `autoOpenSidebar` | boolean | `false` | Firefox only. On Chromium a side panel cannot open without a click, so only the toolbar badge count is shown. |
| Only run on sites I allow | `allowlistMode` | boolean | `false` | Switches the site list from a block list to an allow list |
| Site list | `disabledOrigins` or `allowedOrigins` | list of origins | empty | See below |

## Sites

The list holds origins, typed exactly as `scheme://host[:port]` with no path, for example `https://github.com`. The content script compares the page's `location.origin` with the list before it does anything.

| Mode | Runs on |
|---|---|
| Block list (default) | Every page except origins in `disabledOrigins` |
| Allow list (**Only run on sites I allow**) | Only origins in `allowedOrigins`. With an empty list, nowhere. |

`*.vulnetix.com` and `vulnetix.com` are always excluded by the manifest, whatever the list says. A change applies the next time a page loads.

## Cache

Settings > Cache shows the entry count and size on disk, with **Clear** to remove every cached summary. See [Quota and cache](/browser-extension/using/quota-and-cache/).

## Shortcut

The `open-sidebar` command defaults to <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>. Change it in `chrome://extensions/shortcuts` (Chromium) or **Manage Extension Shortcuts** under `about:addons` (Firefox).
