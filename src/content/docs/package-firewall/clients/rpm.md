---
title: RPM (dnf and yum)
nav: RPM
description: Add a dnf or yum repository that points at the Package Firewall, with the base URL path the default Fedora mirror needs.
order: 20
sources: [package-firewall/internal/ecosystem/rpm/rpm.go, package-firewall/internal/ecosystem/ecosystem.go, package-firewall/internal/upstream/mirror.go, cli/pkg/packagefirewall/ecosystem.go]
checked: [package-firewall@333285f, cli@v4.13.1]
updated: 03 Nov 2026
---

| | |
|---|---|
| Repository URL | `https://packages.vulnetix.com/rpm/<path on the mirror>` |
| Ecosystem ID | `rpm` |
| Plan | Add-on |
| Mode | gate: anything under `repodata/` is streamed unchanged; `<name>-<version>-<release>.<arch>.rpm` is checked |
| Cooldown | no |
| Default mirror | `https://dl.fedoraproject.org` |
| Automatic setup | none, needs root. `vulnetix package-firewall rpm` exists but exits with "automatic configuration is not implemented yet"; configure the repository below by hand. |

The path after `/rpm` is appended to the mirror URL unchanged. With the default mirror, the Fedora release tree is under `/pub/fedora/linux/releases/`.

## Configuration

`/etc/yum.repos.d/vulnetix.repo`:

```ini
[vulnetix]
name=Vulnetix Package Firewall
baseurl=https://packages.vulnetix.com/rpm/pub/fedora/linux/releases/$releasever/Everything/$basearch/os/
enabled=1
gpgcheck=1
username=YOUR_ORG_UUID
password=YOUR_API_KEY
```

Disable the distribution's own repositories for the same content (`sudo dnf config-manager setopt fedora.enabled=0` on dnf5) so packages are not fetched directly.

For RHEL, Rocky, Alma or an internal mirror, add that mirror as the `rpm` [mirror](/package-firewall/operations/mirrors/) and write `baseurl` relative to it.

## Use and verify

```bash
sudo dnf clean all
sudo dnf repolist
sudo dnf install curl
```

`repomd.xml` signatures still verify. Keep `gpgcheck=1`.
