---
title: Quota and cache
description: What spends VDB requests, how the extension reads and reacts to the daily rate limit, and how long summaries are cached.
order: 3
sources: [browser-extension/src/lib/ratelimit.ts, browser-extension/src/lib/queue.ts, browser-extension/src/lib/cache.ts, browser-extension/src/entrypoints/background.ts, browser-extension/src/lib/api.ts, browser-extension/README.md]
checked: [browser-extension@d25ce74]
updated: 02 Nov 2026
---

The VDB rate limit is per day, and on the [Community plan](https://www.vulnetix.com/features/community) a request over the limit gets `429`. One advisory page can carry more than 60 identifiers, so the extension never fetches speculatively by default.

## What costs a request

| Action | Requests |
|---|---|
| Detecting and underlining identifiers | None |
| Hovering an identifier | 1 (`GET /v1/vuln/<id>`), unless cached |
| Opening the sidebar | 1 per identifier in the first batch (default 25), unless cached |
| **Load more** | 1 per identifier in the next batch |
| Opening a detail view | 9 (`POST /v2/cli.*`) |
| Exporting CSV | 9, whatever the row count |
| **Prefetch on page load** (off by default) | 1 per identifier on every page, as it loads |
| Pasting an API key | 1, to verify it |

## Reading the quota

Every VDB response carries rate-limit headers, which the extension keeps in session storage and shows in the sidebar:

| Header | Shown as |
|---|---|
| `RateLimit-DayLimit` | The daily limit |
| `RateLimit-Remaining` | Requests left today |
| `RateLimit-Reset` | When the limit resets |
| `X-VDB-Plan` | Your plan |

| Condition | Behaviour |
|---|---|
| Fewer than 50 requests remaining | The queue drops to one request at a time |
| `429` received | New lookups pause until `RateLimit-Reset` (60 s if absent). The card says how long until the reset; the Resolve Platform links keep working. An export carries cached data only. |
| A network error or `5xx` | Retried once after 500 to 1000 ms. A second failure is shown but not cached, so a flaky minute does not stick for 24 hours. |

The queue keeps two lanes, so identifiers on the tab you are looking at are fetched before a background tab's backlog.

## Cache

| Item | Value |
|---|---|
| Summary lifetime | 24 hours |
| "Not found" lifetime | 1 hour, so a newly published CVE is not missing for a day |
| Storage | `storage.local`, one `vx:sum:<ID>` entry per identifier |
| Garbage collection | Every 6 hours (`alarms`), trimming to 8,000 entries once over 12,000, and dropping expired ones |
| Cleared by | **Clear** under Settings > Cache, or **Sign out and clear cache** |

Settings > Cache shows the entry count and size.
