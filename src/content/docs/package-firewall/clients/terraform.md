---
title: Terraform and OpenTofu
nav: Terraform
description: Route Terraform registry lookups for providers and modules through the Package Firewall with a host override in the CLI config.
order: 24
sources: [package-firewall/internal/ecosystem/terraform/terraform.go, package-firewall/internal/handler/root_dispatch.go, package-firewall/internal/auth/basic.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [package-firewall@333285f]
updated: 02 Nov 2026
---

| | |
|---|---|
| Base URL | `https://packages.vulnetix.com/terraform` |
| Ecosystem ID | `terraform` |
| Plan | Enterprise |
| Mode | filter: `versions` lists are filtered; `.../download` requests are checked |
| Cooldown | no (no publish time in the registry API) |
| Default mirror | `https://registry.terraform.io` |
| Automatic setup | none: `vulnetix package-firewall terraform` exits 1 |

The firewall speaks the Terraform registry protocol (`/v1/providers/...` and `/v1/modules/...`). It does not implement the provider network mirror protocol, so a `network_mirror` block pointed at it fails. Providers are keyed as `namespace/name` (`hashicorp/aws`), modules as `namespace/name/provider`.

## Configuration

Override the services Terraform discovers for `registry.terraform.io`, and give that host a token. `~/.terraformrc` (`%APPDATA%\terraform.rc` on Windows):

```hcl
host "registry.terraform.io" {
  services = {
    "providers.v1" = "https://packages.vulnetix.com/terraform/v1/providers/",
    "modules.v1"   = "https://packages.vulnetix.com/terraform/v1/modules/"
  }
}

credentials "registry.terraform.io" {
  token = "BASE64_OF_ORGUUID_COLON_APIKEY"
}
```

Terraform sends the token as `Authorization: Bearer`, which the firewall accepts when it is `base64("<orgUUID>:<apiKey>")`. In CI set `TF_TOKEN_registry_terraform_io` instead of the `credentials` block. OpenTofu reads the same blocks from `~/.tofurc`.

The `host` block is a Terraform CLI configuration feature meant for this kind of override. It was derived from the adapter's routes and has no CLI writer yet, so confirm with the steps below before relying on it.

## Use and verify

```bash
rm -rf .terraform
terraform init
```

The provider `download` response still points at `releases.hashicorp.com`, so the zip itself comes from HashiCorp. The block happens on the `download` request: a blocked version returns the block status and `terraform init` stops. Provider checksums and signatures are untouched.
