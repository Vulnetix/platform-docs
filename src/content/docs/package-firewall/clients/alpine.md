---
title: Alpine (apk)
nav: Alpine
description: Point apk at the Package Firewall, which serves APKINDEX unchanged and gates .apk downloads.
order: 21
sources: [package-firewall/internal/ecosystem/alpine/alpine.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [package-firewall@333285f]
updated: 03 Nov 2026
---

| | |
|---|---|
| Repository URL | `https://packages.vulnetix.com/alpine/<branch>/<repo>` |
| Ecosystem ID | `alpine` |
| Plan | Add-on |
| Mode | gate: `APKINDEX.tar.gz` is streamed unchanged; `<name>-<version>-r<n>.apk` is checked |
| Cooldown | no |
| Default mirror | `https://dl-cdn.alpinelinux.org` |
| Automatic setup | none, needs root |

## Configuration

Replace `/etc/apk/repositories` with the firewall URLs. Match the branch to your image (`v3.22`, `edge`, ...):

```text
https://YOUR_ORG_UUID:YOUR_API_KEY@packages.vulnetix.com/alpine/v3.22/main
https://YOUR_ORG_UUID:YOUR_API_KEY@packages.vulnetix.com/alpine/v3.22/community
```

In a Dockerfile, pass the credentials as a build secret rather than baking them into a layer:

```dockerfile
RUN --mount=type=secret,id=apkrepos,target=/etc/apk/repositories \
    apk add --no-cache curl
```

```bash
docker build --secret id=apkrepos,src=./vulnetix-apk-repositories .
```

## Use and verify

```bash
apk update
apk add curl
```

The RSA-signed `APKINDEX` is never rewritten, so signing keys keep working.
