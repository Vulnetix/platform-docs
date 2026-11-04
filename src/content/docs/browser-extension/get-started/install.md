---
title: Install
description: Install from the Chrome Web Store or Firefox Add-ons, or sideload a release build from vulnetix.com and verify it against SHA256SUMS.txt.
order: 2
sources: [browser-extension/README.md, browser-extension/wxt.config.ts, browser-extension/.github/workflows/release.yml, browser-extension/.github/workflows/publish.yml]
checked: [browser-extension@d25ce74]
updated: 05 Nov 2026
---

## From a store

| Store | Listing | Browsers | Version on 02 Nov 2026 |
|---|---|---|---|
| Chrome Web Store | [Vulnetix](https://chromewebstore.google.com/detail/vulnetix/mfopdnbogadgchlpfjmfehcococbdbdd) | Chrome, Edge, Brave, Arc, Opera, Vivaldi, Chromium (116 or later) | 0.2.1 |
| Firefox Add-ons | [Vulnetix](https://addons.mozilla.org/firefox/addon/vulnetix/) | Firefox and Firefox ESR 128 or later, Zen, LibreWolf, Waterfox | 0.2.1 |

Store installs update themselves. Edge asks once to allow extensions from other stores; Opera may ask to install its Chrome extension bridge. An Edge Add-ons listing is wired into the publish workflow but is not live; Edge installs the Chrome Web Store build.

After installing, pin the Vulnetix icon to the toolbar. Clicking it opens the sidebar, as does <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>. Then [sign in](/browser-extension/get-started/sign-in/).

The browser warns that the extension can "read and change all your data on all websites". That is the content script's `http://*/*` and `https://*/*` match, needed because an identifier can appear on any page. What it actually reads and sends is on [Permissions and privacy](/browser-extension/reference/permissions-and-privacy/).

## Sideload a release build

For environments where store installs are blocked. A sideloaded copy does not update itself.

Every release is mirrored to vulnetix.com under fixed names, so these links always serve the newest release:

| File | Contents |
|---|---|
| [`vulnetix-chrome.zip`](https://vulnetix.com/marketing/downloads/browser-extension/latest/vulnetix-chrome.zip) | Chromium build |
| [`vulnetix-firefox.zip`](https://vulnetix.com/marketing/downloads/browser-extension/latest/vulnetix-firefox.zip) | Unsigned Firefox build, temporary installs only |
| [`vulnetix-sources.zip`](https://vulnetix.com/marketing/downloads/browser-extension/latest/vulnetix-sources.zip) | Sources as submitted to Mozilla |
| [`SHA256SUMS.txt`](https://vulnetix.com/marketing/downloads/browser-extension/latest/SHA256SUMS.txt) | Checksums for all of the above |

Each release also stays at `https://vulnetix.com/marketing/downloads/browser-extension/v<version>/`, with the versioned filenames beside the fixed ones, for pinning a version.

Download and verify:

```sh
curl -fLO https://vulnetix.com/marketing/downloads/browser-extension/latest/vulnetix-chrome.zip
curl -fLO https://vulnetix.com/marketing/downloads/browser-extension/latest/SHA256SUMS.txt
sha256sum -c SHA256SUMS.txt --ignore-missing
```

### Chromium

1. Unzip `vulnetix-chrome.zip`.
2. Open `chrome://extensions` (`edge://extensions`, `brave://extensions`).
3. Turn on **Developer mode**.
4. **Load unpacked**, and select the unzipped folder.

A `.zip` cannot be dragged onto the extensions page the way a `.crx` can.

### Firefox

For a permanent install, use the [Firefox Add-ons listing](https://addons.mozilla.org/firefox/addon/vulnetix/): Firefox installs only signed add-ons permanently, and the mirror carries no signed file to sideload.

`vulnetix-firefox.zip` loads only through `about:debugging#/runtime/this-firefox` > **Load Temporary Add-on** and is removed when Firefox restarts. Use it for debugging only.
