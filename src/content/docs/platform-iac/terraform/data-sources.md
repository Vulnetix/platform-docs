---
title: Terraform data sources
nav: Data sources
description: The six data sources of the vulnetix/resolve provider, what each reads, what it needs, and an example. They read what the engine and the platform hold, so a resource can refer to it.
order: 3
sources: ["terraform-provider-resolve/docs/data-sources/kinds.md", "terraform-provider-resolve/docs/data-sources/ai_models.md", "terraform-provider-resolve/docs/data-sources/vex_statements.md", "terraform-provider-resolve/docs/data-sources/github_installation_repos.md", "terraform-provider-resolve/docs/data-sources/detection_rule_feed.md", "terraform-provider-resolve/docs/data-sources/virtual_patches.md", "vdb-site/docs/platform-iac-engine.md"]
checked: ["terraform-provider-resolve@d7f7612", "vdb-site@b09e595"]
updated: 03 Nov 2026
---

A data source reads something a plan can refer to. All six use the same [credentials](/platform-iac/terraform/#authentication) as the resources. They only read, so any member credential is enough; some also need a plan feature. The provider's registry reference lists every attribute; this page says what each is for.

| Data source | Reads | Also needs |
|---|---|---|
| [`vulnetix_kinds`](#vulnetix_kinds) | `GET /config/kinds` | |
| [`vulnetix_ai_models`](#vulnetix_ai_models) | `GET /ai-firewall/models` | |
| [`vulnetix_vex_statements`](#vulnetix_vex_statements) | `GET /vex/statements` | |
| [`vulnetix_github_installation_repos`](#vulnetix_github_installation_repos) | `GET /integrations/github/installations/repos` | A GitHub installation |
| [`vulnetix_detection_rule_feed`](#vulnetix_detection_rule_feed) | `GET /detection-rule-feeds` | A Pro plan or higher |
| [`vulnetix_virtual_patches`](#vulnetix_virtual_patches) | The same feed routes | A Pro plan or higher |

## vulnetix_kinds

The config kinds the Vulnetix server applies, with their JSON Schemas, in dependency order, and the `config-schemas` release it validates against. Use it to check that a kind is served before applying it.

```hcl
data "vulnetix_kinds" "all" {}

output "served_kinds" {
  value = [for k in data.vulnetix_kinds.all.kinds : k.kind]
}
```

It also returns `schema_kinds`, every kind with a released schema including the ones the server does not apply yet, and `schema_version`.

## vulnetix_ai_models

The AI models the AI firewall knows: every built-in provider's models and those of the tenant's custom providers ([`vulnetix_ai_provider`](/platform-iac/kinds/ai-provider/)). Use a model's `provider_slug` and `slug` to pin it in [`vulnetix_ai_firewall_policy`](/platform-iac/kinds/ai-firewall-policy/). Filter by `provider_uuid` or `search`, which matches a slug or name without regard to case.

```hcl
# Every model the AI firewall knows whose slug or name mentions "sonnet".
data "vulnetix_ai_models" "sonnet" {
  search = "sonnet"
}

output "sonnet_models" {
  value = [for m in data.vulnetix_ai_models.sonnet.models : "${m.provider_slug}/${m.slug}" if m.is_active]
}
```

## vulnetix_vex_statements

Every VEX statement the tenant holds, newest first, across all its documents and in every status, including `under_investigation` and `affected`. Statements come from triage, from suppressions and from [`VexSource`](/platform-iac/guides/vex-sources/) imports. Filter by `status`, `vulnerability_id`, `purl`, `repository` and `limit` (default 1000).

```hcl
# The tenant's not_affected statements about one package, newest first.
data "vulnetix_vex_statements" "lodash" {
  status = "not_affected"
  purl   = "pkg:npm/lodash"
  limit  = 200
}

output "lodash_not_affected" {
  value = { for s in data.vulnetix_vex_statements.lodash.statements : s.vulnerability_id => s.justification }
}
```

## vulnetix_github_installation_repos

The repositories the tenant's active GitHub App installations reach, ordered by full name. It reads Vulnetix's cache, which GitHub webhooks keep current, so a plan never calls GitHub. Use `full_names` to scope a resource to every repository the App can see. Filter by `installation_id` and `query` (a substring of `owner/name`); archived repositories are left out unless `include_archived` is set.

```hcl
# Every repository the Vulnetix GitHub App can see in the acme organisation,
# archived ones left out.
data "vulnetix_github_installation_repos" "acme" {
  query = "acme/"
}

# Apply the security team's VEX statements to all of them.
resource "vulnetix_vex_source" "advisories" {
  name = "acme-advisories"
  scope = {
    repos = data.vulnetix_github_installation_repos.acme.full_names
  }
  git = {
    url   = "https://github.com/acme/security-advisories.git"
    ref   = "main"
    paths = ["vex/**/*.openvex.json"]
  }
}
```

## vulnetix_detection_rule_feed

One [detection rule feed](/virtual-patching/) and its entries, looked up by `uuid` or `name` (it must match exactly one feed). Point an IDS, IPS, WAF or SIEM at `manifest_url` to consume it. The attributes include the feed's format (`feed_type`), `status` (`DRAFT`, `PUBLISHED` or `REVOKED`), `rule_count`, and each entry's table, type, rule and the CVE it was added for. `manifest_url` and `public_base_url` are null until the feed is published. Feeds need a Pro plan or higher.

```hcl
data "vulnetix_detection_rule_feed" "suricata" {
  name = "edge-ips"
}

# Point the sensor at the published manifest.
output "suricata_manifest" {
  value = data.vulnetix_detection_rule_feed.suricata.manifest_url
}
```

To declare a feed rather than read one, see [`DetectionRuleFeed`](/platform-iac/kinds/detection-rule-feed/).

## vulnetix_virtual_patches

The Vulnetix-generated virtual patches in one feed: its entries whose `rule_table` is `virtual_patch`. Third-party catalogue rules and countermeasures in the same feed are left out. Set `feed_name` or `feed_uuid`; `include_disabled` also returns entries that are disabled and so left out of the published feed. Feeds need a Pro plan or higher.

```hcl
data "vulnetix_virtual_patches" "waf" {
  feed_name = "edge-waf"
}

output "patched_cves" {
  value = distinct([for p in data.vulnetix_virtual_patches.waf.patches : p.matched_cve if p.matched_cve != ""])
}
```
