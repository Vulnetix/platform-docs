---
title: Homebrew
description: Route Homebrew's formula API and bottle downloads through the Package Firewall with environment variables.
order: 16
sources: [cli/pkg/packagefirewall/config.go, package-firewall/internal/ecosystem/homebrew/homebrew.go, package-firewall/internal/ecosystem/homebrew_bottle/homebrew_bottle.go, package-firewall/internal/ecosystem/ecosystem.go, package-firewall/internal/fw/fw.go]
checked: [cli@4c8c3b7, package-firewall@333285f]
updated: 03 Nov 2026
---

| | |
|---|---|
| API URL | `https://packages.vulnetix.com/homebrew/api` |
| Bottle URL | `https://packages.vulnetix.com/homebrew-bottle` |
| Ecosystem IDs | `homebrew` (API), `homebrew-bottle` (bottles) |
| Plan | Add-on |
| Mode | filter for `formula.json`, `cask.json` and per-formula JSON; gate for bottle manifests on ghcr.io |
| Cooldown | no |
| Default mirrors | `https://formulae.brew.sh` (API), `https://ghcr.io` (bottles) |

## Automatic setup

```bash
vulnetix package-firewall homebrew
source ~/.config/vulnetix/package-firewall/homebrew.env
```

`~/.config/vulnetix/package-firewall/homebrew.env`:

```bash
export HOMEBREW_API_DOMAIN="https://YOUR_ORG_UUID:YOUR_API_KEY@packages.vulnetix.com/homebrew/api"
export HOMEBREW_ARTIFACT_DOMAIN="https://YOUR_ORG_UUID:YOUR_API_KEY@packages.vulnetix.com/homebrew-bottle"
export HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK="1"
```

Add the `source` line to `~/.zshrc` or `~/.bashrc`. Homebrew runs curl, which sends the URL credentials as Basic auth.

> [!CAREFUL] Keep NO_FALLBACK set
> Without `HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK=1`, Homebrew retries a refused bottle from `ghcr.io` directly, and the bottle gate does nothing.

## Use and verify

```bash
brew config | grep -E 'HOMEBREW_(API|ARTIFACT)_DOMAIN'
brew update
brew install wget
```

## Reading a block

Homebrew downloads bottles with `curl --fail`, which drops both the body and the headers, so a block shows as `curl: (22) The requested URL returned error: 423`. Re-run with verbose curl to see the reason:

```console
$ HOMEBREW_CURL_VERBOSE=1 brew upgrade node
< HTTP/2 423
< x-vulnetix-firewall: blocked
< x-vulnetix-firewall-reason: malware
< x-vulnetix-firewall-message: package is flagged as malicious
```

A malware hit inside the whole-catalogue `formula.json` is recorded as a `WARN` and filtered entry by entry rather than refusing the whole index.
