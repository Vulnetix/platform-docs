---
title: vulnetix cdx
description: Generate one local CycloneDX SBOM from manifests, installed packages, container files, pipelines, scripts and compiled binaries, with no network calls.
order: 1
sources: [cli/cmd/cdx.go, cli/internal/scanopts/deployment.go, cli/internal/scanopts/authorship.go, cli/internal/cdx/authorship.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

`vulnetix cdx` writes one CycloneDX JSON document for a directory. It makes no network calls (except Fulcio and Rekor with `--sign`), no VDB lookups and no uploads, updates no memory, runs no quality gate, pulls no image and needs no Docker or Podman daemon. `vulnetix sbom` is an alias.

```bash
vulnetix cdx [path] [flags]
```

## What it reads

| Source | Skipped by |
|---|---|
| Package manifests and lock files | `--no-manifests` |
| Installed package trees: `node_modules`, Python virtualenvs, the Go module cache, Composer `vendor`, Ruby gems, NuGet packages | `--no-filesystem` |
| Dockerfile, Containerfile, compose, Kubernetes and Helm package installs and image references | `--no-containerfiles` |
| CI/CD pipeline install commands, and GitHub Actions `uses:` pins | `--no-ci` |
| Shell scripts, Makefiles and task recipes | `--no-shell` |
| Container root filesystems and image archives (`dpkg`, `apk`, `pacman`, `rpm` databases) | only read when `--container-rootfs` or `--container-archive` is given |
| Packages compiled into binaries: Go build info, Rust `cargo auditable`, JVM archives | `--no-binary-analysis`, or `--no-binary-packages` to keep file components only |
| AI components (the `aibom` passes) | `--no-aibom` |
| Cryptographic components (the `cbom` passes) | `--no-cbom` |
| Signature, attestation and transparency-log sidecars | `--no-signatures` |
| Licences of discovered packages | `--no-licenses` |

The exact files each discovery pass matches are listed in [Discovery coverage](/sbom/generate/coverage/).

Paths matched by `.gitignore` are skipped unless you pass `--cdx-include-ignored`.

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `[path]`, `--path` | string | `.` | Directory to scan. The positional argument wins over `--path`. |
| `--depth` | int | `25` | Maximum recursion depth for file discovery |
| `--exclude` | string, repeatable | | Glob of paths to skip during manifest discovery |
| `--ignore` | string, repeatable | | Glob of paths to skip during local inventory discovery |
| `-o`, `--output` | string | `pretty` | Terminal output: `pretty` (alias `table`), `json`, `cyclonedx-json`. The file is written whichever you choose. |
| `--output-file` | string | `<path>/.vulnetix/sbom.cdx.json` | Where the CycloneDX document is written |
| `--spec-version` | string | `1.7` | CycloneDX spec version: `1.6` or `1.7` |
| `--no-manifests` | bool | `false` | Skip manifest and lock file parsing |
| `--no-filesystem` | bool | `false` | Skip installed-package discovery |
| `--no-containerfiles` | bool | `false` | Skip Dockerfile, compose, Kubernetes and Helm discovery |
| `--no-ci` | bool | `false` | Skip CI/CD pipeline discovery, GitHub Actions included |
| `--no-shell` | bool | `false` | Skip shell script, Makefile and task recipe discovery |
| `--no-binary-analysis` | bool | `false` | Skip binary analysis: no file components, no embedded packages |
| `--no-binary-packages` | bool | `false` | Analyse binaries but omit the packages embedded in them |
| `--no-licenses` | bool | `false` | Skip licence detection |
| `--no-aibom` | bool | `false` | Omit AI components |
| `--no-cbom` | bool | `false` | Omit cryptographic components |
| `--no-signatures` | bool | `false` | Skip signature, attestation and transparency-log sidecars |
| `--include-home` | bool | `false` | Also read user-scoped package caches |
| `--include-system` | bool | `false` | Inventory the whole system: OS package databases (`dpkg`, `rpm`, `apk`, `pacman`), machine-wide language installs, every account's caches and the system binary directories |
| `--system-root` | string | `/` | The filesystem `--include-system` describes: a mounted volume, an unpacked image, or `/proc/<pid>/root` |
| `--cdx-include-ignored` | bool | `false` | Include files matched by `.gitignore`. `--sbom-include-ignored` is a hidden alias. |
| `--container-rootfs` | string, repeatable | | Unpacked container root filesystem to inspect |
| `--container-archive` | string, repeatable | | Docker, OCI or rootfs tar archive to inspect |
| `--aibom-catalog` | string | | AIBOM catalog to merge over the built-in one |
| `--cbom-catalog` | string | | CBOM catalog to merge over the built-in one |
| `--no-builtin-aibom-catalog` | bool | `false` | Use only `--aibom-catalog` |
| `--no-builtin-cbom-catalog` | bool | `false` | Use only `--cbom-catalog` |
| `--sign` | bool | `false` | Sign the document with this machine's OIDC identity. See [Signing documents](/attestation/sign/signing-documents/). |
| `--project`, `--cluster`, `--namespace`, `--environment`, `--tag` | string | inferred | Deployment labels. See [Document identity and deployment labels](/sbom/reference/document-metadata/). |
| `--bom-manufacturer` | string | repository owner | Organisation that created the BOM |
| `--lifecycle` | string | derived | Comma-separated lifecycle phases, overriding the derived set |

Distro packages found with `--include-system` carry the `distro=`, `arch=`, `epoch=` and `upstream=` purl qualifiers, which is what distro security advisories match on.

## Examples

```bash
# Write .vulnetix/sbom.cdx.json and print a summary
vulnetix cdx

# Print the CycloneDX JSON to stdout as well
vulnetix cdx -o cyclonedx-json

# An unpacked container filesystem
vulnetix cdx --container-rootfs ./rootfs

# A saved image tar, without Docker
vulnetix cdx --container-archive ./image.tar --output-file build/image.cdx.json

# Declared and installed packages only, no inference from pipelines or scripts
vulnetix cdx --no-ci --no-shell --no-containerfiles

# CycloneDX 1.6 for a consumer that does not read 1.7
vulnetix cdx --spec-version 1.6
```

## What each component records

| Field | Where it lands |
|---|---|
| Package identity | `name`, `version`, `purl`, `bom-ref` |
| Ecosystem and scope | `vulnetix:ecosystem`, `vulnetix:scope`, `vulnetix:environment`, CycloneDX `scope` |
| Direct or transitive | `vulnetix:direct`, plus `urn:project` to direct-dependency edges |
| Provenance | `vulnetix:source-file`, `vulnetix:source-type`, `vulnetix:installed-path`, `vulnetix:version-spec` |
| Registry provenance | `vulnetix:oci:registryType`, `vulnetix:oci:private` |
| Integrity | CycloneDX `hashes`, `vulnetix:integrity`, `vulnetix:gosum-h1` |
| Licences | CycloneDX `licenses`: an SPDX id when recognised, otherwise a name or expression |
| Discovery evidence | `vulnetix:sbom/evidence-count`, `vulnetix:sbom/evidence` (method, confidence, locator) |
| Signatures | `vulnetix:signature/*`, `vulnetix:tlog/*` |
| Dependency graph | CycloneDX `dependencies`, from lock file and installed-tree edges |
| Repository and host | git properties on `metadata.component`, host properties in `metadata.properties` |

### `vulnetix:source-type`

| Value | Found in |
|---|---|
| `manifest` | A manifest or lock file |
| `installed` | An installed package tree |
| `container-db` | An OS package database inside a container root filesystem |
| `command` | A package-manager install command in a Dockerfile, CI file or script |
| `binary` | A compiled artefact |

### Evidence confidence

| Confidence | When |
|---|---|
| `high` | A declared or installed package, or metadata the build tool recorded in a binary |
| `medium` | A pinned install command, or JVM archive manifest attributes |
| `low` | An unpinned install command, or a version read from a file name |

A component inferred from a command is graded as an inference: the command may be conditional or may never run.

## Existing findings are kept

The default output path is the same file `vulnetix scan` and `vulnetix sca` use as scan memory. When that file already carries `vulnerabilities`, including VEX analysis, `cdx` copies those entries into the new document. A component one of them references that this run did not find again is kept and marked `vulnetix:sbom/carried-over`. An inventory run never deletes finding history.

## Signature sidecars

Next to each discovered manifest, package and binary, `cdx` looks for `.sig`, `.asc`, `.minisig`, `.sigstore`, `.bundle`, `.bundle.json`, `.intoto.jsonl`, `.att`, `.attestation` and `.attestation.json` files. When a Sigstore bundle carries Rekor entries, the offline inclusion metadata is added as `vulnetix:tlog/*` properties. `cdx` does not query Rekor.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | The document was written |
| `1` | Any error, including an invalid flag value |
