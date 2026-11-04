---
title: Platform IaC
description: What Platform IaC is, which Vulnetix configuration you can keep as code, and how documents are applied from the CLI, Terraform and a repository.
order: 1
sources: [config-schemas/README.md, config-schemas/schemas.go, cli/cmd/config_documents.go, cli/cmd/config.go, vdb-site/docs/platform-iac-engine.md, terraform-provider-resolve/README.md]
checked: [config-schemas@v1.8.0, cli@v3.166.0, vdb-site@3c0433c]
updated: 04 Nov 2026
---

Platform IaC is for teams that want their Vulnetix settings, such as quality gates, firewall policy, members and connections, reviewed in pull requests and reproducible across organisations instead of clicked into the Resolve Platform. Use it to manage how Vulnetix is configured. To scan your own Terraform or Kubernetes code for misconfigurations, use [IaC scanning](/iac-scanning/).

Platform IaC is Vulnetix configuration written as YAML documents, kept in a repository and checked like code. Every document has the same shape: `apiVersion: vulnetix.com/v1`, a `kind`, `metadata` and a `spec`. Each kind has a published JSON Schema, a page here with its fields and samples, and, where the engine stores it, a Terraform resource.

```yaml
apiVersion: vulnetix.com/v1
kind: QualityGate
metadata:
  name: default
spec:
  severity: high
  blockMalware: true
```

## What exists

| Piece | What it does | Page |
|---|---|---|
| Kinds | Every kind in `config-schemas` (the catalogue says which release), from the quality gate and jail policy to the organization's members, the Software Factory, TEA, SIEM and cloud connections. Each page has the fields, rules, Minimal and Advanced samples in YAML, HCL and CLI, and how apply treats it. | [Kind catalogue](/platform-iac/kinds/catalogue/) |
| Config engine | The server side that plans, applies and exports every kind, records who manages each object, and reports status. All kinds are served except `LicensePolicy` and `LicenseExceptions`, which are validate only. | [Engine](/platform-iac/reference/engine/), [Config API](/platform-iac/reference/config-api/) |
| CLI | `vulnetix config validate`, `kinds` and `schema` work offline; `plan`, `apply` and `export` use the engine. | [Validate](/platform-iac/cli/validate/), [Plan](/platform-iac/cli/plan/), [Apply](/platform-iac/cli/apply/), [Export](/platform-iac/cli/export/) |
| CEL | A `when` or `selector` expression on jail rules, risk rules, suppressions, package list entries, AI guardrails and detection rule feeds. | [CEL rule expressions](/platform-iac/reference/cel/) |
| Terraform and OpenTofu | The `vulnetix/resolve` provider, one resource per kind, published on the Terraform and OpenTofu registries, and two AWS modules on the Terraform registry. | [Terraform and OpenTofu](/platform-iac/terraform/) |
| GitHub Actions | Plan on pull requests, apply on the default branch. | [config-plan](/platform-iac/github-actions/config-plan/), [config-apply](/platform-iac/github-actions/config-apply/) |
| Schemas | Signed JSON Schemas, with pinned and `latest` URLs. | [Schema releases](/platform-iac/schemas/releases/) |

> [!CAREFUL] Validating is not applying
> `vulnetix config validate` checks documents and changes nothing in your organization. `vulnetix config plan` shows what applying would change, and `vulnetix config apply` changes it. A CLI release embeds one release of the schemas and refuses a kind added after it as unknown, so check the CLI line on a kind's page; the [roadmap](/platform-iac/planned/roadmap/) lists the gaps.

## Three ways to apply a document

| Way | Use it when | Credential |
|---|---|---|
| `vulnetix config apply` | You keep documents in `.vulnetix/config` or pipe them in; a person or CI applies them. | The ApiKey of a `developer` or `owner` service account, or an owner login |
| The `config-apply` workflow node and the GitHub Actions | A config repository should manage the tenant on every push to its default branch, with an approval. | The same token |
| Terraform or OpenTofu | The rest of your infrastructure is already Terraform. | The same token |

All three go through the same engine, so a document gives the same result in each, and each records its own manager. `--prune` deletes only objects its own manager owns.

## Find the page for your task

| I want to | Read |
|---|---|
| See every kind | [Kind catalogue](/platform-iac/kinds/catalogue/) |
| Write a quality gate document and check it in CI | [Quickstart](/platform-iac/get-started/quickstart/) |
| Know what `metadata.name` and `metadata.org` mean | [Documents](/platform-iac/get-started/documents/) |
| Write a `when` condition | [CEL rule expressions](/platform-iac/reference/cel/) |
| Manage settings with Terraform | [Terraform and OpenTofu](/platform-iac/terraform/) |
| Pull VEX documents in as suppressions | [VEX documents as suppression rules](/platform-iac/guides/vex-sources/) |
| Get completion and errors in my editor | [Editor setup](/platform-iac/schemas/editors/) |
| Check a schema file was published by Vulnetix | [Verify a release](/platform-iac/schemas/verify/) |
| Know whether a schema update can break my files | [Compatibility](/platform-iac/schemas/compatibility/) |
| Set the org quality gate from a script | [Imperative commands](/platform-iac/cli/imperative-commands/) |
| Keep AI firewall policy in a repository | [AiFirewallPolicy](/platform-iac/kinds/ai-firewall-policy/) |
| See what is not available yet | [Roadmap](/platform-iac/planned/roadmap/) |

## Platform IaC in each product

Every other product segment ends with a short Platform IaC section that links the kinds of that product.
