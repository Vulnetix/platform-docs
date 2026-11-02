---
title: "VNX-SEC-047: Shopify access token"
nav: "VNX-SEC-047"
description: "Reports Shopify tokens (shpat_, shpca_, shppa_, shpss_ followed by exactly 32 hex characters) written into files."
order: 941
sources: ["cli/internal/sast/rules/vnx-sec-047.rego", "cli/website/content/docs/sast-rules/vnx-sec-047.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-047` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `shopify` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-047.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-047.rego) |

## Overview

This rule reports a Shopify Admin API access token (`shpat_`), custom app access token (`shpca_`), private app password (`shppa_`) or shared secret (`shpss_`), each followed by exactly 32 hexadecimal characters and standing alone. The prefix inside a longer identifier (`myshpat_...`), a body of the wrong length, placeholders (`shpat_xxxx...`, `shpat_000...`), environment lookups and test, fixture and vendored paths are not reported, and the snippet is redacted.

## Why This Matters

Hardcoded shopify access token values are routinely scraped by automated bots within minutes of a public push, and then used to access the account, exfiltrate data, or pivot into downstream services. Once the credential is in git history it is permanently in third-party hands.

## Remediation

1. **Revoke the leaked credential** in the provider's console immediately.
2. **Replace with a short-lived alternative**, OAuth 2.0 access tokens, IAM role assumption, OIDC federation, wherever the platform supports it.
3. **Store the new credential in a secrets manager** (AWS Secrets Manager, HashiCorp Vault, GitHub Actions secrets, Doppler).
4. **Audit the provider's access logs** for activity you did not initiate between the leak and the revocation.
5. **Purge from git history** with `git filter-repo` or BFG, then re-scan with gitleaks/truffleHog to confirm no other secrets remain.
6. **Enable push protection** so future commits are blocked at the developer machine.

## References

- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- gitleaks `shopify-access-token`
- [truffleHog](https://github.com/trufflesecurity/trufflehog)
- [OWASP Credentials Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Credentials_Management_Cheat_Sheet.html)
- [MITRE ATT&CK T1552.001 – Credentials In Files](https://attack.mitre.org/techniques/T1552/001/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-047
// nosec vnx-sec-047
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-047 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
