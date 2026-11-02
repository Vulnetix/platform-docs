---
title: Troubleshooting
description: Diagnose Package Firewall status codes, credentials that are not sent, packages that resolve around the proxy, and caches that hide a change.
order: 2
sources: [package-firewall/internal/handler/ecosystem_handler.go, package-firewall/internal/upstream/mirror.go, package-firewall/internal/handler/deps.go, cli/cmd/package_firewall.go, cli/pkg/packagefirewall/config.go]
checked: [package-firewall@333285f, cli@4c8c3b7]
updated: 02 Nov 2026
---

## First checks

```bash
vulnetix auth status
AUTH=$(printf '%s:%s' "$VULNETIX_ORG_ID" "$VULNETIX_API_KEY" | base64 -w0)
curl -s -o /dev/null -D - -H "Authorization: Basic $AUTH" https://packages.vulnetix.com/npm/lodash
```

`vulnetix auth status` lists the package managers that point at `packages.vulnetix.com` and the file that matched. The `curl` shows the status and every `X-Vulnetix-Firewall-*` header for one request; swap the path for the ecosystem you are debugging.

## By status

| Status | Likely cause | Fix |
|---|---|---|
| `401` | The tool is not sending credentials, or they are wrong. | Re-run `vulnetix package-firewall <ecosystem>`. Check the tool reads the file the CLI wrote (table below). Check `~/.netrc` is mode `600`. |
| `402` | The ecosystem needs a higher plan. | See the plan column on the [overview](/package-firewall/#ecosystems). |
| `403` | Deny list, or `allowlist_only` with no entry. | Read `X-Vulnetix-Firewall-Reason`. Ask for an allow entry or a deny removal. |
| `404` on everything | The mirror URL is missing a path (Debian), or the path is not one the adapter knows. | See [Mirrors](/package-firewall/operations/mirrors/) and the client page. |
| `422`, `423`, `425`, `426`, `428` | A policy block. | See [Block responses](/package-firewall/reference/responses/). |
| `502` | No mirror answered within 10 seconds, or every mirror errored. | Check the **Mirrors** tab's upstream errors. Add a closer mirror. |
| `503` | The identity backend is unreachable. | Retry; it is not your credentials. |

A policy change not taking effect: the proxy caches org config for 60 seconds (15 seconds with a deny list).

## Credentials not sent

| Tool | Reads credentials from |
|---|---|
| Go, pkgsite-cli, conda | `~/.netrc` |
| npm, pnpm, Bun, Yarn v1 | `_auth` in `~/.npmrc` |
| Yarn Berry | `npmAuthIdent` in `~/.yarnrc.yml` |
| pip, uv, CRAN, Hex, Homebrew, paru, yay, pacman, apk, RubyGems | userinfo in the URL |
| Bundler | `BUNDLE_PACKAGES__VULNETIX__COM` in `~/.bundle/config` |
| Cargo | `~/.cargo/credentials.toml` |
| pub | `pub-tokens.json` (bearer) |
| Maven | `<server>` in `~/.m2/settings.xml` |
| Gradle | `credentials` in the build, not `settings.xml` |
| NuGet | `packageSourceCredentials` |
| Composer | `~/.composer/auth.json` |
| Conan | `~/.conan2/credentials.json` |
| Helm | `repositories.yaml` |
| APT | `/etc/apt/auth.conf.d/*.conf` |
| dnf, yum | `username`, `password` in the `.repo` file |
| Docker | `docker login packages.vulnetix.com` |
| Terraform, Julia | a bearer token |

## Packages that never reach the firewall

The decision log shows nothing for a tool you configured. Common causes:

- A project-level config overrides the user one: a repo `.npmrc` with `@scope:registry=`, a repo `nuget.config` that adds `nuget.org`, `PIP_INDEX_URL` or `--extra-index-url`, a project `.Rprofile`.
- The tool reads another path on your OS: Composer with `~/.config/composer`, Helm and Dart on macOS.
- Bundler without the mirror setting.
- Gradle, which ignores `settings.xml`.
- A Docker daemon `registry-mirrors` entry that fell back to Docker Hub.
- Homebrew without `HOMEBREW_ARTIFACT_DOMAIN_NO_FALLBACK=1`.
- An env-file ecosystem (Hex, pub, Homebrew) whose `.env` file was never sourced in that shell or CI job.

## Caches

Clear the tool's cache after pointing it at the firewall, or it resolves from what it already has:

```bash
npm cache clean --force
pip cache purge
go clean -modcache
rm -rf ~/.cargo/registry/index
composer clear-cache
dotnet nuget locals all --clear
conda clean -i
sudo dnf clean all
```

## Lockfiles

A lockfile that pins a blocked version fails at that package's download with the block status, even in filtered ecosystems. Update the pin. A lockfile pinned to a version inside the cooldown is not blocked outside Go (see [Cooldown](/package-firewall/policy/settings/#cooldown)).

## Corporate proxies

If your network needs an HTTP proxy to reach `packages.vulnetix.com`, configure it for each tool as you would for the public registry. See [Corporate proxy](/organization/network/corporate-proxy/).

## Start over

Every `vulnetix package-firewall <ecosystem>` run is idempotent. To preview or back out:

```bash
vulnetix package-firewall npm --dry-run
vulnetix package-firewall uninstall npm --dry-run
vulnetix package-firewall uninstall --purge
```

See [Uninstall](/package-firewall/reference/uninstall/).
