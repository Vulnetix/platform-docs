---
title: Arch Linux (AUR and pacman)
nav: Arch Linux
description: Point paru and yay at the Package Firewall's AUR prefix and pacman's official repositories at its Arch prefix.
order: 17
sources: [cli/pkg/packagefirewall/config.go, cli/pkg/packagefirewall/ecosystem.go, package-firewall/internal/ecosystem/aur/aur.go, package-firewall/internal/ecosystem/arch/arch.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [cli@4c8c3b7, package-firewall@333285f]
updated: 03 Nov 2026
---

| | AUR | Official repos |
|---|---|---|
| URL | `https://packages.vulnetix.com/aur` | `https://packages.vulnetix.com/arch` |
| Ecosystem ID | `aur` | `arch` |
| Clients | paru, yay | pacman |
| Plan | Free | Add-on |
| Mode | filter: the RPC result list is filtered | gate: signed databases unchanged; `.pkg.tar.zst` downloads checked |
| Cooldown | yes | no |
| Default mirror | `https://aur.archlinux.org` | `https://geo.mirror.pkgbuild.com` |

## Automatic setup

```bash
vulnetix package-firewall aur
```

One command covers both. paru and yay configs are merged, not replaced: the original is backed up to `<file>.vulnetix.bak` first.

| File | Change |
|---|---|
| `~/.config/paru/paru.conf` | `AurUrl` and `AurRpcUrl` set under `[options]` |
| `~/.config/yay/config.json` | `aururl` and `aurrpcurl` keys set; other keys kept |
| `~/.config/vulnetix/package-firewall/arch-mirrorlist` | A `Server =` line for pacman, staged for you to install |
| `~/.config/vulnetix/package-firewall/pacman.conf` | A complete pacman config for a no-root test |

```ini
[options]
AurUrl = https://YOUR_ORG_UUID:YOUR_API_KEY@packages.vulnetix.com/aur
AurRpcUrl = https://YOUR_ORG_UUID:YOUR_API_KEY@packages.vulnetix.com/aur/rpc
```

## pacman (needs root)

The CLI never edits `/etc`. Install the staged mirrorlist:

```bash
sudo install -m 600 ~/.config/vulnetix/package-firewall/arch-mirrorlist /etc/pacman.d/vulnetix-mirrorlist
```

Then add `Include = /etc/pacman.d/vulnetix-mirrorlist` as the first line under `[core]`, `[extra]` and `[multilib]` in `/etc/pacman.conf`. The staged line is:

```text
Server = https://YOUR_ORG_UUID:YOUR_API_KEY@packages.vulnetix.com/arch/$repo/os/$arch
```

Test without root first:

```bash
pacman --config ~/.config/vulnetix/package-firewall/pacman.conf \
  --dbpath /tmp/vx-db --cachedir /tmp/vx-cache -Syp bash
```

## Use

```bash
paru -S some-aur-package
sudo pacman -Syu
```

## Remove

`vulnetix package-firewall uninstall aur` restores the paru and yay backups and deletes the staged files. Remove the `Include` lines and `/etc/pacman.d/vulnetix-mirrorlist` yourself.
