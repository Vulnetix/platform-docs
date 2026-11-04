---
title: Browser extension quickstart
nav: Quickstart
description: Install the Vulnetix browser extension, sign in with a device code, and hover a vulnerability identifier on a web page to read its hover card.
order: 1.5
sources: [browser-extension/README.md, browser-extension/src/ui/views/AuthView.vue, browser-extension/src/ui/components/DeviceCodePanel.vue, browser-extension/src/lib/device-auth.ts, browser-extension/src/content/hovercard.ts, browser-extension/src/shared/identifiers.ts]
checked: [browser-extension@d25ce7444]
updated: 04 Nov 2026
---

This page goes from no extension to your first hover card. The extension underlines vulnerability identifiers such as `CVE-2024-3094` or `GHSA-...` in the text of a page. It does not recognise package names.

## Prerequisites

- Chromium 116 or later (Chrome, Edge, Brave, Arc, Opera, Vivaldi), or Firefox 128 ESR or later.
- A Vulnetix account signed in to `https://www.vulnetix.com` in the same browser. A free Community account works; each lookup spends one request of its daily quota.

## 1. Install

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/vulnetix/mfopdnbogadgchlpfjmfehcococbdbdd) or [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/vulnetix/). Pin the Vulnetix icon to the toolbar.

The browser warns that the extension can read and change your data on all websites. That is the match it needs to find an identifier on any page. [Permissions and privacy](/browser-extension/reference/permissions-and-privacy/) lists what it actually reads and sends.

## 2. Open the sidebar

Click the Vulnetix icon, or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>. On Chromium it opens as the side panel, on Firefox as the sidebar.

## 3. Sign in with a device code

In the sidebar choose **Sign in**, keep **Sign in with browser**, and choose **Sign in with your browser**. The sidebar shows a code under "Enter this code at the verification page:".

Choose **Open verification page** and approve the code in your signed-in Vulnetix tab. The sidebar shows "Waiting for approval" with a countdown, then **Signed in**. The code expires after 5 minutes; choose **Start over** to get a new one.

Keep the sidebar open while you approve. Polling runs in the sidebar, so closing it abandons the sign-in.

## 4. Hover an identifier

Open a page that names a vulnerability, for example `https://nvd.nist.gov/vuln/detail/CVE-2024-3094`, a GitHub advisory or an issue that cites a CVE. Each identifier gets a dotted underline. Rest the pointer on one.

The card opens after a moment and shows:

| Part | Content |
|---|---|
| Badge | `KEV`, `KEV · Ransomware` or `Malware`, when they apply |
| Score | The primary score, such as CVSS with its version |
| Affected | `vendor / product @ version (ecosystem)` |
| Exploits | Exploit maturity and the count of PoC references |
| Link | **Open in Resolve Platform** |

Press <kbd>Escape</kbd> or click outside to close it. A second hover of the same identifier is served from the cache.

## Next

- [Hover card](/browser-extension/using/hover-card/) for what is scanned and what is skipped.
- [Sidebar and export](/browser-extension/using/sidebar/) to list every identifier on a page.
- [Quota and cache](/browser-extension/using/quota-and-cache/) for what each action costs.
- [Settings](/browser-extension/reference/settings/) to stop it running on a site.
