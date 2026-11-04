---
title: Document identity and deployment labels
nav: Identity and labels
description: How the CLI fills metadata.manufacturer, metadata.tools and metadata.lifecycles, and the deployment label flags and variables stamped into metadata.properties.
order: 1
sources: [cli/internal/scanopts/authorship.go, cli/internal/scanopts/deployment.go, cli/internal/cdx/authorship.go, cli/cmd/cdx.go, cli/cmd/scan.go, cli/cmd/image.go, cli/internal/triage/vex.go]
checked: [cli@v4.17.1]
updated: 04 Nov 2026
---

## Who made the document

| Field | What the CLI writes |
|---|---|
| `metadata.tools.components` | The command that wrote it, at the CLI version: `vulnetix-cdx`, `vulnetix-cbom`, `vulnetix-aibom`, `vulnetix-vex`, `vulnetix-bom-import`, `vulnetix-bom-enrich` |
| `metadata.manufacturer` | The organisation that ran the scan, not Vulnetix. Omitted when nothing resolves it. |
| `metadata.authors`, `metadata.supplier` | Only what you state. VEX documents from `triage` and `jail` name `Vulnetix` as the author. |
| `metadata.lifecycles` | The phases the data was captured at |

### Manufacturer resolution

On `cdx`, `aibom`, `cbom` and the scan family, the first source that answers wins.

| Order | Source |
|---|---|
| 1 | `--bom-manufacturer` |
| 2 | `VULNETIX_BOM_MANUFACTURER` |
| 3 | `metadata.manufacturer` in an [overlay file](/sbom/author/overlay/) |
| 4 | The repository owner the CI provider states (GitHub, GitLab, Azure DevOps, Bitbucket, Jenkins) |
| 5 | The owner in the local git remote |

The Vulnetix organisation id the run authenticated as (`VULNETIX_ORG_ID` or `--org-id`) never names a manufacturer. When a name resolves, it is added as the manufacturer's `bom-ref`, `urn:uuid:<org id>`. `vulnetix image` writes no manufacturer.

Before CLI v4.15.0, `aibom` and `cbom` used only the git owner, and a scan that rewrote a `.vulnetix/sbom.cdx.json` which already had a `metadata` block kept the manufacturer that file had. A rescan now keeps the file's `serialNumber`, adds 1 to its `version`, and records this run's identity. See [Who made the document](/sbom/author/identity/) for every identity member you can set.

### Lifecycle phases

`--lifecycle` takes a comma-separated list from `design`, `pre-build`, `build`, `post-build`, `operations`, `discovery`, `decommission`, and replaces the derived set. Without it, `cdx` derives the phases from what it read:

| Phase | Added when |
|---|---|
| `pre-build` | Manifests were read (not `--no-manifests`) |
| `build` | Installed package trees were read (not `--no-filesystem`) |
| `post-build` | A container rootfs or archive was given, or binary packages were read |
| `discovery` | The AIBOM or CBOM pass ran |
| `operations` | Any deployment label is set |

`cbom` always claims `discovery`. `aibom` claims `design` and `discovery`. VEX documents the CLI writes claim `operations`.

## Deployment labels

These flags are on `cdx`, `bom import`, `upload`, `license` and every scan command (`scan`, `sca`, `sast`, `secrets`, `containers`, `iac`). Cluster and project are separate dimensions: one scan belongs to cluster `prod-eu` and project `payment-service` at once.

| Flag | Answers | Inferred from, first set wins |
|---|---|---|
| `--project` | What it is and who owns it | `VULNETIX_PROJECT`, `CI_PROJECT_NAME` |
| `--cluster` | Where it is deployed | `VULNETIX_CLUSTER`, `CLUSTER_NAME`, `KUBERNETES_CLUSTER_NAME` |
| `--namespace` | Namespace within the cluster | `VULNETIX_NAMESPACE`, `POD_NAMESPACE`, `KUBERNETES_NAMESPACE` |
| `--environment` | Deployment stage, e.g. `production` | `VULNETIX_ENVIRONMENT`, `CI_ENVIRONMENT_NAME`, `ENVIRONMENT_NAME` |
| `--tag key=value` | Any other label. Repeatable. | none |

`--tag` splits on the first `=`, so values may contain `=`. A tag with no `=` or an empty key is dropped.

Nothing is inferred from a branch name. A wrong environment label is worse than none.

The labels are written to `metadata.properties` as `vulnetix:deployment/*`, to `.vulnetix/memory.yaml`, and to the upload envelope, so the platform can answer fleet-wide questions.

```bash
export VULNETIX_CLUSTER=prod-eu VULNETIX_ENVIRONMENT=production
vulnetix cdx --project payment-service --tag team=payments
```
