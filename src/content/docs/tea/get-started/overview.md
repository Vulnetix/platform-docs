---
title: Transparency Exchange (TEA)
nav: Overview
description: Vulnetix runs an OWASP Transparency Exchange API server for SBOMs, VEX, attestations and download links, and vulnetix tea reads and publishes to TEA servers.
order: 1
sources: [vdb-site/api/internal/handler/tea_routes.go, vdb-site/api/internal/handler/tea_v1_routes.go, vdb-site/api/main.go, saas/prisma/models/tea-publisher.prisma, cli/cmd/tea.go, cli/pkg/tea/client.go, tea-spec/README.md]
checked: [vdb-site@1a06d67, saas@50cedf37, cli@4c8c3b71c, tea-spec@6c93819]
updated: 04 Nov 2026
---

TEA is for software producers who must hand customers, regulators or the public the SBOMs, VEX and attestations for each release, and for consumers who want to fetch that evidence from a standard API, starting from one identifier. Uploading an SBOM with [`vulnetix upload`](/cli/commands/upload/) or a scan puts it in your own organisation for your own findings. Publishing to TEA makes it available to people outside your organisation, release by release, under an access policy you set.

The Transparency Exchange API (TEA) is an OWASP specification for finding a release's transparency data (SBOMs, VEX, attestations) and where the release can be obtained, starting from one identifier and following DNS. Vulnetix serves a conformant TEA server, and publishes to it on your behalf.

| You want to | Read |
|---|---|
| Read a release and publish my own, step by step | [TEA quickstart](/tea/get-started/quickstart/) |
| Read what a TEA server publishes, with curl | [Discovery](/tea/consume/discovery/), then [Walk the object graph](/tea/consume/walk-the-graph/) |
| Know which root to use and whether you need a credential | [Catalogues and authentication](/tea/consume/catalogues-and-auth/) |
| Read TEA from the command line | [Reading with the CLI](/tea/cli/reading/) |
| Publish a release from CI in one step | [tea release](/tea/cli/release/) |
| Publish objects one at a time, add download links, share | [Publishing with the CLI](/tea/cli/publishing/) |
| Understand products, components, collections and visibility | [Publisher object model](/tea/publisher/object-model/), [Access policies](/tea/publisher/access-policies/) |
| Call the publication API directly | [Publication HTTP API](/tea/publisher/http-api/) |
| Know how the 1.0.0 and 0.4.0 responses differ | [TEA 1.0.0 and 0.4.0](/tea/consume/versions/) |
| Check how the server scores on the conformance suite | [Conformance](/tea/reference/conformance/) |

## Roots

| Root | Serves |
|---|---|
| `https://www.vulnetix.com/tea/v1.0.0` | TEA 1.0.0 consumption API, exactly as specified |
| `https://www.vulnetix.com/tea/v1` | The stable alias: 1.0.0, plus the publication operations |
| `https://www.vulnetix.com/tea/v0.4.0` | TEA 0.4.0 consumption API, plus the publication operations |
| `https://www.vulnetix.com/tea/public/v1.0.0`, `/tea/public/v1` | The open source catalogue at 1.0.0. Read only. |
| `https://www.vulnetix.com/tea/public/v0.4.0` | The open source catalogue at 0.4.0. Read only. |
| `https://vulnetix.com/.well-known/tea` | The discovery document |

## The object graph

```text
product ──releases──▶ product release ──components[]──▶ component release ──▶ distributions
                            │                                  │
                            └──▶ collection (versioned)         └──▶ collection (versioned)
                                    └──▶ artifacts (SBOM, VEX, attestation, ...)
```

- A **product** is what somebody buys or installs. A **component** is a thing that ships. A product release lists the component releases it is made of.
- A **collection** is the versioned list of artifacts for one release. Its UUID is the release's UUID; a new version is a new list.
- An **artifact** is evidence about the release. A **distribution** is the release itself as somebody installs it: a binary with checksums, or a channel such as Homebrew. Distributions hang off component releases only.

## Where the data comes from

| Source | What appears | Visibility |
|---|---|---|
| Your scan history | A product per repository you scanned, with releases and the SBOM, VEX and findings documents each scan produced. Derived on read; nothing is stored. | Follows the repository: `public` if CI last reported it public, otherwise `private` |
| Objects you publish | Products, components, releases, collections, artifacts and distributions you create with `vulnetix tea` or the API | Your [access policy](/tea/publisher/access-policies/), `private` until you change it |

Both answer through the same API, so a consumer cannot tell which half an object came from.

## Resolve Platform

The TEA Explorer and publishing workspace are at `https://www.vulnetix.com/resolve/tea` and `https://www.vulnetix.com/resolve/tea/publish`. Publishing requires the Pro plan or above.

## GitHub Actions

Publish a release from a workflow with the [tea-release GitHub Action](/tea/github-actions/tea-release/).

## Platform IaC

Products, components, collections, access policies and publication targets are kinds: [`TeaProduct`](/platform-iac/kinds/tea-product/), [`TeaComponent`](/platform-iac/kinds/tea-component/), [`TeaCollection`](/platform-iac/kinds/tea-collection/), [`TeaAccessPolicy`](/platform-iac/kinds/tea-access-policy/) and [`TeaPublicationTarget`](/platform-iac/kinds/tea-publication-target/). Releases and artifacts stay data that CI publishes with `vulnetix tea` or the API: an object that already has published releases is let go on delete, never deleted.

When [Drift protection](/platform-iac/guides/drift-protection/) is on, a change made in the Resolve Platform or through a legacy API to a TEA product, component, collection or access policy through the publisher API that is managed as code (by Terraform or a repository) is refused with HTTP 409 `managed_by_platform_iac`. Change it where it is declared, or ask an owner to turn Drift protection off.
