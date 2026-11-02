---
title: Install
description: Install from the Chrome Web Store or Firefox Add-ons, or sideload a release build and verify it against SHA256SUMS.txt.
order: 2
sources: [browser-extension/README.md, browser-extension/wxt.config.ts, browser-extension/.github/workflows/release.yml, browser-extension/.github/workflows/publish.yml]
checked: [browser-extension@d25ce74]
updated: 02 Nov 2026
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

Every GitHub release attaches these files, under both versioned names and the fixed names below:

| File | Contents |
|---|---|
| `vulnetix-chrome.zip` | Chromium build |
| `vulnetix-firefox.xpi` | Firefox build signed by Mozilla, installs permanently |
| `vulnetix-firefox.zip` | Unsigned Firefox build, temporary installs only |
| `vulnetix-sources.zip` | Sources as submitted to Mozilla |
| `SHA256SUMS.txt` | Checksums for all of the above |

> [!CAREFUL] The repository is private
> `Vulnetix/browser-extension` is private, so release downloads need a GitHub account with access. The `/releases/latest/download/` links work in a signed-in browser; `curl` gets `404` there even with a token, because that route ignores tokens.

Download with the GitHub CLI and verify:

```sh
gh release download --repo Vulnetix/browser-extension \
  --pattern 'vulnetix-chrome.zip' --pattern 'SHA256SUMS.txt'
sha256sum -c SHA256SUMS.txt --ignore-missing
```

Without `gh`, the REST asset endpoint accepts a token when you ask for the bytes:

```sh
url=$(curl -sSL -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/Vulnetix/browser-extension/releases/latest \
  | jq -r '.assets[] | select(.name == "vulnetix-chrome.zip") | .url')
curl -sSL -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/octet-stream" -o vulnetix-chrome.zip "$url"
```

### Chromium

1. Unzip `vulnetix-chrome.zip`.
2. Open `chrome://extensions` (`edge://extensions`, `brave://extensions`).
3. Turn on **Developer mode**.
4. **Load unpacked**, and select the unzipped folder.

A `.zip` cannot be dragged onto the extensions page the way a `.crx` can.

### Firefox

1. Open `about:addons`.
2. Click the gear icon, then **Install Add-on From File**.
3. Select `vulnetix-firefox.xpi`.

`vulnetix-firefox.zip` loads only through `about:debugging#/runtime/this-firefox` > **Load Temporary Add-on** and is removed when Firefox restarts. Use it for debugging only.

The signed `.xpi` has no `update_url`, so a self-hosted copy does not update itself.
