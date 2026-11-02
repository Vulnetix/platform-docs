---
title: Terraform and OpenTofu
nav: Overview
description: The vulnetix/vulnetix provider for Terraform and OpenTofu. Install, authenticate with a config management token, one resource per kind, import by name, write-only secrets, how state is read, and the registries. Publishing to the registries is pending.
order: 1
sources: ["terraform-provider-vulnetix/README.md", "terraform-provider-vulnetix/docs/index.md", "terraform-provider-vulnetix/examples/provider/provider.tf", "terraform-provider-vulnetix/templates/resources.md.tmpl", "terraform-provider-vulnetix/cmd/genresources/served.go", "vdb-site/api/internal/handler/config_tokens.go"]
checked: ["terraform-provider-vulnetix@169ce16", "vdb-site@7b71e88"]
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

### Renamed arguments

An argument is the kind's `spec` property in snake case. A property whose name the resource reserves (`name`, `labels`, `annotations`, `status`, `id` and Terraform's meta-arguments) is renamed, and the document key is unchanged:

| Kind | Document key | Argument |
|---|---|---|
| [`Campaign`](/platform-iac/kinds/campaign/) | `name` | `display_name` |
| [`TeaProduct`](/platform-iac/kinds/tea-product/) | `name` | `product_name` |
| [`TeaComponent`](/platform-iac/kinds/tea-component/) | `name` | `component_name` |
| [`VaultEntry`](/platform-iac/kinds/vault-entry/) | `name` | `entry_name` |
| [`VaultEntry`](/platform-iac/kinds/vault-entry/) | `provider` | `provider_slug` |
| [`FactoryBudget`](/platform-iac/kinds/factory-budget/) | `provider` | `model_providers` |
| [`RepositorySettings`](/platform-iac/kinds/repository-settings/) | `labels` (the repository as an asset) | `asset_labels` |

`metadata.name` stays `name`, and `metadata.labels` stays `labels`. Each kind's page shows the resource's arguments in its HCL samples.

### Status, phases and values shown once

Every resource has a computed `status` block:

| Attribute | Meaning |
|---|---|
| `status.phase` | `Applied` for most objects. `Pending` for a [`Member`](/platform-iac/kinds/member/) whose invitation is not accepted. `AwaitingAuthorization` for a messaging connection, such as Slack, that a person must authorize in a browser. `Unmanaged` when no manager owns the object. Terraform does not wait for a person: `Pending` and `AwaitingAuthorization` are successful applies, and a refresh shows the phase when it changes. |
| `status.authorization_url` | Where to authorize, while the phase is `AwaitingAuthorization`. |
| `status.extra` | Other fields the kind reports, such as `invitationExpires`. |
| `status.once` | Sensitive. Credentials the server shows only when it creates the object: a [`ServiceAccount`](/platform-iac/kinds/service-account/)'s `apiKey` and `secret`, a messaging connection's `signingSecret`, a [`LogSource`](/platform-iac/kinds/log-source/)'s ingest token. |

> [!CAREFUL] Shown-once values are stored in the state
> Terraform has no write-only computed attribute, so `status.once` is kept in the state from the create. Keep the state encrypted and its access narrow. The server cannot show the values again, so to get new ones replace the object (`terraform apply -replace=vulnetix_service_account.ci`). A SIEM kind is written in Guardian after the config database; when Guardian refuses, the apply fails with its reason and records nothing, so apply again once it is fixed.

### Destroying a resource

Destroying a resource sends `DELETE /config/objects/{kind}/{name}`. It deletes the object, or lets go of it where the kind says so: deleting a [`GitHubInstallation`](/platform-iac/kinds/github-installation/) never uninstalls the App, and deleting an [`Organization`](/platform-iac/kinds/organization/) never deletes the tenant.

A kind with one object per tenant (a singleton, named `default`) always has something behind it, so destroying it puts the tenant back where it was before anyone configured it:

| Kind | What destroy does |
|---|---|
| [`QualityGate`](/platform-iac/kinds/quality-gate/) | Deletes the tenant's row. The CLI's own flags decide every check again. |
| [`SsvcPolicy`](/platform-iac/kinds/ssvc-policy/) | Deletes the row. The tenant decides with the default policy. |
| [`NotificationDefaults`](/platform-iac/kinds/notification-defaults/) | Removes the setting. The catalogue defaults apply. |
| [`FactorySettings`](/platform-iac/kinds/factory-settings/) | Resets its keys to their defaults. The settings document stays. |
| [`ScannerProfile`](/platform-iac/kinds/scanner-profile/) | Resets its four keys (`scanners`, `custom`, `slsaMin`, `evidence`). |
| [`PackageFirewallPolicy`](/platform-iac/kinds/package-firewall-policy/) | Restores the column defaults and clears the ecosystem overrides, which is the open posture of a tenant with no policy. Mirrors are left alone. |
| [`AiFirewallPolicy`](/platform-iac/kinds/ai-firewall-policy/) | Removes only the rows of `spec.capabilities`. Guardrails, model and provider entries stay. |
| [`AwsConnection`](/platform-iac/kinds/aws-connection/) | Removes the connection as the console's forced disconnect does. The CloudFormation stacks stay in each account. |
| [`Organization`](/platform-iac/kinds/organization/) | Lets go. The tenant is never deleted. |

Destroying a resource that another manager owns fails. See the next section.

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
