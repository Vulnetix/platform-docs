---
title: CLI commands
description: Flags, behaviour and exit codes for vulnetix package-firewall and vulnetix config set and get package-firewall.
order: 3
sources: [cli/cmd/package_firewall.go, cli/pkg/packagefirewall/ecosystem.go, cli/cmd/config.go, cli/cmd/exit_codes.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

## vulnetix package-firewall

```text
vulnetix package-firewall <ecosystem> [--proxy-url URL] [--base-url URL] [--dry-run]
vulnetix package-firewall uninstall [ecosystem...] [flags]
```

| Subcommand | Configures | Writer |
|---|---|---|
| `go` | Go modules | yes |
| `go-dev` | pkgsite-cli (netrc only) | yes |
| `npm` | npm, pnpm, Bun, Yarn | yes |
| `pypi` | pip, uv | yes |
| `cargo` | Cargo | yes |
| `gem` | RubyGems, Bundler | yes |
| `hex` | Hex | yes |
| `pub` | Dart pub | yes |
| `maven` | Maven | yes |
| `nuget` | NuGet | yes |
| `composer` | Composer | yes |
| `conan` | Conan 2 | yes |
| `cran` | R | yes |
| `helm` | Helm | yes |
| `aur` | paru, yay, staged pacman files | yes |
| `homebrew` | Homebrew | yes |
| `conda`, `julia`, `docker`, `debian`, `rpm`, `alpine`, `chef`, `terraform` | none | no: exits 1 with `automatic <name> configuration is not implemented yet` |

| Flag | Default | Meaning |
|---|---|---|
| `--proxy-url` | `https://packages.vulnetix.com` | Firewall base URL. Must be absolute. Its host is used for the netrc entry. |
| `--base-url` | VDB API default | VDB API used to verify the API key or derive one from SigV4 credentials. |
| `--dry-run` | `false` | Print what would change; write nothing. |

Each run writes the `~/.netrc` entry, then the ecosystem's files (see each [client page](/package-firewall/#ecosystems)). Files are written three ways:

| Write | Files | Re-run | Uninstall |
|---|---|---|---|
| Managed block between `# Vulnetix Package Firewall` and `# End Vulnetix Package Firewall` | `.npmrc`, `pip.conf`, `uv.toml`, Cargo files, `.gemrc`, `.bundle/config`, `.Rprofile`, `*.env`, `.yarnrc.yml`, shell rc | block replaced in place | block removed; file deleted if empty |
| Whole file | `settings.xml`, `NuGet.Config`, Composer and Conan JSON, `pub-tokens.json`, Helm `repositories.yaml`, staged Arch files | file replaced; an existing file is first copied to `<file>.vulnetix.bak` | backup restored, or the file deleted if it still points at the firewall |
| Merge | `paru.conf`, yay `config.json` | keys set, rest kept; backup written | backup restored, or the keys stripped |

## vulnetix package-firewall uninstall

Reverses the setup. Needs no authentication.

| Flag | Meaning |
|---|---|
| `[ecosystem...]` | Ecosystems to unconfigure |
| `--all` | Every supported ecosystem |
| `--except <csv>` | Every ecosystem except these |
| `--remove-credentials` | Also remove the shared `machine packages.vulnetix.com` netrc entry |
| `--purge` | `--all` plus `--remove-credentials` |
| `--proxy-url` | Host to detect and strip, default `https://packages.vulnetix.com` |
| `--dry-run` | Preview |

Exactly one of positional ecosystems, `--all` or `--except` is required. Details on [Uninstall](/package-firewall/reference/uninstall/).

## vulnetix config set package-firewall

```text
vulnetix config set package-firewall [flags]
vulnetix config set package-firewall <ecosystem> <url> [--priority N] [--enable | --disable]
```

Without arguments it updates the policy. Only the flags you pass change.

| Flag | Value | API field |
|---|---|---|
| `--cvss-threshold` | `0` to `10` | `cvssThreshold` |
| `--epss-threshold` | `0` to `1` | `epssThreshold` |
| `--cess-threshold` | `0` to `10` | `cessThreshold` |
| `--block-malware` | `true`, `false` | `blockMalware` |
| `--block-eol` | `true`, `false` | `blockEol` |
| `--block-kev` | `true`, `false` | `blockKev` |
| `--block-weaponized-exploits` | `true`, `false` | `blockWeaponized` |
| `--block-active-exploits` | `true`, `false` | `blockActive` |
| `--block-poc-exploits` | `true`, `false` | `blockPoc` |
| `--block-bad-actors` | `true`, `false` | `blockBadActors` |
| `--cooldown-days` | integer `>= 0` | `cooldownDays` |
| `--version-lag` | integer `>= 0` | `versionLag` |
| `--base-url` | URL | |
| `-o`, `--output` | `pretty`, `json` | |

With `<ecosystem> <url>` it adds or updates a [mirror](/package-firewall/operations/mirrors/):

| Flag | Meaning |
|---|---|
| `--priority N` | Order within the ecosystem, lower first. Omitted: `max(priority)+1`. |
| `--enable`, `--disable` | Set `isActive` on the mirror matched by ecosystem and URL. |

The enforcement mode, per-ecosystem modes, review settings and curation lists are console only.

## vulnetix config get package-firewall

```bash
vulnetix config get package-firewall
vulnetix config get package-firewall -o json
```

Prints the policy and every mirror. `-o json` returns `{"config": {...}, "mirrors": [...]}`. An organization with no stored policy prints `No policy configured` and the proxy applies the open defaults.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Written, already current, or `--dry-run` finished |
| `1` | Any error: no credentials (`authentication required`), the key failed verification (`authentication test failed`), `--proxy-url must be an absolute URL`, no writer for the ecosystem, or a file could not be written |
