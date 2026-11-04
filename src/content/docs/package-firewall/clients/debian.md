---
title: Debian and Ubuntu (APT)
nav: Debian and Ubuntu
description: Point APT at the Package Firewall, which serves signed indexes unchanged and gates .deb downloads, and set the mirror path it needs.
order: 19
sources: [package-firewall/internal/ecosystem/debian/debian.go, package-firewall/internal/ecosystem/ecosystem.go, package-firewall/internal/upstream/mirror.go, cli/cmd/config.go, cli/pkg/packagefirewall/ecosystem.go]
checked: [package-firewall@333285f, cli@4c8c3b7]
updated: 03 Nov 2026
---

| | |
|---|---|
| Repository URL | `https://packages.vulnetix.com/debian` |
| Ecosystem ID | `debian` |
| Plan | Add-on |
| Mode | gate: `dists/` is streamed unchanged; `pool/**/<name>_<version>_<arch>.deb` is checked |
| Cooldown | no |
| Default mirror | `https://deb.debian.org` |
| Automatic setup | none, needs root. `vulnetix package-firewall debian` exists but exits with "automatic configuration is not implemented yet"; configure the repository below by hand. |

The firewall only recognises paths that start with `dists/` or `pool/`, and appends that path to the mirror URL. The archive must therefore be the mirror itself, path included.

## 1. Set the mirror

The seeded default `https://deb.debian.org` has no `dists/` at its root (`https://deb.debian.org/dists/stable/Release` is a 404), so replace it:

```bash
vulnetix config set package-firewall debian https://deb.debian.org/debian --priority 0
vulnetix config set package-firewall debian https://deb.debian.org --disable
```

For Ubuntu use `https://archive.ubuntu.com/ubuntu`. A `404` from a mirror is final and is not retried on the next mirror, which is why the old default must be disabled rather than just outranked.

## 2. Configure APT

`/etc/apt/sources.list.d/vulnetix.list`:

```text
deb https://packages.vulnetix.com/debian bookworm main
```

`/etc/apt/auth.conf.d/vulnetix.conf`, mode `600`, owned by root:

```text
machine packages.vulnetix.com
login YOUR_ORG_UUID
password YOUR_API_KEY
```

Comment out the matching lines in `/etc/apt/sources.list` (or `/etc/apt/sources.list.d/debian.sources`) so APT does not also fetch directly.

## Use and verify

```bash
sudo apt update
apt-cache policy curl
sudo apt install curl
```

The `Release` signature still verifies because the index is never rewritten. A blocked package fails at download with the block status.
