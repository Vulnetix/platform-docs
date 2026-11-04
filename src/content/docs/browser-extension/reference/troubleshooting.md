---
title: Browser extension troubleshooting
nav: Troubleshooting
description: What each browser extension error means and how to fix it, from sign-in and lookups to exports and pages where nothing is underlined.
order: 50
sources: [browser-extension/src/lib/api.ts, browser-extension/src/lib/device-auth.ts, browser-extension/src/lib/queue.ts, browser-extension/src/shared/normalize.ts, browser-extension/src/entrypoints/background.ts, browser-extension/src/entrypoints/content.ts, browser-extension/src/content/hovercard.ts, browser-extension/src/ui/views/TabView.vue, browser-extension/src/ui/components/DeviceCodePanel.vue, browser-extension/src/ui/components/ApiKeyForm.vue, browser-extension/src/lib/settings.ts]
checked: [browser-extension@d25ce7444]
updated: 04 Nov 2026
---

The extension shows its errors in the sidebar, on the options page and in the hover card. Most come from a VDB API answer, so the fix is often on the [VDB API](/vdb-api/) side: the key, or the daily quota.

## Signing in

| Symptom or message | Cause | Fix |
|---|---|---|
| `The code expired after 5 minutes.` | The device code was not approved in time | Choose **Sign in with browser** again and approve the new code promptly. See [Sign in](/browser-extension/get-started/sign-in/#sign-in-with-your-browser) |
| Sign-in never finishes | The sidebar or options tab was closed while waiting. Polling runs in that page, not in the background | Keep the sidebar or options tab open until the code is approved |
| `The API key was rejected by VDB.` | The pasted key got `401` or `403`: wrong, revoked, or its organisation is inactive | Paste the key as `<principal UUID>:<secret>`, copied fresh from the [Account page](https://www.vulnetix.com/resolve/account) |
| `VDB could not resolve the organisation for this key.` | The check lookup got `404` | The organisation behind the key has been removed. Use a key from an active organisation |
| `VDB is unavailable (HTTP <n>). Try again shortly.` | The VDB API answered `5xx` during the check | Try again shortly. The key was not stored |

## Lookups

| Symptom or message | Cause | Fix |
|---|---|---|
| `Sign in to look up` | No credential is stored. Detection and console links still work | [Sign in](/browser-extension/get-started/sign-in/) |
| `VDB daily quota reached`, or the sidebar note `Daily quota reached` | The key got `429`. New lookups pause until `RateLimit-Reset`, or 60 s when that header is missing | Wait for the reset, or use a key on a plan with a larger quota. Cached cards and the **Open in Resolve Platform** link still work. See [Quota and cache](/browser-extension/using/quota-and-cache/) |
| Quota runs out quickly | **Prefetch on page load** is on, or **Batch size** is high. One advisory page can carry more than 60 identifiers | Turn prefetch off and lower the batch size in [Settings](/browser-extension/reference/settings/) |
| `Not found in VDB` | The VDB has no record for that identifier | Check it in the [Resolve console](https://www.vulnetix.com/resolve/lookup). The result is cached for 1 hour, so a newly published CVE appears after that |
| `Lookup failed` or `Network error` | The background worker could not reach `api.vdb.vulnetix.com`, after one retry | Check a proxy or firewall allows `api.vdb.vulnetix.com`. Hover again: failures are not cached |
| `Exported without exploit intelligence`, after an export | The nine enrichment requests for the CSV could not run | The file carries cached data only. Export again after the quota resets. See [Export to CSV](/browser-extension/using/sidebar/#export-to-csv) |

## Nothing is underlined

| Symptom | Cause | Fix |
|---|---|---|
| No underlines on a site, and the sidebar lists no identifiers | The site is on the block list, or **Only run on sites I allow** is on and the site is not allowed (an empty allow list runs nowhere) | Fix the list in [Settings](/browser-extension/reference/settings/#sites). Origins must be exactly `scheme://host[:port]`, and a change applies on the next page load |
| An identifier inside an iframe, a form field or hidden text is ignored | Only visible text in the top frame is scanned | See [Detection](/browser-extension/using/hover-card/#detection) |
| A format is not recognised, such as `MS-` or a bare `2024-3094` | Only the listed shapes are matched | Check [Identifier formats](/browser-extension/reference/identifiers/), or use the Resolve console |
| The sidebar does not open by itself on Chrome | A Chromium side panel cannot open without a click; **Open automatically** is Firefox only | Click the toolbar icon or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>. The badge shows how many identifiers were found |

## Still stuck

Note the extension version (from `chrome://extensions` or `about:addons`), the browser and its version, the page URL, and the exact message. Copy the plan and remaining quota shown in the sidebar. To rule out a stale card, choose **Clear** under Settings > Cache and hover again. To test the key outside the browser, run `vulnetix auth verify` with the same key, and see [Troubleshooting authentication](/cli/authentication/troubleshooting/) if it fails.
