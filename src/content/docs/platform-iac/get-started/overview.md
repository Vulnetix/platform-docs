---
title: Overview
description: What Vulnetix configuration you can keep as code today, what is planned, and where each piece is documented.
order: 1
sources: [config-schemas/README.md, config-schemas/schemas.go, cli/cmd/config_documents.go, cli/cmd/config.go, cli/pkg/aifirewall/policy.go]
checked: [config-schemas@9bda9e1, cli@4c8c3b7]
updated: 02 Nov 2026
---

Platform IaC is Vulnetix configuration written as YAML documents, kept in a repository and checked like code. Every document has the same shape: `apiVersion: vulnetix.com/v1`, a `kind`, `metadata` and a `spec`. Each kind has a published JSON Schema.

Most of it is still being built. This page says exactly what works today and what does not.

## What exists today

| Piece | What it does | Page |
|---|---|---|
| `Vulnetix/config-schemas` | JSON Schema 2020-12 for each kind, published as signed GitHub Release assets with pinned and `latest` URLs. Releases `v1.0.0` and `v1.0.1` contain one kind, `QualityGate`. | [Schema releases](/platform-iac/schemas/releases/) |
| `QualityGate` kind | The tenant's scan quality gate as a document. Validated offline today; not yet applied by any tool. | [QualityGate](/platform-iac/kinds/quality-gate/) |
| `vulnetix config validate`, `kinds`, `schema` | Offline validation of documents in `.vulnetix/config/` against the schemas built into the CLI. No credentials, no network. CLI v3.153.0 and later. | [Validate documents](/platform-iac/cli/validate/) |
| `vulnetix config set` and `get` | Imperative commands that write and read the quality gate, the EOL policy, the package firewall policy and mirrors, AI firewall entries and jail exemptions. | [Imperative commands](/platform-iac/cli/imperative-commands/) |
| `AiFirewallPolicy` | `.vulnetix/ai-firewall.yaml`, reconciled with `vulnetix ai-firewall apply` and written by `vulnetix ai-firewall export`. The one document that a tool applies today. | [AiFirewallPolicy](/platform-iac/kinds/ai-firewall-policy/) |

> [!CAREFUL] Validating is not applying
> `vulnetix config validate` checks a `QualityGate` document and changes nothing in your organization. To change the stored gate today, use `vulnetix config set quality-gate` and `vulnetix config set eol-policy`. The [QualityGate](/platform-iac/kinds/quality-gate/#set-these-values-today) page maps each field to its flag.

## What is planned

Except where marked available, none of these exist yet. Each is described on the [Planned](/platform-iac/planned/roadmap/) pages, so you can see where the format is going:

- a server-side config engine with `plan`, `apply` and `export`, managers, prune and drift reporting;
- [`vulnetix config plan`](/platform-iac/cli/plan/), [`apply`](/platform-iac/cli/apply/) and [`export`](/platform-iac/cli/export/) are available now for `QualityGate`; the other kinds follow;
- a kind for every tenant setting (the [kind catalogue](/platform-iac/planned/kind-catalogue/));
- a [Terraform and OpenTofu provider](/platform-iac/planned/terraform/);
- [CEL rule expressions](/platform-iac/planned/cel/);
- [VEX documents as suppression rules](/platform-iac/planned/vex-sources/);
- "Download as code" on console settings pages.

## Find the page for your task

| I want to | Read |
|---|---|
| Write a quality gate document and check it in CI | [Quickstart](/platform-iac/get-started/quickstart/) |
| Know what `metadata.name` and `metadata.org` mean | [Documents](/platform-iac/get-started/documents/) |
| Get completion and errors in my editor | [Editor setup](/platform-iac/schemas/editors/) |
| Check a schema file was published by Vulnetix | [Verify a release](/platform-iac/schemas/verify/) |
| Know whether a schema update can break my files | [Compatibility](/platform-iac/schemas/compatibility/) |
| Set the org quality gate from a script | [Imperative commands](/platform-iac/cli/imperative-commands/) |
| Keep AI firewall policy in a repository | [AiFirewallPolicy](/platform-iac/kinds/ai-firewall-policy/) |

## Platform IaC

This segment is the Platform IaC reference. Today that is the `QualityGate` schema, offline validation with `vulnetix config validate`, the imperative `vulnetix config set` and `get` commands, and the `AiFirewallPolicy` file. Every other product segment ends with a section like this one that says which of these applies to it.
