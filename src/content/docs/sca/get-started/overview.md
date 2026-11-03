---
title: Software composition analysis
nav: Overview
description: What vulnetix sca finds, the commands in the SCA family, what runs locally and what is sent to Vulnetix.
order: 1
sources: [cli/cmd/specialized_scans.go, cli/cmd/fix.go, cli/cmd/image.go, cli/cmd/license.go, cli/cmd/scan.go, cli/cmd/cli_sca.go, cli/cmd/quality_gate_enforce.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

`vulnetix sca` reads the package manifests and lockfiles in a directory, resolves every dependency to an exact version, and asks the Vulnetix VDB which known vulnerabilities, exploits, malware reports and end-of-life dates apply. It prints the findings, writes a CycloneDX SBOM, and exits non-zero when a gate you set is breached.

It is `vulnetix scan` with every other scanner switched off:

```bash
vulnetix scan --evaluate-sca --no-licenses --no-sast --no-containers --no-secrets --no-iac
```

## The commands

| Command | What it does | Page |
|---|---|---|
| `vulnetix sca` | Dependency vulnerabilities, malware, EOL, freshness, reachability | [Ecosystems](/sca/scanning/ecosystems/), [Gates](/sca/gates/fail-on/) |
| `vulnetix fix` (alias `autofix`) | Moves vulnerable dependencies to a Safe Harbour version with your package manager, then rescans | [vulnetix fix](/sca/autofix/fix/) |
| `vulnetix sca --sca-autofix` | The same fix workflow inside an SCA or full scan | [vulnetix fix](/sca/autofix/fix/) |
| `vulnetix containers` | Dockerfile, Compose, Kubernetes and Helm rules, plus an ELF binary pass and rootfs or archive inspection | [Containers](/sca/containers/containers/) |
| `vulnetix image <ref>` | Inventories one built image layer by layer for Container curation | [Images](/sca/containers/image/) |
| `vulnetix license` | Licence resolution, conflicts, allow lists, policy and exceptions | [Licences](/sca/license/license/) |
| `vulnetix vdb vuln <id>` | Looks up one vulnerability, with tree-sitter reachability against your tree | [Reachability](/sca/reachability/overview/) |

## What runs where

| Step | Where |
|---|---|
| Finding manifests, parsing them, resolving ranges from lockfiles or installed packages | Your machine |
| Vulnerability, exploit, malware, EOL and Safe Harbour lookups | VDB API, `POST /v2/cli.sca`, in batches of packages (purls) |
| Reachability: running the tree-sitter queries the VDB returns | Your machine |
| Licence detection | Your machine first, then the API, package registries, deps.dev and GitHub for anything still unknown |
| Gate evaluation and the exit code | Your machine, after the org quality gate is applied |
| Recording the scan as a snapshot in the console | VDB API, only when you are signed in to an organisation |

Credentials are optional. With none configured the CLI uses the shared community credentials: lookups work, but nothing is persisted and no org quality gate applies. Sign in with `vulnetix auth login` (see [Authentication](/cli/authentication/overview/)) to record scans and apply your organisation's policy.

## Files a scan writes

| Path | Written by | Content |
|---|---|---|
| `.vulnetix/sbom.cdx.json` | `sca`, `scan`, `fix`, `license`, `containers` | CycloneDX SBOM with components, vulnerabilities, licence findings and VEX |
| `.vulnetix/memory.yaml` | every scan unless `--disable-memory` | Finding state, triage decisions, reachability evidence |
| `.vulnetix/containers.sarif` | `containers` | SARIF 2.1.0 for container rules |
| `.vulnetix/vex-autofix.json` | `fix`, `--sca-autofix` | OpenVEX for findings a fix resolved |
| `.vulnetix/vex-risk-accepted.json` | `fix`, `--sca-autofix` | OpenVEX for findings with no safe version |

Paths are relative to the git root of `--path` when it is a repository.

## Where to go next

- [Quickstart](/sca/get-started/quickstart/): a first scan, a CI gate, a fix.
- [Supported ecosystems](/sca/scanning/ecosystems/): every manifest and lockfile.
- [Gates and exit codes](/sca/gates/fail-on/): how `--fail-on` and the org [quality gate](/quality-gates/) decide the exit code.
- [Resolve Platform findings](/sca/console/resolve/): what an uploaded scan becomes in Resolve.

## GitHub Actions

Run it in a workflow with the [sca](/sca/github-actions/sca/), [containers](/sca/github-actions/containers/) and [license](/sca/github-actions/license/) GitHub Actions. They publish `sca.sarif` and `license.sarif` to code scanning, upload the files as an artifact and attest them.

## Platform IaC

SCA has no config kind of its own. Its thresholds come from the organisation's quality gate, the [`QualityGate`](/platform-iac/kinds/quality-gate/) kind. The licence files that `vulnetix license` reads are the [`LicensePolicy`](/platform-iac/kinds/license-policy/) and [`LicenseExceptions`](/platform-iac/kinds/license-exceptions/) kinds; the server stores neither, so they stay in the repository. Findings you have decided do not matter are [`Suppression`](/platform-iac/kinds/suppression/) documents or a [`VexSource`](/platform-iac/kinds/vex-source/). See the [kind catalogue](/platform-iac/kinds/catalogue/).
