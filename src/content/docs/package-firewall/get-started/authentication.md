---
title: Authentication
description: The credentials every ecosystem sends to the Package Firewall, the header forms it accepts, and where the CLI finds and writes them.
order: 3
sources: [package-firewall/internal/auth/basic.go, package-firewall/internal/auth/cache.go, cli/cmd/package_firewall.go, cli/pkg/packagefirewall/config.go]
checked: [package-firewall@333285f, cli@4c8c3b7]
updated: 02 Nov 2026
---

Every ecosystem authenticates with the same pair against the host `packages.vulnetix.com`:

| Field | Value |
|---|---|
| Username | Your organization UUID (`VULNETIX_ORG_ID`) |
| Password | Your API key (`VULNETIX_API_KEY`) |

## Header forms

| Form | Header | Used by |
|---|---|---|
| Basic | `Authorization: Basic base64("<orgUUID>:<apiKey>")` | Almost every client, including URL userinfo and netrc |
| Bearer | `Authorization: Bearer base64("<orgUUID>:<apiKey>")` | Clients that only store a token: Dart `pub`, Terraform, Julia |

Both carry the same payload. A request with neither returns `401` with `WWW-Authenticate: Basic realm="Vulnetix Package Firewall"`.

To build the token or the npm `_auth` value by hand:

```bash
printf '%s:%s' "$VULNETIX_ORG_ID" "$VULNETIX_API_KEY" | base64 -w0
```

On macOS use `base64` without `-w0`.

## Naming the repository

The username may carry a repository after a `+`: `<orgUUID>+owner/name`. The firewall records `owner/name` (lower case, each part 1 to 100 of `a-z 0-9 _ . -`) against each decision so the decision log and the Software Factory can say which repository asked for a package. It grants nothing and is not checked. A malformed claim is dropped, not rejected.

```text
machine packages.vulnetix.com
login 7d3c0b1e-0000-4000-8000-000000000000+acme/payments-api
password YOUR_API_KEY
```

## Where the CLI gets credentials

`vulnetix package-firewall <ecosystem>` resolves credentials in this order:

1. `VULNETIX_API_KEY` and `VULNETIX_ORG_ID` in the environment.
2. `VVD_ORG` and `VVD_SECRET` (SigV4). The CLI exchanges them for a derived API key.
3. `.vulnetix/credentials.json` in the current directory.
4. `~/.vulnetix/credentials.json`.
5. The `machine packages.vulnetix.com` entry in `~/.netrc`.

A direct API key is checked against the VDB API before anything is written. If none is found the command exits 1 with `authentication required` and asks you to run `vulnetix auth login`.

## What the CLI writes

Every ecosystem command writes the shared netrc entry, mode `0600`:

```text
machine packages.vulnetix.com
login YOUR_ORG_UUID
password YOUR_API_KEY
```

It then writes the ecosystem's own config. Most package managers do not read netrc:

| Reads `~/.netrc` | Credentials live in the tool's config |
|---|---|
| Go (`GOAUTH=netrc`), pkgsite-cli, Conda (`requests`) | npm, Yarn Berry, pip, uv, Cargo, RubyGems, Bundler, Hex, pub, Maven, NuGet, Composer, Conan, CRAN, Helm, Homebrew, paru, yay, pacman |

`--proxy-url` changes the host the credentials are written for. `vulnetix auth status` lists which package managers currently point at the firewall and the file that matched.

> [!CAREFUL] One credential, many files
> The netrc entry is shared by every ecosystem, and several configs embed the key in a URL. After you rotate the API key, re-run `vulnetix package-firewall <ecosystem>` for each ecosystem you use. Each command is idempotent and rewrites its files in place.
