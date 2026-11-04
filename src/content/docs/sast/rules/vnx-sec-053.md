---
title: "VNX-SEC-053: SonarQube / SonarCloud token"
nav: "VNX-SEC-053"
description: "Reports a SonarQube or SonarCloud token (squ_, sqp_ or sqa_ + exactly 40 hex characters) in any file; identifiers that only share the prefix, placeholders and CI secret references are not reported."
order: 947
sources: ["cli/internal/sast/rules/vnx-sec-053.rego", "cli/internal/sast/docs/vnx-sec-053.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-053` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `sonarqube` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-053.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-053.rego) |

## Overview

This rule reports a SonarQube or SonarCloud token as a whole token: a user token (`squ_`), a project analysis token (`sqp_`) or a global analysis token (`sqa_`), each followed by exactly 40 lower-case hex characters. Identifiers that only start with those prefixes, placeholder bodies, CI secret references and test paths are not reported. Snyk tokens are reported by VNX-SEC-1020 and VNX-SEC-1021.

### What gets flagged

```properties
sonar.token=squ_<40 hex characters>
```

```sh
mvn sonar:sonar -Dsonar.login='sqa_<40 hex characters>'
```

## Why this matters

Hardcoded sonarqube api token values are routinely scraped by automated bots within minutes of a public push, and then used to access the account, exfiltrate data, or pivot into downstream services. Once the credential is in git history it is permanently in third-party hands.

## Remediation

1. **Revoke the leaked credential** in the provider's console immediately.
2. **Replace with a short-lived alternative**, OAuth 2.0 access tokens, IAM role assumption, OIDC federation, wherever the platform supports it.
3. **Store the new credential in a secrets manager** (AWS Secrets Manager, HashiCorp Vault, GitHub Actions secrets, Doppler).
4. **Audit the provider's access logs** for activity you did not initiate between the leak and the revocation.
5. **Purge from git history** with `git filter-repo` or BFG, then re-scan with gitleaks/truffleHog to confirm no other secrets remain.
6. **Enable push protection** so future commits are blocked at the developer machine.

## References

- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- gitleaks `sonar-api-token`
- [truffleHog](https://github.com/trufflesecurity/trufflehog)
- [OWASP Credentials Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Credentials_Management_Cheat_Sheet.html)
- [MITRE ATT&CK T1552.001 – Credentials In Files](https://attack.mitre.org/techniques/T1552/001/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-053
// nosec vnx-sec-053
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-053 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
