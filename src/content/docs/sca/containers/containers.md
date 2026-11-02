---
title: vulnetix containers
description: Container file rules, the ELF binary pass, rootfs and image archive inspection, and what is recorded for Safe Harbour container curation.
order: 1
sources: [cli/cmd/specialized_scans.go, cli/cmd/binary_scan.go, cli/cmd/container_sources.go, cli/cmd/scan.go, cli/internal/scan/detector.go, cli/internal/sast/rules/vnx-docker-001.rego, cli/internal/sast/rules/vnx-docker-008.rego]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

`vulnetix containers` runs three passes over `--path`:

1. **Rules.** Built-in and external Rego rules of kind `oci` against Dockerfiles, Compose files, Kubernetes manifests and Helm charts. Referenced images become `pkg:oci/...` components in the SBOM, each marked with its registry type and whether the registry is private.
2. **Binaries.** Every ELF file is hashed and checked for hardening weaknesses, and packages compiled into binaries are read. Directories and tar archives given with `--container-rootfs` and `--container-archive` are inspected the same way, with their OS package databases.
3. **Sources.** When you are signed in, each Dockerfile's `FROM` lines and package install lines are recorded for container curation.

It is equivalent to:

```bash
vulnetix scan --enable-containers --no-licenses --no-sast --no-sca --no-secrets --no-iac
```

followed by the binary and source passes. The rule pass alone decides the exit code; the other two report errors to stderr and never change it.

## Files read

| File | Read for |
|---|---|
| `Dockerfile`, `Containerfile`, `Gockerfile`, `Pkgfile`, `Dockerfile.*`, `*.dockerfile`, `*.containerfile` | `FROM` images and `RUN`-installed OS packages |
| `compose.yaml`, `docker-compose.yml`, `podman-compose.yml`, other Compose-shaped YAML | Service `image:` |
| YAML with top-level `apiVersion` and `kind` | Pod-template images in Pod, Deployment, StatefulSet, DaemonSet, Job and CronJob, including init and ephemeral containers |
| `Chart.yaml` | Chart `dependencies` (`pkg:helm/...`) and images in the sibling `values.yaml` |

Gitignored files are skipped unless `--include-ignored` or `--containers-include-ignored` is passed.

## Built-in rules

| Rule | Severity | Checks |
|---|---|---|
| VNX-DOCKER-001 | medium | The final stage runs as root |
| VNX-DOCKER-002 | medium | Base image not pinned (`:latest` or no tag) |
| VNX-DOCKER-004 | medium | `ADD` downloads a remote source without a checksum |
| VNX-DOCKER-005 | critical | Privileged container in a Dockerfile, Compose file or Kubernetes manifest |
| VNX-DOCKER-006 | low | `ADD` used instead of `COPY` for local files |
| VNX-DOCKER-007 | low | Service image without a `HEALTHCHECK` |
| VNX-DOCKER-008 | low | OS package install without version pinning |

VNX-DOCKER-003 (secret in a Dockerfile `ARG` or `ENV`, high) is a `secrets` rule and runs under `vulnetix secrets` and `vulnetix scan`, not here. `--list-default-rules` prints the full table. External packs are added with `--rule org/repo`; see [SAST rules](/sast/).

## Binary pass

For every ELF file it records hashes, the ELF header, hardening weaknesses (no PIE, no RELRO, no stack canary, executable stack, setuid), capabilities, extracted strings and EXIF, the CIRCL hashlookup match and the local malware corpus verdict. When signed in, the inventory is sent to `/v2/cli.analyze` and attached to the same snapshot as the rule pass.

Packages compiled into binaries (Go build info, Rust `cargo auditable` lists, JVM archive coordinates) are printed and merged into `.vulnetix/sbom.cdx.json` as real purls, where they are matched like any other package. Existing components, findings and VEX in the SBOM are kept. Where a package database exists, each binary is attributed to the package that installed it.

The inventory is a record, not a verdict. Malware found here is raised as a finding by [`vulnetix malscan`](/malware/). A CIRCL package name with no ecosystem is not matched against advisories.

`--dry-run` skips the binary pass because it would upload.

## Rootfs and archives

```bash
vulnetix containers --container-rootfs ./rootfs
vulnetix containers --container-archive ./image.tar
```

Both read installed OS packages from `dpkg`, `apk` and `pacman` databases and scan the ELF files, without pulling images or needing a Docker or Podman daemon. Both flags are repeatable. To inventory a built image by reference, layer by layer, use [`vulnetix image`](/sca/containers/image/).

## Recorded for curation

When signed in, every Dockerfile under `--path` (up to 500 files; `.git`, `node_modules`, `vendor`, `.vulnetix` and `.terraform` are skipped) is recorded with:

- each stage's `FROM` as written and with `ARG` defaults applied, its `AS` alias, `--platform`, and which stage is final. A `FROM` that depends on an `ARG` with no default is recorded as unresolved;
- each install line in `RUN` (`apk add`, `apt-get install`, `dnf`, `yum` or `microdnf install`, `pacman -S`, `zypper install`) with its line number and pinned versions.

The migration guide in Safe Harbour (`/resolve/safe-harbour?lens=containers`) uses these to name the line to change.

## Flags

| Flag | Default | Effect |
|---|---|---|
| `--path`, `--depth`, `--exclude` | `.`, `3`, none | As on `sca` |
| `-o, --output` | none | `json-sarif` to stdout, or a `.sarif` or `.cdx.json` file |
| `--fail-on <severity>` | none | Exit 1 on a rule finding at or above the severity (`--severity` is the legacy spelling) |
| `--container-rootfs <dir>` | none | Inspect an unpacked root filesystem. Repeatable. |
| `--container-archive <tar>` | none | Inspect a Docker, OCI or rootfs tar. Repeatable. |
| `--no-binary-package-analysis` | `false` | Skip packages in binaries; the ELF weakness scan still runs |
| `--containers-include-ignored` | `false` | Read gitignored files |
| `--rule`, `-R` | none | External rule repo `org/repo`. Repeatable. |
| `--rule-registry` | `https://github.com` | Registry for `--rule` |
| `--disable-default-rules` | `false` | Built-in rules off |
| `--list-default-rules` | `false` | Print the built-in rules and exit |
| `--rule-id` | none | Run one rule |
| `--snippet-context` | `-1` | Source lines around each SARIF finding: `-1` dynamic, `0` none |
| `--no-cache` | `false` | Re-evaluate every file |
| `--dry-run` | `false` | List what would be scanned, replay stored results, no API calls |

The display flags (`--view`, `--filter`, `--show`, `--hide`, `-q`) work as on [`sca`](/sca/scanning/output/).

## Output

The report is grouped by image: each Dockerfile (named by its last `FROM`) and each Compose service or Kubernetes workload is one card listing failed checks, worst first, with a one-line fix for built-in rules. Findings from different packs on the same line with the same weakness fold into one problem; `-v` folds nothing. Test files are listed under IN TESTS; `--show tests` ranks them with the rest. A BINARIES summary follows the report.

| Path | Content |
|---|---|
| `.vulnetix/containers.sarif` | SARIF 2.1.0 for the rule pass |
| `.vulnetix/sbom.cdx.json` | Image and binary packages |
| `.vulnetix/memory.yaml` | Scan state |

Exit codes: `0` no gate breached, `1` a gate breached or an error.

## Not detected

- Build-arg (`$VAR`) and Helm-templated (`{{ ... }}`) image references. Placeholders are dropped, never guessed.
- Packages installed by fetched scripts (`curl | sh`).
- A malformed image digest, which is dropped rather than reported as a version.

No finding is not proof of no container risk.
