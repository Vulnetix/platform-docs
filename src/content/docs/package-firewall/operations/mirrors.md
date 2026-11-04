---
title: Upstream mirrors
nav: Mirrors
description: How the Package Firewall chooses an upstream mirror, the defaults per ecosystem, the checks the Resolve Platform runs on a new mirror, and the CLI to manage them.
order: 1
sources: [package-firewall/internal/upstream/mirror.go, package-firewall/internal/handler/deps.go, package-firewall/internal/ecosystem/ecosystem.go, vdb-site/api/internal/handler/package_firewall_mirrors.go, vdb-site/api/internal/handler/package_firewall_probe.go, cli/cmd/config.go]
checked: [package-firewall@333285f, vdb-site@1a06d67, cli@4c8c3b7]
updated: 02 Nov 2026
---

Each ecosystem has an ordered list of upstream mirrors per organization. The firewall fetches from them in ascending `priority` and serves the first `2xx`.

## How a mirror is chosen

| Upstream answer | What the firewall does |
|---|---|
| `2xx` | Serve it (after policy). |
| `404` or `410` | Return it at once. It is a definitive answer; the next mirror is not tried. |
| `401` with a Bearer challenge | Fetch a token from the challenge and retry the same mirror once (OCI registries). |
| Anything else, a connection error, or no answer in 10 seconds | Try the next active mirror. |
| Every mirror failed | `502` with `{"error": "upstream fetch failed", "reason": "..."}`, logged `ERROR`. |

The request path after the ecosystem prefix is appended to the mirror URL unchanged, so a mirror URL must include any path the registry lives under (for example `https://deb.debian.org/debian`).

## Defaults

New organizations get one or more default mirrors per ecosystem. An organization created before an ecosystem existed gets that ecosystem's defaults the first time the proxy loads its config.

| Ecosystem | Default mirrors (priority) |
|---|---|
| `go` | `https://proxy.golang.org` (0), `https://goproxy.io` (1), `https://goproxy.cn` (2) |
| `go-dev` | `https://pkg.go.dev` |
| `npm` | `https://registry.npmjs.org` |
| `pypi` | `https://pypi.org` |
| `cargo` | `https://index.crates.io` |
| `gem` | `https://rubygems.org` |
| `hex` | `https://repo.hex.pm` |
| `pub` | `https://pub.dev` |
| `maven` | `https://repo1.maven.org/maven2` |
| `nuget` | `https://api.nuget.org` |
| `composer` | `https://repo.packagist.org` |
| `conan` | `https://center2.conan.io` |
| `conda` | `https://conda.anaconda.org` |
| `cran` | `https://cran.r-project.org` |
| `julia` | `https://pkg.julialang.org` |
| `oci` | `https://registry-1.docker.io` |
| `debian` | `https://deb.debian.org` (needs replacing, see [Debian](/package-firewall/clients/debian/)) |
| `rpm` | `https://dl.fedoraproject.org` |
| `alpine` | `https://dl-cdn.alpinelinux.org` |
| `helm` | `https://evgkrsk.github.io/nxs-universal-chart` (one chart repo, see [Helm](/package-firewall/clients/helm/)) |
| `chef` | `https://supermarket.chef.io` |
| `terraform` | `https://registry.terraform.io` |
| `aur` | `https://aur.archlinux.org` |
| `arch` | `https://geo.mirror.pkgbuild.com` |
| `homebrew` | `https://formulae.brew.sh` |
| `homebrew-bottle` | `https://ghcr.io` |

## Manage mirrors from the CLI

```bash
# Add a mirror; priority defaults to max(priority)+1 for the ecosystem
vulnetix config set package-firewall npm https://npm.internal.example.com

# Add or move a mirror to a set priority (lower is tried first)
vulnetix config set package-firewall npm https://npm.internal.example.com --priority 0

# Turn a mirror off or on, matched by ecosystem and URL
vulnetix config set package-firewall npm https://registry.npmjs.org --disable
vulnetix config set package-firewall npm https://registry.npmjs.org --enable

# List every mirror with the policy
vulnetix config get package-firewall
```

Deleting a mirror is done in the Resolve Platform's **Mirrors** tab.

## Checks when you add a mirror in the Resolve Platform

| Check | Refused when |
|---|---|
| Scheme | not HTTPS |
| Duplicate | the URL is already in the ecosystem's list |
| Loop | the host is a Vulnetix firewall host |
| Address | the host is a literal private or reserved IP |

The Resolve Platform then probes the mirror from Vulnetix servers with a request the registry should answer:

| Ecosystem | Probe path appended to the mirror URL |
|---|---|
| `npm` | `lodash` |
| `pypi` | `simple/requests/` |
| `go` | `golang.org/x/text/@v/list` |
| `cargo` | `config.json` |
| `gem` | `info/rake` |
| `maven` | `junit/junit/maven-metadata.xml` |
| `composer` | `packages.json` |
| `oci` | `v2/` |
| `helm` | `index.yaml` |
| others | the mirror URL itself |

A mirror only your private network can reach fails the probe and can still be saved. The **Mirrors** tab also shows each ecosystem's upstream errors over the last 14 days.
