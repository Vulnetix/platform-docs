---
title: SARIF reference
nav: SARIF
description: What the SARIF files the Vulnetix CLI writes carry for GitHub code scanning, the category per scanner, security-severity, CWE tags, the line hash fingerprint, and the always-written sca.sarif and license.sarif.
order: 5
sources: [cli/internal/sast/github.go, cli/internal/sast/linehash.go, cli/internal/github/codescanning.go, cli/docs/github-publishing.md]
checked: [cli@3e6fd831d]
updated: 03 Nov 2026
---

Every SARIF 2.1.0 file the CLI writes carries what GitHub code scanning reads beyond the schema. Added in CLI v3.160.0. The file is the same whether you upload it with `github/codeql-action/upload-sarif` or with [`vulnetix gha publish code-scanning`](/cli/commands/gha-publish/#code-scanning).

| Field | Value | Why |
|---|---|---|
| Rule `properties.security-severity` | critical `9.5`, high `8.0`, medium `5.5`, low `2.0`. SCA uses the advisory's CVSS score. Informational findings get none. | Sorts the alert into Critical (over 9.0), High (7.0 to 8.9), Medium (4.0 to 6.9) or Low (0.1 to 3.9). Without it a result shows only as error, warning or note. |
| Rule `properties.tags` | Adds `security` and one `external/cwe/cwe-N` per CWE | Makes the alert a security alert, filterable by CWE |
| Run `automationDetails.id` | `vulnetix/<kind>/` | The category. One per kind, so one kind's upload never closes another kind's alerts. |
| Result `partialFingerprints.primaryLocationLineHash` | codeql-action's rolling line hash | Keeps an alert the same alert when its line moves |

The line hash is a port of `hash()` in github/codeql-action `src/fingerprints.ts`, tested against codeql-action's own vectors, so the value equals the one codeql-action's upload step would compute.

## Categories

| Category | Written by |
|---|---|
| `vulnetix/sast/` | `sast`, and the SAST rules of `scan` |
| `vulnetix/secrets/` | `secrets`, and the secret rules of `scan` |
| `vulnetix/iac/` | `iac` |
| `vulnetix/containers/` | `containers` |
| `vulnetix/sca/` | `sca` and `scan` |
| `vulnetix/license/` | `license` |

`scan` writes every rule kind into one `.vulnetix/sast.sarif`; the file is split into one log per kind before it is published. Container rules are internally kind `oci`; their category is `containers`.

## sca.sarif and license.sarif

| File | Written by |
|---|---|
| `.vulnetix/sca.sarif` | every scan that runs SCA, clean or not |
| `.vulnetix/license.sarif` | `vulnetix license` |

Both are written even when clean, so a publish closes alerts that were fixed. A result sits on the manifest line that declares the package. Its fingerprint hashes the ecosystem, package, advisory (or licence rule) and manifest, never the version. A version bump that leaves the advisory open is the same alert; a bump that fixes it closes the alert.

The other SARIF files (`sast.sarif`, `containers.sarif`, `malscan.sarif`) are written as before; see [Files](/cli/reference/files/).

## Limits

Code scanning accepts at most 25,000 results per run and 10 MB gzipped per upload. The publish keeps the most severe 25,000. See [Limits](/cli/commands/gha-publish/#limits).
