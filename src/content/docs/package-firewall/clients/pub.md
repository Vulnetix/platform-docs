---
title: pub.dev (Dart and Flutter)
nav: pub.dev
description: Point dart pub and flutter pub at the Package Firewall with PUB_HOSTED_URL and a bearer token.
order: 15
sources: [cli/pkg/packagefirewall/config.go, package-firewall/internal/auth/basic.go, package-firewall/internal/ecosystem/pub/pub.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [cli@4c8c3b7, package-firewall@333285f]
updated: 02 Nov 2026
---

| | |
|---|---|
| Hosted URL | `https://packages.vulnetix.com/pub` |
| Ecosystem ID | `pub` |
| Plan | Pro |
| Mode | filter: `/api/packages/<name>` is filtered by version |
| Cooldown | yes |
| Default mirror | `https://pub.dev` |

Dart rejects credentials in `PUB_HOSTED_URL` and cannot send Basic auth. It stores one bearer token per hosted URL, and the firewall accepts `base64("<orgUUID>:<apiKey>")` as that token.

## Automatic setup

```bash
vulnetix package-firewall pub
source ~/.config/vulnetix/package-firewall/pub.env
```

`~/.config/vulnetix/package-firewall/pub.env`:

```bash
export PUB_HOSTED_URL="https://packages.vulnetix.com/pub"
```

`~/.config/dart/pub-tokens.json` (written whole, existing file backed up):

```json
{
  "hosted": [
    {
      "token": "BASE64_OF_ORGUUID_COLON_APIKEY",
      "url": "https://packages.vulnetix.com/pub"
    }
  ],
  "version": 1
}
```

> [!CAREFUL] macOS reads a different token file
> The CLI writes the Linux path. Dart on macOS reads `~/Library/Application Support/dart/pub-tokens.json`. On macOS add the token with `dart pub token add` as below.

## Manual equivalent

`--env-var` stores the variable name, not the token, so `PUB_VULNETIX_TOKEN` must be set wherever `dart pub` runs.

```bash
export PUB_HOSTED_URL="https://packages.vulnetix.com/pub"
export PUB_VULNETIX_TOKEN=$(printf '%s:%s' "$VULNETIX_ORG_ID" "$VULNETIX_API_KEY" | base64 | tr -d '\n')
dart pub token add https://packages.vulnetix.com/pub --env-var PUB_VULNETIX_TOKEN
```

## Use and verify

```bash
dart pub token list
dart pub get
flutter pub get
```
