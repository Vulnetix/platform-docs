---
title: Julia
description: Point Julia's Pkg at the Package Firewall's Pkg server and authenticate it with a bearer token.
order: 13
sources: [package-firewall/internal/ecosystem/julia/julia.go, package-firewall/internal/auth/basic.go, package-firewall/internal/ecosystem/ecosystem.go, cli/pkg/packagefirewall/ecosystem.go]
checked: [package-firewall@333285f, cli@4c8c3b7]
updated: 02 Nov 2026
---

| | |
|---|---|
| Pkg server | `https://packages.vulnetix.com/julia` |
| Ecosystem ID | `julia` |
| Plan | Pro |
| Mode | gate: `/registries` is streamed unchanged; `/registry`, `/package` and `/artifact` tarballs are checked |
| Cooldown | no |
| Default mirror | `https://pkg.julialang.org` |
| Automatic setup | none: `vulnetix package-firewall julia` exits 1 |

## Configuration

Set the server before Julia starts:

```bash
export JULIA_PKG_SERVER="https://packages.vulnetix.com/julia"
```

Pkg sends the `access_token` from the server's `auth.toml` as a bearer token, and the firewall accepts a bearer token of `base64("<orgUUID>:<apiKey>")`. Write it to the depot's server directory, which is named after the server host:

```bash
mkdir -p ~/.julia/servers/packages.vulnetix.com
TOKEN=$(printf '%s:%s' "$VULNETIX_ORG_ID" "$VULNETIX_API_KEY" | base64 -w0)
printf 'access_token = "%s"\n' "$TOKEN" > ~/.julia/servers/packages.vulnetix.com/auth.toml
chmod 600 ~/.julia/servers/packages.vulnetix.com/auth.toml
```

This file was derived from the proxy's accepted header forms. Pkg has no CLI writer for it yet, so confirm with the commands below before relying on it in CI.

## Use and verify

```julia
using Pkg
Pkg.Registry.update()
Pkg.add("Example")
```

## Curation keys

Julia requests name packages by UUID and versions by git tree hash, so the firewall evaluates and logs them that way. An allow or deny entry for Julia uses the package UUID (for example `7876af07-990d-54b4-ab0e-23690620f79a` for Example.jl), not the package name. Generic artifacts are keyed as `_artifact`.
