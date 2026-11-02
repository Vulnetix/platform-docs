---
title: "VNX-SEC-038: HashiCorp Terraform Cloud token"
nav: "VNX-SEC-038"
description: "Reports a Terraform Cloud / Terraform Enterprise API token: a standalone token of 14 letters and digits, .atlasv1., and 60 or more base64url characters, in any file including .tfvars and .terraformrc. Placeholders and test or fixture paths are not reported."
order: 932
sources: ["cli/internal/sast/rules/vnx-sec-038.rego", "cli/website/content/docs/sast-rules/vnx-sec-038.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-038` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `terraform` `hashicorp` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-038.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-038.rego) |

## Overview

This rule detects Terraform Cloud API tokens matching `<14 chars>.atlasv1.<60-70 chars>`. Terraform Cloud tokens grant the ability to trigger runs that can alter production infrastructure, modify variable values, and read state files (which may contain plaintext secrets for downstream resources).

## Why This Matters

A leaked TFC token can trigger a speculative apply that destroys production infrastructure. The attacker can also modify workspace variables (which often contain database credentials) and read state, which frequently contains unredacted secret values.

## What Gets Flagged

Flagged (in any file, including `.tfvars` and `.terraformrc`):

```hcl
credentials "app.terraform.io" {
  token = "<14 characters>.atlasv1.<60+ characters>"
}
```

Not flagged: `token = var.tfe_token`, placeholders, a truncated body, and test or fixture files.

## Remediation

1. **Revoke the token in the Terraform Cloud user settings** → Tokens.
2. **Audit runs in the TFC activity feed** to confirm no malicious applies occurred.
3. **Use OIDC federation** to issue short-lived TFC tokens from your CI provider without a long-lived secret.
4. **Purge from git history** with `git filter-repo`.

## References

- [Terraform Cloud API Tokens](https://developer.hashicorp.com/terraform/cloud-docs/api-docs#authentication)
- [Terraform Cloud Dynamic Credentials](https://developer.hashicorp.com/terraform/cloud-docs/workspaces/dynamic-provider-credentials)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [gitleaks `hashicorp-tf-api-token`](https://github.com/gitleaks/gitleaks)
- [MITRE ATT&CK T1552.001](https://attack.mitre.org/techniques/T1552/001/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-038
// nosec vnx-sec-038
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-038 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
