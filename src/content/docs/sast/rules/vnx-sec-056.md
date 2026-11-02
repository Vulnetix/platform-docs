---
title: "VNX-SEC-056: Sentry auth token"
nav: "VNX-SEC-056"
description: "Reports Sentry user (sntryu_ + 64 hex), organisation (sntrys_eyJ…) and legacy 64-hex auth tokens assigned to SENTRY_AUTH_TOKEN, .sentryclirc or sentry-cli --auth-token; DSNs, bare prefixes and placeholders are not reported."
order: 950
sources: ["cli/internal/sast/rules/vnx-sec-056.rego", "cli/website/content/docs/sast-rules/vnx-sec-056.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-056` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `sentry` `monitoring` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-056.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-056.rego) |

## Overview

This rule reports a Sentry auth token as a whole token: a user auth token (`sntryu_` and 64 hex characters), an organisation auth token (`sntrys_` followed by its base64 JSON claims, `eyJ…`, and the secret part), or a legacy 64-hex token assigned to `SENTRY_AUTH_TOKEN` or to `token` in `.sentryclirc`. The DSN (a public ingest identifier), bare prefixes, placeholders such as `sntrys_YOUR_TOKEN_HERE`, environment references and test paths are not reported.

### What Gets Flagged

```ini
[auth]
token = sntryu_<64 hex characters>
```

```ts
sentryVitePlugin({ org: "acme", project: "web", authToken: "sntrys_eyJ<claims>_<secret>" })
```

## Why This Matters

Hardcoded sentry auth token values are routinely scraped by automated bots within minutes of a public push, and then used to access the account, exfiltrate data, or pivot into downstream services. Once the credential is in git history it is permanently in third-party hands.

## Remediation

1. **Revoke the leaked credential** in the provider's console immediately.
2. **Replace with a short-lived alternative**, OAuth 2.0 access tokens, IAM role assumption, OIDC federation, wherever the platform supports it.
3. **Store the new credential in a secrets manager** (AWS Secrets Manager, HashiCorp Vault, GitHub Actions secrets, Doppler).
4. **Audit the provider's access logs** for activity you did not initiate between the leak and the revocation.
5. **Purge from git history** with `git filter-repo` or BFG, then re-scan with gitleaks/truffleHog to confirm no other secrets remain.
6. **Enable push protection** so future commits are blocked at the developer machine.

## References

- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [gitleaks](https://github.com/gitleaks/gitleaks)
- [truffleHog](https://github.com/trufflesecurity/trufflehog)
- [OWASP Credentials Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Credentials_Management_Cheat_Sheet.html)
- [MITRE ATT&CK T1552.001 – Credentials In Files](https://attack.mitre.org/techniques/T1552/001/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-056
// nosec vnx-sec-056
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-056 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
