---
title: Document identity and deployment labels
nav: Identity and labels
description: How the CLI fills metadata.manufacturer, metadata.tools and metadata.lifecycles in the documents it writes, and the deployment label flags and environment variables stamped into metadata.properties.
order: 1
sources: [cli/internal/scanopts/authorship.go, cli/internal/scanopts/deployment.go, cli/internal/cdx/authorship.go, cli/cmd/cdx.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

## Who made the document

| Field | What the CLI writes |
|---|---|
| `metadata.tools.components` | The command that wrote it, at the CLI version: `vulnetix-cdx`, `vulnetix-cbom`, `vulnetix-aibom`, `vulnetix-vex`, `vulnetix-bom-import`, `vulnetix-bom-enrich` |
| `metadata.manufacturer` | The organisation that ran the scan, not Vulnetix. Omitted when nothing resolves it. |
| `metadata.lifecycles` | The phases the data was captured at |

### Manufacturer resolution

The first source that answers wins.

| Order | Source |
|---|---|
| 1 | `--bom-manufacturer` |
| 2 | `VULNETIX_BOM_MANUFACTURER` |
| 3 | The repository owner the CI provider states (GitHub, GitLab, Azure DevOps, Bitbucket, Jenkins) |
| 4 | The owner in the local git remote |
| 5 | The Vulnetix organisation id the run authenticated as (`VULNETIX_ORG_ID` or `--org-id`), as an identifier rather than a name |

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
