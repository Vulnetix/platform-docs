---
title: "VNX-SEC-055: New Relic API key"
nav: "VNX-SEC-055"
description: "Reports New Relic user (NRAK-), insert (NRII-), ingest license (…NRAL) and browser (NRJS-) keys as whole tokens."
order: 949
sources: ["cli/internal/sast/rules/vnx-sec-055.rego", "cli/internal/sast/docs/vnx-sec-055.md"]
checked: ["cli@308165d"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-055` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `newrelic` `monitoring` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-055.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-055.rego) |

## Overview

This rule reports a New Relic credential as a whole token: a user API key (`NRAK-` and 27 characters), an insert key (`NRII-` and 27 to 32 characters), an ingest license key (36 characters ending in `NRAL`), or a browser key (`NRJS-` and 19 hex characters) held in configuration. The browser key inside the `NREUM` loader snippet is public by design and is not reported, nor are bare prefixes, placeholders, template or environment references, and test paths.

### What gets flagged

```python
NEW_RELIC_API_KEY = "NRAK-<27 characters>"
```

```yaml
common: &default_settings
  license_key: '<36 characters>NRAL'
```

## Why this matters

Hardcoded new relic api key values are routinely scraped by automated bots within minutes of a public push, and then used to access the account, exfiltrate data, or pivot into downstream services. Once the credential is in git history it is permanently in third-party hands.

## Remediation

1. **Revoke the leaked credential** in the provider's console immediately.
2. **Replace with a short-lived alternative**, OAuth 2.0 access tokens, IAM role assumption, OIDC federation, wherever the platform supports it.
3. **Store the new credential in a secrets manager** (AWS Secrets Manager, HashiCorp Vault, GitHub Actions secrets, Doppler).
4. **Audit the provider's access logs** for activity you did not initiate between the leak and the revocation.
5. **Purge from git history** with `git filter-repo` or BFG, then re-scan with gitleaks/truffleHog to confirm no other secrets remain.
6. **Enable push protection** so future commits are blocked at the developer machine.

## References

- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- gitleaks `new-relic-browser-api-token`, `new-relic-insert-key`, `new-relic-user-api-key`
- [truffleHog](https://github.com/trufflesecurity/trufflehog)
- [OWASP Credentials Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Credentials_Management_Cheat_Sheet.html)
- [MITRE ATT&CK T1552.001 – Credentials In Files](https://attack.mitre.org/techniques/T1552/001/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-055
// nosec vnx-sec-055
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-055 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
