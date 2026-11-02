---
title: "Planned: Terraform and OpenTofu provider"
nav: Terraform provider
description: Planned, not available. A vulnetix/vulnetix provider for Terraform and OpenTofu, with resources generated from the kind schemas.
order: 3
sources: [config-schemas/README.md]
checked: [config-schemas@9bda9e1]
updated: 02 Nov 2026
---

> [!CAREFUL] Planned
> There is no Vulnetix Terraform or OpenTofu provider yet, and no `terraform-provider-vulnetix` repository. Nothing on this page can be used today.

The plan:

- **Provider** `vulnetix/vulnetix`, published to registry.terraform.io and the OpenTofu registry, signed with GPG.
- **Resources** generated from the kind JSON Schemas, one per kind: `vulnetix_quality_gate`, `vulnetix_jail_policy` and so on. Each maps to one engine object by kind and `metadata.name`, is imported by name, and is recorded with manager `terraform`.
- **Secrets** as write-only arguments (`*_wo`, Terraform 1.11 or later), so they never land in state.
- **Data sources**: `vulnetix_kinds`, `vulnetix_ai_models`, `vulnetix_github_installation_repos`, `vulnetix_virtual_patches`, `vulnetix_detection_rule_feed`, `vulnetix_vex_statements`.
- **Modules**: `vulnetix/aws-onboarding` (the AWS bootstrap and pipeline stacks, with the tenant UUID as external ID) and `vulnetix/aws-siem-shipping`.
- **Adoption**: the console's planned Download as code and `vulnetix config export --format hcl` write resources with `import {}` blocks, so the first `terraform plan` on existing settings shows no changes.

An example of what a resource is planned to look like (not usable today):

```hcl
resource "vulnetix_quality_gate" "default" {
  severity      = "high"
  block_malware = true
}
```

Until the provider exists, set the same values with [`vulnetix config set quality-gate`](/platform-iac/cli/imperative-commands/) from a pipeline step.
