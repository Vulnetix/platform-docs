---
title: Hover card
description: How identifiers are found and underlined on a page, what the hover card shows, how it opens and closes, and the limits on what is scanned.
order: 1
sources: [browser-extension/src/entrypoints/content.ts, browser-extension/src/content/scan.ts, browser-extension/src/content/highlight.ts, browser-extension/src/content/hovercard.ts, browser-extension/src/content/observer.ts, browser-extension/src/content/worker-host.ts, browser-extension/src/shared/deeplink.ts, browser-extension/README.md]
checked: [browser-extension@d25ce74]
updated: 02 Nov 2026
---

## Detection

The content script runs at `document_idle` in the top frame of every `http` and `https` page, except `https://*.vulnetix.com/*` and `https://vulnetix.com/*` (the site already renders this data). Its first step is to check the page's origin against your [site list](/browser-extension/reference/settings/#sites); on a disabled origin it stops there.

It walks the page text and matches the [identifier formats](/browser-extension/reference/identifiers/). An identifier split across elements, such as `<a>CVE-2024-<b>3094</b></a>`, is still one match. Unicode dashes are folded to `-`.

| Not scanned | Why |
|---|---|
| `<input>`, `<textarea>`, `<select>`, `[contenteditable]`, `[role=textbox]` | Never read what you type |
| `<script>`, `<style>`, `<noscript>`, `<template>`, `<svg>`, `<canvas>`, `<iframe>`, `<object>`, `<embed>` | Not page text |
| Iframes | `allFrames` is off; only the top frame is scanned |
| Hidden elements | Only visible text |
| Beyond 20,000 text nodes or 2,000,000 characters | Caps on one pass |

Pages that change after load are rescanned: a mutation observer waits for 400 ms of quiet, and at most 2 s, before rescanning.

Matching runs in a worker. A page whose Content Security Policy blocks `blob:` workers falls back to running the same matcher in idle slices on the main thread.

## Underlines

| Browser | Method | Keyboard |
|---|---|---|
| Chromium, Firefox 140+ | CSS Custom Highlight API. Nothing in the page is modified. | Not focusable |
| Firefox 128 to 139 | Matches are wrapped in `<vx-vuln>` elements with `tabindex="0"` | Tab to an identifier to open its card |

## The card

The card opens 120 ms after the pointer settles on an identifier and stays open when the pointer leaves. It closes on its close button, a click outside it, <kbd>Escape</kbd>, another identifier taking its place, or the tab being hidden.

Hovering fetches that one identifier, unless it is already cached.

| Part | Content |
|---|---|
| Identifier and badge | `KEV`, `KEV · Ransomware` or `Malware` |
| Title | When the VDB has one |
| Score | The primary score chip with its label, such as CVSS and version |
| Affected | `vendor / product @ version (ecosystem)` |
| Age | Time since publication |
| Exploits | Exploit maturity, and `N PoC refs` |
| Link | **Open in Resolve Platform**: `https://www.vulnetix.com/resolve/lookup?q=vuln%20<ID>&tab=output` |

When a lookup fails the card shows the error and keeps the console link. When the daily quota is exhausted it says how long until the reset; see [Quota and cache](/browser-extension/using/quota-and-cache/).
