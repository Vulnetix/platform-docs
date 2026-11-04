---
title: "VNX-SEC-054: Datadog API / APP key"
nav: "VNX-SEC-054"
description: "Reports a Datadog API key (32 hex) or application key (40 hex) assigned to a Datadog key name."
order: 948
sources: ["cli/internal/sast/rules/vnx-sec-054.rego", "cli/internal/sast/docs/vnx-sec-054.md"]
checked: ["cli@308165d"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-054` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `datadog` `monitoring` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-054.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-054.rego) |

## Overview

This rule reports a hard-coded Datadog API key (32 lower-case hex characters) or application key (40 hex characters). The value must be assigned to a Datadog key name (`DD_API_KEY`, `DD_APP_KEY`, `datadog_api_key`), or to a generic `api_key`/`app_key`/`apiKey`/`apiKeyAuth` when the file is Datadog configuration: a path naming datadog, or a line naming Datadog within eight lines above (`provider "datadog"`, `from datadog import`, `@datadog/datadog-api-client`, a `datadog:` block). Not reported: hex values with no Datadog context, the public RUM client token (`pub…`), variable or environment references, placeholders and test paths.

### What gets flagged

```sh
DD_API_KEY=<32 hex characters>
```

```hcl
provider "datadog" {
  api_key = "<32 hex characters>"
  app_key = "<40 hex characters>"
}
```

## Why this matters

Hardcoded datadog api / app key values are routinely scraped by automated bots within minutes of a public push, and then used to access the account, exfiltrate data, or pivot into downstream services. Once the credential is in git history it is permanently in third-party hands.

## Remediation

1. **Revoke the leaked credential** in the provider's console immediately.
2. **Replace with a short-lived alternative**, OAuth 2.0 access tokens, IAM role assumption, OIDC federation, wherever the platform supports it.
3. **Store the new credential in a secrets manager** (AWS Secrets Manager, HashiCorp Vault, GitHub Actions secrets, Doppler).
4. **Audit the provider's access logs** for activity you did not initiate between the leak and the revocation.
5. **Purge from git history** with `git filter-repo` or BFG, then re-scan with gitleaks/truffleHog to confirm no other secrets remain.
6. **Enable push protection** so future commits are blocked at the developer machine.

## References

- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- gitleaks `datadog-access-token`
- [truffleHog](https://github.com/trufflesecurity/trufflehog)
- [OWASP Credentials Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Credentials_Management_Cheat_Sheet.html)
- [MITRE ATT&CK T1552.001 – Credentials In Files](https://attack.mitre.org/techniques/T1552/001/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-054
// nosec vnx-sec-054
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-054 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
