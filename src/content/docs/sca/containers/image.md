---
title: vulnetix image
description: Inventory a container image layer by layer from a registry, local engine or saved archive, and record it so Safe Harbour can compare its base image.
order: 2
sources: [cli/cmd/image.go, cli/cmd/image_registry.go, cli/internal/imagesrc/tenantauth.go, vdb-site/docs/scan-registries.md, cli/internal/imagesrc/imagesrc.go, cli/internal/imagesrc/flatten.go]
checked: [cli@v4.6.0, vdb-site@9cf42d7, website@ad775f3]
updated: 03 Nov 2026
---

```bash
vulnetix image <reference | archive.tar> [flags]
```

```bash
vulnetix image node:20.11.1-alpine3.19
vulnetix image ghcr.io/acme/api:2026.10.27 --platform linux/arm64
vulnetix image ./api.tar --output api.cdx.json --no-upload
```

The command reads one image, inventories its packages layer by layer, and records it. Safe Harbour's container lens (`/resolve/safe-harbour?lens=containers`, formerly Container curation) then compares the base image it was built from with equivalent bases on other registries (Chainguard, Docker Hardened Images, Red Hat UBI, distroless and others) and writes a migration guide.

## Flags

| Flag | Default | Effect |
|---|---|---|
| `--source` | `auto` | Where to read the image (below) |
| `--platform` | this machine's architecture on linux | `os/arch[/variant]` for a multi-platform image |
| `-o, --output` | none | Also write the image's CycloneDX SBOM to this file |
| `--max-size-mb` | `8192` | Refuse to unpack more than this many MiB |
| `--no-upload` | `false` | Inventory locally; record nothing |
| `--no-language-packages` | `false` | Skip npm, pip, gem, Go, NuGet, Composer and other language packages |

| `--source` | Reads |
|---|---|
| `auto` | An archive when the argument is a file; else a local Docker or Podman store that holds the reference; else the registry |
| `registry` | The registry, with your Docker credentials and credential helpers (`docker login`, `credHelpers` for ECR, GCR and others) |
| `docker`, `podman` | The local engine, exported with its `save` command |
| `archive` | A tarball from `docker save` or `podman save` |

Your Docker credentials stay on your machine. Only the inventory is sent.

## Private registries

When you are signed in, `vulnetix image` first tries the organization's own [registry connection](/organization/integrations/private-registries/) for the registry and repository it is about to read. This is in the CLI release after v4.5.0: v4.5.0 and earlier use your Docker credentials only.

It asks Vulnetix for a pull token with `POST /v1/scan-registries/oci-token`, naming the registry and the repository. Vulnetix answers with the registry's own short-lived token for that one repository, which the registry expires within minutes and the CLI refreshes during a long pull. The stored login never reaches your machine.

| Answer | What the CLI does |
|---|---|
| A token | Pulls with it |
| `403 no_connection`: no enabled `oci` connection serves this host and repository, the plan has no registry credentials, or you are not an owner, admin or member | Silently uses your Docker credentials |
| `409 no_ephemeral_credential`: the registry has no token service (it asks for basic authentication) or the connection stores a bearer token | Prints a note and uses your `docker login` |
| Any other failure, such as being offline | Prints a note and uses your Docker credentials |

The feature can add access and never removes it. The request names the registry and the repository, so `--no-upload` and community runs, which have no account, do not make it. It is not verified against a real third-party registry; the CLI is tested against a fake registry with a token service.

## What is recorded

| Item | Detail |
|---|---|
| Identity | Platform manifest digest, the manifest list digest it was reached through, platform, reference |
| Layer chain | The config's `diff_ids`. An image built from a base starts with the base's layers, which is how the base is recognised. |
| OS packages | `dpkg`, `apk`, `rpm` and `pacman` databases are read after every layer that wrote one, so each package carries the layer that first installed it |
| Language packages | Installed npm, pip, gem, Go, NuGet and Composer packages |
| Traits | Distribution release (purl `distro=` qualifier, for example `alpine-3.19`), libc, shell present, package manager, default user, runtime and version from the environment (`NODE_VERSION`, `PYTHON_VERSION` and so on) |
| Source | The repository in the `org.opencontainers.image.source` label |

The server resolves the base image and links cloud workloads (EKS, ECS, ECR, Lambda, EMR) that your cloud scans found running the same digest.

## Messages

| Message | Meaning |
|---|---|
| `Recorded. Built FROM <ref> (matched by <method>).` | Base identified |
| `Recorded. Its base image is not one Vulnetix has crawled yet.` | Recorded, base unknown |
| `Inventory checked; your plan does not record images.` | The plan does not include image recording |
| `No credentials: nothing recorded.` | Not signed in. Exit `0`. |
| `Running in N place(s) found by your cloud scans.` | Linked workloads |

Exit `1` on a read, unpack or upload error, otherwise `0`. There are no gates.

## Safety

The image is unpacked into a temporary directory the way a runtime applies layers: whiteouts delete lower-layer files and opaque whiteouts empty a directory. Paths that climb out of the root, hard links pointing outside it, and writes through a symlink resolving outside it are refused. Device nodes are skipped. The directory is removed when the command ends.

## Related

- [`vulnetix containers`](/sca/containers/containers/) records each Dockerfile's `FROM` and install lines for the migration guide.
- [`vulnetix cdx`](/sbom/) builds an SBOM of a directory, rootfs or archive.
