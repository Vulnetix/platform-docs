---
title: "VNX-SEC-063: MongoDB connection string with credentials"
nav: "VNX-SEC-063"
description: "Reports a MongoDB connection URL (mongodb://, mongodb+srv://) that embeds a literal password, but not interpolated or default passwords, localhost servers."
order: 957
sources: ["cli/internal/sast/rules/vnx-sec-063.rego", "cli/internal/sast/docs/vnx-sec-063.md"]
checked: ["cli@308165d"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-063` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `mongodb` `database` `credentials` `connection-string` |
| Source | [`internal/sast/rules/vnx-sec-063.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-063.rego) |

## Overview

This rule reports a MongoDB connection URL that embeds a literal password: `mongodb://user:password@host` (including replica-set host lists) or `mongodb+srv://user:password@cluster`, in code, config, `.env` and compose files. The password is masked in the snippet.

It does not report a password that is interpolated or templated (`${VAR}`, `$VAR`, `{{ }}`, `%s`, `<password>`, template-literal fields, concatenation), a default or placeholder word (`password`, `example`, `mongo`, `changeme`, the user name itself), a server on localhost or a documentation host (`example.com`, `*.test`, a bare `host` or `hostname`), 127.0.0.1 or ::1, URLs without a password, Markdown/reStructuredText/AsciiDoc and `*.example`/`*.sample`/`*.template` files, or test, fixture, vendored and generated files. VNX-SEC-008 reports the same URLs for every database scheme.

## What gets flagged

```javascript
// FLAGGED: replica-set URL with a literal password
mongoose.connect("mongodb://orders:<password>@mongo-0.acme.internal:27017,mongo-1.acme.internal:27017/orders?replicaSet=rs0");
```

```yaml
# FLAGGED: Atlas SRV URL in Spring config
spring:
  data:
    mongodb:
      uri: mongodb+srv://svc:<password>@prod.x7y8z.mongodb.net/catalog
```

```typescript
// NOT FLAGGED: interpolated credentials
const uri = `mongodb+srv://${user}:${pass}@cluster0.ab1cd.mongodb.net/app`;
```

## Why this matters

Hardcoded mongodb connection string with credentials values are routinely scraped by automated bots within minutes of a public push, and then used to access the account, exfiltrate data, or pivot into downstream services. Once the credential is in git history it is permanently in third-party hands.

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
# nosec vnx-sec-063
// nosec vnx-sec-063
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-063 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
