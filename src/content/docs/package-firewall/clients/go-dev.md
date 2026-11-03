---
title: pkg.go.dev API
nav: pkg.go.dev API
description: Route pkgsite-cli's pkg.go.dev API calls through the Package Firewall so search and package metadata respect your policy.
order: 2
sources: [cli/cmd/package_firewall.go, package-firewall/internal/ecosystem/godev/godev.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [cli@4c8c3b7, package-firewall@333285f]
updated: 03 Nov 2026
---

| | |
|---|---|
| API base URL | `https://packages.vulnetix.com/go-dev/v1beta` |
| Ecosystem ID | `go-dev` |
| Plan | Free |
| Mode | filter; a single package or module document can be blocked whole |
| Cooldown | no |
| Default mirror | `https://pkg.go.dev` |

This proxies the pkg.go.dev API used by `pkgsite-cli`. It does not download modules; for that configure [Go modules](/package-firewall/clients/go/).

## Automatic setup

```bash
vulnetix package-firewall go-dev
```

This writes only the `~/.netrc` entry. `pkgsite-cli` has no config file, so the command prints how to pass the API base.

## Use

```bash
alias pkgsite-cli='pkgsite-cli -api https://packages.vulnetix.com/go-dev/v1beta'
pkgsite-cli search uuid
```

or per call:

```bash
pkgsite-cli -api https://packages.vulnetix.com/go-dev/v1beta package github.com/google/go-cmp/cmp
```

`pkgsite-cli` sends the netrc credentials as Basic auth.

## Remove

There is no config file to remove. Drop the shared credential with `vulnetix package-firewall uninstall go-dev --remove-credentials`, which also breaks every other ecosystem that relies on it.
