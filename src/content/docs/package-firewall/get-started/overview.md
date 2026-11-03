---
title: Package Firewall
nav: Overview
description: What the Package Firewall proxy does, the ecosystems it fronts, which are free and which need the add-on, and how each one is enforced.
order: 1
sources: [package-firewall/internal/ecosystem/ecosystem.go, package-firewall/internal/handler/ecosystem_handler.go, cli/pkg/packagefirewall/ecosystem.go, cli/cmd/package_firewall.go, cli/cmd/config.go]
checked: [package-firewall@333285f, cli@4c8c3b7]
updated: 03 Nov 2026
---

The Package Firewall is an authenticating proxy at `https://packages.vulnetix.com`. You point a package manager at it instead of the public registry. For every request it checks your organization's credentials and add-on, fetches the document from an upstream mirror, applies your organization's policy and curation lists, and then serves, filters or refuses the response.

Policy is per organization and applies to every ecosystem your organization can use. You configure it in the Resolve Platform at [www.vulnetix.com/resolve/package-firewall](https://www.vulnetix.com/resolve/package-firewall) or with `vulnetix config set package-firewall`.

## Ecosystems

Each ecosystem has a route prefix under `https://packages.vulnetix.com`. Go is served at the root.

| Ecosystem | ID | Proxy URL | Mode | Plan | Cooldown | `vulnetix package-firewall` |
|---|---|---|---|---|---|---|
| [Go modules](/package-firewall/clients/go/) | `go` | `/` | native | Add-on | yes | `go` |
| [pkg.go.dev API](/package-firewall/clients/go-dev/) | `go-dev` | `/go-dev` | filter | Free | no | `go-dev` |
| [Arch Linux (AUR)](/package-firewall/clients/arch/) | `aur` | `/aur` | filter | Free | yes | `aur` |
| [Arch Linux (pacman)](/package-firewall/clients/arch/) | `arch` | `/arch` | gate | Add-on | no | `aur` (staged files) |
| [npm](/package-firewall/clients/npm/) | `npm` | `/npm` | filter | Add-on | yes | `npm` |
| [PyPI](/package-firewall/clients/pypi/) | `pypi` | `/pypi` | filter | Add-on | yes | `pypi` |
| [Cargo](/package-firewall/clients/cargo/) | `cargo` | `/cargo` | filter | Add-on | yes | `cargo` |
| [RubyGems](/package-firewall/clients/rubygems/) | `gem` | `/gem` | filter | Add-on | yes | `gem` |
| [Hex](/package-firewall/clients/hex/) | `hex` | `/hex` | gate | Add-on | no | `hex` |
| [pub.dev](/package-firewall/clients/pub/) | `pub` | `/pub` | filter | Add-on | yes | `pub` |
| [Maven and Gradle](/package-firewall/clients/maven/) | `maven` | `/maven` | filter | Add-on | no | `maven` |
| [NuGet](/package-firewall/clients/nuget/) | `nuget` | `/nuget` | filter | Add-on | yes | `nuget` |
| [Composer](/package-firewall/clients/composer/) | `composer` | `/composer` | filter | Add-on | yes | `composer` |
| [Conan](/package-firewall/clients/conan/) | `conan` | `/conan` | gate | Add-on | no | `conan` |
| [Conda](/package-firewall/clients/conda/) | `conda` | `/conda` | gate | Add-on | no | manual |
| [CRAN](/package-firewall/clients/cran/) | `cran` | `/cran` | gate | Add-on | no | `cran` |
| [Julia](/package-firewall/clients/julia/) | `julia` | `/julia` | gate | Add-on | no | manual |
| [Homebrew](/package-firewall/clients/homebrew/) | `homebrew`, `homebrew-bottle` | `/homebrew`, `/homebrew-bottle` | filter (API), gate (bottles) | Add-on | no | `homebrew` |
| [Docker and OCI](/package-firewall/clients/docker/) | `oci` | `/v2` | filter (tag lists), gate (manifests) | Add-on | no | manual |
| [Debian and Ubuntu](/package-firewall/clients/debian/) | `debian` | `/debian` | gate | Add-on | no | manual |
| [RPM](/package-firewall/clients/rpm/) | `rpm` | `/rpm` | gate | Add-on | no | manual |
| [Alpine](/package-firewall/clients/alpine/) | `alpine` | `/alpine` | gate | Add-on | no | manual |
| [Helm](/package-firewall/clients/helm/) | `helm` | `/helm` | filter | Add-on | yes | `helm` |
| [Chef](/package-firewall/clients/chef/) | `chef` | `/chef` | filter | Add-on | yes | manual |
| [Terraform](/package-firewall/clients/terraform/) | `terraform` | `/terraform` | filter | Add-on | no | manual |

- **ID** is the value you use for mirrors, curation entries and decision-log filters.
- **Plan**: Free means every account can use it on any plan: the pkg.go.dev API (`go-dev`) and the AUR (`aur`). Add-on means the organization has the Package Firewall add-on ($125 a month, bought in the Resolve Platform under [Billing](https://www.vulnetix.com/resolve/billing#addons)) or is on the Enterprise plan, which includes every add-on. That covers every other ecosystem, including the Go module proxy at `/`, Arch Linux (pacman), Homebrew and its bottles. The Resolve Platform plan (Community, Pro, Business or Enterprise) no longer decides which ecosystems you can use. A request for an add-on ecosystem without the add-on returns `402`; see [Block responses](/package-firewall/reference/responses/#plan).
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

The firewall policy and its mirrors are the [`PackageFirewallPolicy`](/platform-iac/kinds/package-firewall-policy/) kind, and the allow and deny lists are [`PackageList`](/platform-iac/kinds/package-list/) documents of purls. A list entry can take a `when` over the package's signals (malware, CVSS, EPSS, KEV, age and more); see [CEL rule expressions](/platform-iac/reference/cel/). `vulnetix config set package-firewall` and `config get package-firewall` are the imperative forms (see [CLI commands](/package-firewall/reference/commands/)). Both kinds have Terraform resources: [Terraform and OpenTofu](/platform-iac/terraform/).

When [Drift protection](/platform-iac/guides/drift-protection/) is on, a change made in the console or through a legacy API to the package firewall policy or its package lists that is managed as code (by Terraform or a repository) is refused with HTTP 409 `managed_by_platform_iac`. Change it where it is declared, or ask an admin to turn Drift protection off.
