---
title: Hex (Elixir and Erlang)
nav: Hex
description: Point mix and rebar3 at the Package Firewall's Hex mirror with HEX_MIRROR.
order: 14
sources: [cli/pkg/packagefirewall/config.go, cli/cmd/package_firewall.go, package-firewall/internal/ecosystem/hex/hex.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [cli@4c8c3b7, package-firewall@333285f]
updated: 03 Nov 2026
---

| | |
|---|---|
| Mirror URL | `https://packages.vulnetix.com/hex` |
| Ecosystem ID | `hex` |
| Plan | Add-on |
| Mode | gate: the signed registry is streamed unchanged; `tarballs/*.tar` and `docs/*.tar` are checked |
| Cooldown | no (gate mode) |
| Default mirror | `https://repo.hex.pm` |

## Automatic setup

```bash
vulnetix package-firewall hex
source ~/.config/vulnetix/package-firewall/hex.env
```

`~/.config/vulnetix/package-firewall/hex.env`:

```bash
export HEX_MIRROR="https://YOUR_ORG_UUID:YOUR_API_KEY@packages.vulnetix.com/hex"
```

Hex has no separate auth file for a mirror and honours credentials in the mirror URL. Add the `source` line to your shell profile, or set `HEX_MIRROR` as a CI secret.

## Use and verify

```bash
echo "$HEX_MIRROR" | sed 's#//[^@]*@#//***@#'
mix deps.get
```

## Notes

- Because the registry is signed and served unchanged, resolution can pick a blocked version; the fetch of that tarball then fails with the block status. Pin an allowed version in `mix.exs` and run `mix deps.unlock <dep>`.
