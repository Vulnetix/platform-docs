---
title: Terraform and OpenTofu
nav: Overview
description: The vulnetix/vulnetix provider for Terraform and OpenTofu. Install, authenticate with a config management token, one resource per kind, import by name, write-only secrets, how state is read, and the registries. Publishing to the registries is pending.
order: 1
sources: ["terraform-provider-vulnetix/README.md", "terraform-provider-vulnetix/docs/index.md", "terraform-provider-vulnetix/examples/provider/provider.tf", "terraform-provider-vulnetix/templates/resources.md.tmpl", "terraform-provider-vulnetix/cmd/genresources/served.go", "vdb-site/api/internal/handler/config_tokens.go"]
checked: ["terraform-provider-vulnetix@d7f7612", "vdb-site@b09e595"]
updated: 03 Nov 2026
---

> [!CAREFUL] Publishing pending
> The provider's source is public at [`Vulnetix/terraform-provider-vulnetix`](https://github.com/Vulnetix/terraform-provider-vulnetix), but it has no release yet, and neither the Terraform registry nor the OpenTofu registry lists `vulnetix/vulnetix`. `terraform init` cannot download it until the first release is published and the registries have it. Until then, [build it from source](#before-the-first-release). The same is true of the two [modules](/platform-iac/terraform/modules/).

The `vulnetix/vulnetix` provider manages Vulnetix configuration as code. Each resource is one `vulnetix.com/v1` config document of one [kind](/platform-iac/kinds/catalogue/), applied through the same [server-side engine](/platform-iac/reference/engine/) as `vulnetix config apply` and the console's Download as code. Resources, their examples and their docs are generated from the kind schemas in [`config-schemas`](https://github.com/Vulnetix/config-schemas), so a resource has the fields its kind has.

It is one binary for Terraform and OpenTofu, 1.11 or later: secrets use write-only arguments, which arrived in 1.11.

## Install

Once published, a configuration needs only the source:

```hcl
terraform {
  required_providers {
    vulnetix = {
      source = "vulnetix/vulnetix"
    }
  }
}

# The token is read from VULNETIX_CONFIG_TOKEN when not set here. Keep it out
# of the configuration: pass it from your CI secret store.
provider "vulnetix" {
  # endpoint = "https://www.vulnetix.com/api/site/v1"
  # manager  = "terraform"
}

resource "vulnetix_quality_gate" "default" {
  severity      = "high"
  block_malware = true
}
```

Then `terraform init && terraform apply`, or `tofu init && tofu apply`. OpenTofu resolves the same `vulnetix/vulnetix` source from its own registry; nothing else changes.

### Before the first release

Build the provider and point Terraform or OpenTofu at the binary with a development override:

```bash
git clone https://github.com/Vulnetix/terraform-provider-vulnetix
cd terraform-provider-vulnetix
go build -o "$HOME/go/bin/terraform-provider-vulnetix" .
```

```hcl
# ~/.terraformrc, or ~/.tofurc for OpenTofu
provider_installation {
  dev_overrides {
    "vulnetix/vulnetix" = "/home/you/go/bin"
  }
  direct {}
}
```

With an override, skip `terraform init` for this provider and run `plan` or `apply` directly.

## Authentication

The provider authenticates with a **config management token**, `vmt_...`, sent as `Authorization: Bearer`. A token acts as a service account of the tenant and carries a role and the list of kinds it may change.

| Argument | Environment variable | Default | Notes |
|---|---|---|---|
| `token` | `VULNETIX_CONFIG_TOKEN` | none | A `vmt_` token. Sensitive. Keep it out of the configuration. |
| `endpoint` | `VULNETIX_ENDPOINT` | `https://www.vulnetix.com/api/site/v1` | The console API. The engine's routes are under `/config/...`. Set it to point at another deployment. |
| `manager` | none | `terraform` | Recorded as the owner of every object this provider applies. |

An owner or admin, signed in, issues a token with `POST /v1/config/tokens` and gives it a service account, a role and the kinds. The token is in that answer only. Applying needs the `owner` or `admin` role and every kind the configuration manages. Four kinds, [`Organization`](/platform-iac/kinds/organization/), [`Member`](/platform-iac/kinds/member/), [`ServiceAccount`](/platform-iac/kinds/service-account/) and [`VaultEntry`](/platform-iac/kinds/vault-entry/), need an **owner** token. The five SIEM kinds are written in Guardian with the same token, and need no other credential. A service account's ApiKey is a member and is refused. See [Management tokens](/platform-iac/reference/config-api/#management-tokens) for issuing, rotating and revoking.

