---
title: Go modules
nav: Go
description: Point the go command at the Package Firewall's module proxy with GOPROXY and GOAUTH, and what each @v request is checked for.
order: 1
sources: [cli/cmd/package_firewall.go, cli/internal/managedfile/shell.go, package-firewall/internal/handler/proxy.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [cli@4c8c3b7, package-firewall@77cd1a5]
updated: 03 Nov 2026
---

| | |
|---|---|
| Proxy URL | `https://packages.vulnetix.com` (served at the root) |
| Ecosystem ID | `go` |
| Plan | Add-on |
| Mode | native module proxy |
| Cooldown | yes, on `@v/<version>.info` |
| Default mirrors | `https://proxy.golang.org` (0), `https://goproxy.io` (1), `https://goproxy.cn` (2) |

## Automatic setup

```bash
vulnetix package-firewall go
```

| Writes | Content |
|---|---|
| `~/.netrc` | `machine packages.vulnetix.com` entry |
| Shell rc, chosen from `$SHELL` | A `# Vulnetix Package Firewall` block setting `GOPROXY` and `GOAUTH` |
| `.env`, `.envrc`, `Makefile` at the git root | `GOPROXY` and `GOAUTH` lines, only if the file already exists |
| Windows | The user environment variables `GOPROXY` and `GOAUTH` |

The shell rc is `~/.bashrc` (bash), `~/.zshrc` (zsh), `~/.config/fish/config.fish` (fish), `~/.tcshrc` or `~/.cshrc` (csh family), otherwise `~/.profile`.

```bash
# Vulnetix Package Firewall
export GOPROXY="https://packages.vulnetix.com"
export GOAUTH="netrc"
# End Vulnetix Package Firewall
```

fish gets `set -gx GOPROXY https://packages.vulnetix.com`. Open a new shell after setup.

## Manual configuration

```bash
go env -w GOPROXY=https://packages.vulnetix.com GOAUTH=netrc
```

and the netrc entry from [Authentication](/package-firewall/get-started/authentication/). Go reads `~/.netrc` for proxy credentials by default. `GOAUTH` (Go 1.24 and later) makes that explicit; a `GOAUTH` set to something else, such as `off`, sends no credentials and gets `401`.

## Use and verify

```bash
go env GOPROXY GOAUTH
go clean -modcache
go get rsc.io/quote@v1.5.2
```

## What is checked

| Request | Checked |
|---|---|
| `@v/<version>.info` | deny list, allowlist-only, policy, then cooldown against the `Time` in the upstream `.info` |
| `@v/<version>.mod`, `@v/<version>.zip` | deny list, allowlist-only, policy |
| `@v/list`, `@latest` | deny list and allowlist-only only. The version list is not filtered. |

Because the list is not filtered, `go get example.com/mod@latest` fails with the block status when the newest version is blocked or inside the cooldown. Pin an older version, wait out the cooldown, or add an [allow entry](/package-firewall/curation/lists/). On Go any allow entry waives the cooldown, including one for a single version; a namespace entry such as `github.com/acme/*` covers every module under it.

## Notes

- Private modules that must not go through the proxy: set `GOPRIVATE` (or `GONOPROXY` and `GONOSUMDB`) to their path patterns.
- The checksum database (`sum.golang.org`) is not proxied. Go still verifies module hashes against it.
- Remove the setup with `vulnetix package-firewall uninstall go`.
