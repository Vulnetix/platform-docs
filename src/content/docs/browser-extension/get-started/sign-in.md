---
title: Sign in
description: Give the extension a VDB credential with the browser device-code flow or a pasted API key, and what signing out clears.
order: 3
sources: [browser-extension/src/lib/device-auth.ts, browser-extension/src/lib/api.ts, browser-extension/src/lib/auth.ts, browser-extension/src/ui/components/ApiKeyForm.vue, browser-extension/src/ui/components/DeviceCodePanel.vue, browser-extension/src/ui/views/AuthView.vue, browser-extension/README.md, browser-extension/PRIVACY.md]
checked: [browser-extension@d25ce74]
updated: 02 Nov 2026
---

Lookups need a VDB credential. Without one, identifiers are still detected and underlined, and the Resolve console links still work.

Open the sidebar and choose **Sign in**, or open the extension's options page. There are two methods.

## Sign in with your browser

The device-code flow, the same one `vulnetix auth login` uses.

1. Choose **Sign in with browser**. The extension calls `POST https://www.vulnetix.com/api/site/v1/cli/device/authorize`.
2. It shows a user code and **Open verification page**. Approve the code from a browser session that is already signed in to Vulnetix. The code can be copied, or entered at the shown address on another device.
3. The sidebar or options page polls `POST .../cli/device/token` every 5 seconds (longer if the server asks it to slow down).
4. On approval it stores the returned API key. The JWT in the response is discarded.

| Outcome | Message or state |
|---|---|
| Not approved within the server's expiry (default 300 s) | "The code expired after 5 minutes." Start again. |
| Denied | The flow stops; start again |
| You close the sidebar or options tab | The flow is abandoned. Polling runs in that page, not in the background worker. |

The stored key is long-lived, so there is no token refresh.

## Paste an API key

For a key you already hold. The field takes the form `<principal UUID>:<secret>`, for example `00000000-0000-0000-0000-000000000000:<64 hex>`. The key is sent as `Authorization: ApiKey <uuid>:<secret>`.

The extension checks the key with one lookup of `CVE-2024-3094` before storing it:

| VDB response | Shown |
|---|---|
| `401` or `403` | "The API key was rejected by VDB." |
| `404` | "VDB could not resolve the organisation for this key." |
| `5xx` | "VDB is unavailable (HTTP n). Try again shortly." |
| `2xx` | Stored |

## Where the key is kept

In `storage.local` under `vx:auth`, in your browser profile. It is not synced and not encrypted at rest; browser extensions have no access to an OS keychain. The key is only ever read by the background worker, never by a content script or a web page. The sidebar shows the key's principal UUID and when it was obtained, so a key on a lost machine can be identified and revoked.

## Sign out

**Sign out and clear cache** removes the credential and every cached summary. Settings are kept.
