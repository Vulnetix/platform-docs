---
title: Conan
description: Register the Package Firewall as a Conan 2 remote and disable ConanCenter.
order: 10
sources: [cli/pkg/packagefirewall/config.go, package-firewall/internal/ecosystem/conan/conan.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [cli@4c8c3b7, package-firewall@333285f]
updated: 03 Nov 2026
---

| | |
|---|---|
| Remote URL | `https://packages.vulnetix.com/conan` |
| Ecosystem ID | `conan` |
| Plan | Add-on |
| Mode | gate: recipe and package downloads are checked |
| Cooldown | no |
| Default mirror | `https://center2.conan.io` (Conan 2 API) |

Conan 2 only. The default mirror is `center2.conan.io` because `center.conan.io` serves only the Conan 1 API.

## Automatic setup

```bash
vulnetix package-firewall conan
```

`~/.conan2/remotes.json`:

```json
{
  "remotes": [
    { "name": "vulnetix", "url": "https://packages.vulnetix.com/conan", "verify_ssl": true },
    { "name": "conancenter", "url": "https://center2.conan.io", "verify_ssl": true, "disabled": true }
  ]
}
```

`~/.conan2/credentials.json`:

```json
{
  "credentials": [
    { "remote": "vulnetix", "user": "YOUR_ORG_UUID", "password": "YOUR_API_KEY" }
  ]
}
```

Both files are written whole. Existing files are backed up to `.vulnetix.bak` and restored by `vulnetix package-firewall uninstall conan`.

## Manual equivalent

```bash
conan remote add vulnetix https://packages.vulnetix.com/conan --index 0
conan remote disable conancenter
conan remote login vulnetix "$VULNETIX_ORG_ID" -p "$VULNETIX_API_KEY"
```

## Use and verify

```bash
conan remote list
conan install --requires=zlib/1.3.1 --build=missing
```