## Resources

One resource per kind that the engine stores: [every resource](/platform-iac/terraform/resources/), with its kind and group. A kind's page has the resource's **Minimal** and **Advanced** HCL beside the YAML and the CLI form, and its import command. Each resource's arguments are the kind's `spec` in snake case (`blockMalware` is `block_malware`), beside `name`, `labels` and `annotations` from `metadata`.

The kinds that are validate only, [`LicensePolicy`](/platform-iac/kinds/license-policy/) and [`LicenseExceptions`](/platform-iac/kinds/license-exceptions/), have no resource: the server stores nothing for them, so there is nothing for Terraform to manage. A kind with a released schema that the engine does not serve is generated but not offered.

[Data sources](/platform-iac/terraform/data-sources/) read what the engine and the platform hold: the kinds the server applies, the AI model catalogue, VEX statements, the repositories the GitHub App reaches, and detection rule feeds.

## Import

Import any object by its name (`metadata.name`). A kind with one object per tenant is named `default`:

```bash
terraform import vulnetix_quality_gate.default default
terraform import vulnetix_jail_policy.payments_api payments-api
```

The first read after an import fills in every field the server holds. Each kind's page shows the import command for its resource, and the repository keeps an `import.sh` beside every example. `vulnetix config export --format hcl` writes resources with `import {}` blocks for what a tenant already has, so the first plan shows no changes; see [Export](/platform-iac/cli/export/).

## How state is read, and what a change does

Most kinds **merge** a document into the stored object, and the tenant's row can hold values the configuration never set. So a refresh reads only the arguments you manage: an argument removed from the configuration stops being managed and keeps its last server value. Kinds that are wholly declared, such as `ApiSpecSource`, `MalwareIoc`, `RemediationPolicy`, `RiskStrategy`, `Suppression` and `VexSource`, are **replaced** instead: a removed argument goes back to its default. A resource's own page in the registry says which.

Some kinds replace the object itself when a field changes, because the platform's own console only creates and deletes them. [`WizConnection`](/platform-iac/kinds/wiz-connection/) is replaced through those writers, and a messaging connection cannot change type. A kind written in a [second phase](/platform-iac/reference/engine/#outside-the-transaction) (the five SIEM kinds and `VaultEntry`) answers a single `PUT` with 502 `external_failed` when its store refuses the write, and records nothing.

Destroying a resource deletes the object, or lets go of it where the kind says so: deleting a [`GitHubInstallation`](/platform-iac/kinds/github-installation/) never uninstalls the App, and deleting an [`Organization`](/platform-iac/kinds/organization/) never deletes the tenant.

## Ownership and drift

Every apply is recorded with the provider's `manager`, `terraform` by default. A GitOps `vulnetix config apply --prune` deletes only objects its own manager owns, so it leaves Terraform's alone, and Terraform cannot delete an object another manager owns. Change `manager` only if you run more than one Terraform configuration against one tenant and want them kept apart.

## Secrets

A field named in a schema's `x-vulnetix.secrets` is generated as two arguments:

- `<name>_wo`: write-only. It is sent in the document and never stored in the plan or the state. The server never returns it either.
- `<name>_wo_version`: change this number to send the value again. Terraform cannot see a change to a write-only value.

Feed `<name>_wo` from an ephemeral variable or an ephemeral resource:

```hcl
variable "vllm_api_key" {
  type      = string
  sensitive = true
  ephemeral = true
}

resource "vulnetix_ai_provider" "vllm" {
  name               = "acme-vllm"
  auth               = "bearer"
  base_url           = "https://llm.acme.example"
  protocol           = "openai-chat"
  api_key_wo         = var.vllm_api_key
  api_key_wo_version = 1
}
```

## OpenTofu

The provider is the same binary for both tools and is meant to be published to both registries. Everything above applies to OpenTofu 1.11 or later: write-only arguments, ephemeral variables and import. The provider's acceptance suite runs under both.

## Registries

| Registry | Address | Status |
|---|---|---|
| Terraform registry | `registry.terraform.io/vulnetix/vulnetix` | Publishing pending. The namespace's signing key is added and the provider published from the repository on the first release. |
| OpenTofu registry | `registry.opentofu.org/vulnetix/vulnetix` | Publishing pending. Submitted to the registry repository with the same key after the first release. |

A release is a `vX.Y.Z` tag on the repository. Its workflow publishes a GitHub release in the registry layout: zips per platform, a manifest, `SHA256SUMS` and a detached GPG signature that both registries read.
