---
title: Uninstall
description: Remove the Package Firewall configuration for one, some or every ecosystem, and optionally the shared credential.
order: 4
sources: [cli/cmd/package_firewall.go, cli/internal/managedfile/file.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

`vulnetix package-firewall uninstall` reverses what `vulnetix package-firewall <ecosystem>` wrote. It reads and writes local files only and needs no authentication.

```bash
vulnetix package-firewall uninstall npm pypi
vulnetix package-firewall uninstall --all
vulnetix package-firewall uninstall --except aur
vulnetix package-firewall uninstall npm --remove-credentials
vulnetix package-firewall uninstall --purge
```

Add `--dry-run` to any of them to see what would be removed. Exactly one of named ecosystems, `--all` or `--except` is required; `--purge` implies `--all`.

## What is removed

| Setup wrote | Uninstall |
|---|---|
| A managed block (`.npmrc`, `pip.conf`, `uv.toml`, Cargo files, `.gemrc`, `.bundle/config`, `.Rprofile`, `hex.env`, `pub.env`, `homebrew.env`, `.yarnrc.yml`) | Strips the block. Deletes the file if nothing else is left. |
| A whole file (`settings.xml`, `NuGet.Config`, Composer and Conan JSON, `pub-tokens.json`, Helm `repositories.yaml`, staged `arch-mirrorlist` and `pacman.conf`) | Restores `<file>.vulnetix.bak` if there is one. Otherwise deletes the file if it still points at the firewall, and leaves it alone if it does not. |
| A merge (`paru.conf`, yay `config.json`) | Restores the backup, or strips the injected keys. |
| Go shell and project env (`GOPROXY`, `GOAUTH`) | Removes the shell rc block and the lines in `.env`, `.envrc`, `Makefile` at the git root. On Windows, clears the user variables. |
| The `~/.netrc` entry | Only with `--remove-credentials` or `--purge`. |

> [!CAREFUL] The credential is shared
> Every ecosystem authenticates with the one `machine packages.vulnetix.com` netrc entry. Removing it while another ecosystem is still configured breaks that ecosystem with `401`. The command prints which ecosystems still point at the firewall when this happens. Use `--purge` to remove everything at once.

Root-owned files you installed by hand (`/etc/pacman.d/vulnetix-mirrorlist`, APT and dnf repository files, `/etc/apk/repositories`, `/etc/docker/daemon.json`) are never touched. Remove them yourself.

## Verify

```bash
vulnetix auth status
```

The **Package Firewall ecosystems** section no longer lists the ecosystems you removed. After `--purge` it lists none.
