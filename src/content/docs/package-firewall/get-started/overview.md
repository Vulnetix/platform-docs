---
title: Package Firewall
nav: Overview
description: What the Package Firewall proxy does, the ecosystems it fronts, which plan each needs, and how each one is enforced.
order: 1
sources: [package-firewall/internal/ecosystem/ecosystem.go, package-firewall/internal/handler/ecosystem_handler.go, cli/pkg/packagefirewall/ecosystem.go, cli/cmd/package_firewall.go, cli/cmd/config.go]
checked: [package-firewall@333285f, cli@4c8c3b7]
updated: 02 Nov 2026
---

The Package Firewall is an authenticating proxy at `https://packages.vulnetix.com`. You point a package manager at it instead of the public registry. For every request it checks your organization's credentials and plan, fetches the document from an upstream mirror, applies your organization's policy and curation lists, and then serves, filters or refuses the response.

Policy is per organization and applies to every ecosystem your plan includes. You configure it in the console at [www.vulnetix.com/resolve/package-firewall](https://www.vulnetix.com/resolve/package-firewall) or with `vulnetix config set package-firewall`.

## Ecosystems

Each ecosystem has a route prefix under `https://packages.vulnetix.com`. Go is served at the root.

| Ecosystem | ID | Proxy URL | Mode | Plan | Cooldown | `vulnetix package-firewall` |
|---|---|---|---|---|---|---|
| [Go modules](/package-firewall/clients/go/) | `go` | `/` | native | Community | yes | `go` |
| [pkg.go.dev API](/package-firewall/clients/go-dev/) | `go-dev` | `/go-dev` | filter | Community | no | `go-dev` |
| [Arch Linux (AUR)](/package-firewall/clients/arch/) | `aur` | `/aur` | filter | Community | yes | `aur` |
| [Arch Linux (pacman)](/package-firewall/clients/arch/) | `arch` | `/arch` | gate | Community | no | `aur` (staged files) |
| [npm](/package-firewall/clients/npm/) | `npm` | `/npm` | filter | Pro | yes | `npm` |
| [PyPI](/package-firewall/clients/pypi/) | `pypi` | `/pypi` | filter | Pro | yes | `pypi` |
| [Cargo](/package-firewall/clients/cargo/) | `cargo` | `/cargo` | filter | Pro | yes | `cargo` |
| [RubyGems](/package-firewall/clients/rubygems/) | `gem` | `/gem` | filter | Pro | yes | `gem` |
| [Hex](/package-firewall/clients/hex/) | `hex` | `/hex` | gate | Pro | no | `hex` |
| [pub.dev](/package-firewall/clients/pub/) | `pub` | `/pub` | filter | Pro | yes | `pub` |
| [Maven and Gradle](/package-firewall/clients/maven/) | `maven` | `/maven` | filter | Pro | no | `maven` |
| [NuGet](/package-firewall/clients/nuget/) | `nuget` | `/nuget` | filter | Pro | yes | `nuget` |
| [Composer](/package-firewall/clients/composer/) | `composer` | `/composer` | filter | Pro | yes | `composer` |
| [Conan](/package-firewall/clients/conan/) | `conan` | `/conan` | gate | Pro | no | `conan` |
| [Conda](/package-firewall/clients/conda/) | `conda` | `/conda` | gate | Pro | no | manual |
| [CRAN](/package-firewall/clients/cran/) | `cran` | `/cran` | gate | Pro | no | `cran` |
| [Julia](/package-firewall/clients/julia/) | `julia` | `/julia` | gate | Pro | no | manual |
| [Homebrew](/package-firewall/clients/homebrew/) | `homebrew`, `homebrew-bottle` | `/homebrew`, `/homebrew-bottle` | filter (API), gate (bottles) | Pro | no | `homebrew` |
| [Docker and OCI](/package-firewall/clients/docker/) | `oci` | `/v2` | filter (tag lists), gate (manifests) | Enterprise | no | manual |
| [Debian and Ubuntu](/package-firewall/clients/debian/) | `debian` | `/debian` | gate | Enterprise | no | manual |
| [RPM](/package-firewall/clients/rpm/) | `rpm` | `/rpm` | gate | Enterprise | no | manual |
| [Alpine](/package-firewall/clients/alpine/) | `alpine` | `/alpine` | gate | Enterprise | no | manual |
| [Helm](/package-firewall/clients/helm/) | `helm` | `/helm` | filter | Enterprise | yes | `helm` |
| [Chef](/package-firewall/clients/chef/) | `chef` | `/chef` | filter | Enterprise | yes | manual |
| [Terraform](/package-firewall/clients/terraform/) | `terraform` | `/terraform` | filter | Enterprise | no | manual |

- **ID** is the value you use for mirrors, curation entries and decision-log filters.
- **Plan**: Community covers every account. Pro covers Pro, Teams and Enterprise. Enterprise covers Enterprise only. A request for an ecosystem outside your plan returns `402`.
- **Cooldown** says whether the [cooldown window](/package-firewall/policy/settings/#cooldown) is enforced for that ecosystem today.
- **manual** means `vulnetix package-firewall <ecosystem>` exits 1 with `automatic <name> configuration is not implemented yet`. The client page gives the configuration to write yourself.

## Filter, gate and native

The mode is fixed per ecosystem so the firewall never breaks a registry's signature checks. You do not choose it.

| Mode | Metadata | Blocked version |
|---|---|---|
| filter | Buffered and rewritten. Blocked and cooldown versions are removed, so the resolver never picks them. | The artifact request for a pinned blocked version returns a block status. |
| gate | Streamed through unchanged, because it is signed, content-addressed or too large to buffer. | The artifact download returns a block status. |
| native | Go's module proxy protocol. Each `@v/<version>` request is checked. | `.info`, `.mod` and `.zip` for that version return a block status. |

Details of the request path are on [How it works](/package-firewall/get-started/how-it-works/).

## Get started

1. Sign in with the CLI: `vulnetix auth login`.
2. Point a package manager at the firewall, for example `vulnetix package-firewall npm`. See [Quickstart](/package-firewall/get-started/quickstart/).
3. Set a policy: `vulnetix config set package-firewall --block-malware true --block-kev true`. See [Policy settings](/package-firewall/policy/settings/).
4. Watch decisions in the [decision log](/package-firewall/operations/decision-log/).

## Platform IaC

The firewall policy and mirrors are set imperatively today with `vulnetix config set package-firewall` and read with `vulnetix config get package-firewall` (see [CLI commands](/package-firewall/reference/commands/)). There is no `PackageFirewall` config kind in `Vulnetix/config-schemas` yet, so `vulnetix config validate` has nothing to check for this product. Declarative config-as-code for the firewall policy and curation lists is planned and described on [Platform IaC](/platform-iac/).
