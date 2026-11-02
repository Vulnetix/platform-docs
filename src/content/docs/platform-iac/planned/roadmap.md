---
title: "Platform IaC: what is shipped and what is not"
nav: Roadmap
description: What of Platform IaC is available now, what is not yet, and where each piece is documented. The config engine, the kinds, the CLI commands, the Terraform provider and the modules, with their gaps.
order: 1
sources: ["config-schemas/README.md", "vdb-site/docs/platform-iac-engine.md", "cli/go.mod", "cli/docs/platform-iac.md", "terraform-provider-vulnetix/README.md", "website/src/pages/resolve/quality-gate.vue"]
checked: ["config-schemas@v1.11.1", "vdb-site@7b71e88", "cli@v3.167.0", "terraform-provider-vulnetix@169ce16"]
updated: 03 Nov 2026
---

This page is the honest list. The rest of the segment documents what works; this says where the edges are.

## Available

| Piece | State | Where |
|---|---|---|
| Schemas | Every kind in `config-schemas` (the [catalogue](/platform-iac/kinds/catalogue/) says which release), each with Minimal and Advanced examples and an `x-vulnetix` annotation. Signed release assets. | [Catalogue](/platform-iac/kinds/catalogue/), [Schema releases](/platform-iac/schemas/releases/) |
| Config engine | Plan, apply, export and per-object routes. Every kind is served except `LicensePolicy` and `LicenseExceptions`, which are validate only. Managers, prune, drift, `valueFrom` secrets, status phases and `vmt_` management tokens. | [Engine](/platform-iac/reference/engine/), [Config API](/platform-iac/reference/config-api/) |
| CEL | One evaluator, five contexts, four functions, and cost limits. Evaluated in the VDB API (jail), the Software Factory gate, the ranking ladder, the suppression engine, the package firewall, the AI firewall and detection rule feed publishing. | [CEL rule expressions](/platform-iac/reference/cel/) |
| VEX sources | `VexSource` reads OpenVEX and CycloneDX VEX from TEA, S3, git and URLs. | [VEX documents as suppression rules](/platform-iac/guides/vex-sources/) |
| CLI | `vulnetix config validate`, `kinds`, `schema`, `plan`, `apply` and `export`, and the imperative `set` and `get`. | [Validate](/platform-iac/cli/validate/), [Plan](/platform-iac/cli/plan/), [Apply](/platform-iac/cli/apply/), [Export](/platform-iac/cli/export/) |
| GitHub Actions | `config-plan` on pull requests and `config-apply` on the default branch. | [config-plan](/platform-iac/github-actions/config-plan/), [config-apply](/platform-iac/github-actions/config-apply/) |
| GitOps in Software Factory | The `config-apply` workflow node plans on a push to a config repository's default branch and applies after approval. | [`FactoryWorkflow`](/platform-iac/kinds/factory-workflow/#gitops-from-a-repository) |
| Terraform and OpenTofu provider | Public source; one generated resource per kind the engine stores, six data sources. | [Terraform and OpenTofu](/platform-iac/terraform/) |
| AWS modules | `aws-onboarding` and `aws-siem-shipping`. | [Modules](/platform-iac/terraform/modules/) |
| SSVC decisions | [`SsvcPolicy`](/platform-iac/kinds/ssvc-policy/) configures how the CISA SSVC decision (Track, Track*, Attend or Act) is made for a finding. It needs a database migration, until which tenants decide with the default policy. | [`SsvcPolicy`](/platform-iac/kinds/ssvc-policy/) |
| Asset labels | `labels`, `owner` and `criticality` on [`RepositorySettings`](/platform-iac/kinds/repository-settings/#asset-labels-owner-and-criticality), set on the Repositories page or as code, and usable in rules as `finding` variables. They need a database migration, until which they read as empty. | [CEL rule expressions](/platform-iac/reference/cel/) |
| Private registries | [`RegistryConnection`](/platform-iac/kinds/registry-connection/) keeps the credential a scan uses to read your own npm, PyPI, Maven or OCI registry, with the secret in the vault. It needs a database migration, until which plan refuses it. | [Private registries for scans](/organization/integrations/private-registries/) |
| Compliance targets | [`ComplianceTarget`](/platform-iac/kinds/compliance-target/) runs a compliance report on a cadence, or measures a SLSA level, NIST SSDF practices or a cryptography policy over your CBOM. It needs a database migration, until which plan refuses it. | [Compliance targets](/compliance/get-started/targets/) |
| Download as code | On the console's quality gate and factory settings pages, in YAML, HCL and bash, in minimal and advanced forms. | [`QualityGate`](/platform-iac/kinds/quality-gate/), [`FactorySettings`](/platform-iac/kinds/factory-settings/) |

## Not yet

| Gap | Detail |
|---|---|
| The CLI is behind the schemas | The latest CLI release embeds `config-schemas` v1.3.0. `vulnetix config validate`, `plan` and `apply` refuse a kind added in a later release as unknown before sending it, though the engine serves it. Each kind's page says from which CLI release it is known. Use the config API or Terraform until a CLI release embeds the newer schemas. |
| CLI v4 | The major release is upcoming. It changes the module path, makes the remaining imperative commands aliases of the engine, and has `plan` and `apply` read the well-known files. See [Migrating from v3 to v4](/cli/get-started/migrating-to-v4/). |
| Registry publishing | The provider and both modules have no release, and the Terraform and OpenTofu registries do not list them. See [Terraform and OpenTofu](/platform-iac/terraform/#registries). |
| Download as code elsewhere | Other console pages that map to a kind do not have it yet. |
| CEL in the CLI | The CLI evaluates no expression: `vulnetix jail` and `vulnetix scan --jail` ask the VDB API, and a suppression's `when` is evaluated on the server. The `event` context has no field in any kind, so [`FactoryTrigger`](/platform-iac/kinds/factory-trigger/) conditions are typed. |
| VEX | `trust.requireSignature`, `scope.products` and `s3.endpoint` are refused at plan. `vulnetix config apply` does not upload a snapshot for a `path` source, and `vulnetix scan` does not read a `VexSource`. |
| Cloud | A per-account [`CloudSensors`](/platform-iac/kinds/cloud-sensors/) document needs a database migration; until it runs, plan blocks it. |
| SSVC in the CLI | The VDB API still makes its own simpler SSVC decision in the CLI's SCA response and in the remediation plan; neither reads `SsvcPolicy` yet. |
| Secrets rotation | A [`ServiceAccount`](/platform-iac/kinds/service-account/) secret cannot be rotated from a document; the console's rotate endpoint stays the way. |

## Planned kinds

None. Every kind in the [catalogue](/platform-iac/kinds/catalogue/) has a schema. A new kind is added there when `config-schemas` releases it.
