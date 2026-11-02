---
title: "VNX-SEC-049: Anthropic admin API key"
nav: "VNX-SEC-049"
description: "Reports a complete Anthropic Admin API key (sk-ant-admin01-, a 93-character body and the AA terminator) in any file; prefixes, truncated keys, placeholders and test paths are not reported."
order: 943
sources: ["cli/internal/sast/rules/vnx-sec-049.rego", "cli/website/content/docs/sast-rules/vnx-sec-049.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-049` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `anthropic` `ai` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-049.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-049.rego) |

## Overview

This rule reports a complete Anthropic Admin API key in any file: source, `.env`, YAML or a shell script. The token must be whole: `sk-ant-admin01-`, a 93-character body, and the closing `AA`. A bare prefix, a truncated key, a placeholder body (`xxxx…`, `your-admin-key-here`), keys under test, fixture or vendored paths, and ordinary `sk-ant-api03-` workspace keys are not reported.

### What Gets Flagged

```python
ADMIN_KEY = "sk-ant-admin01-<93 characters>AA"
```

```sh
curl -H "x-api-key: sk-ant-admin01-<93 characters>AA" https://api.anthropic.com/v1/organizations/users
```

## Why This Matters

Hardcoded anthropic admin api key values are routinely scraped by automated bots within minutes of a public push, and then used to access the account, exfiltrate data, or pivot into downstream services. Once the credential is in git history it is permanently in third-party hands.

## Remediation

1. **Revoke the leaked credential** in the provider's console immediately.
2. **Replace with a short-lived alternative**, OAuth 2.0 access tokens, IAM role assumption, OIDC federation, wherever the platform supports it.
3. **Store the new credential in a secrets manager** (AWS Secrets Manager, HashiCorp Vault, GitHub Actions secrets, Doppler).
4. **Audit the provider's access logs** for activity you did not initiate between the leak and the revocation.
5. **Purge from git history** with `git filter-repo` or BFG, then re-scan with gitleaks/truffleHog to confirm no other secrets remain.
6. **Enable push protection** so future commits are blocked at the developer machine.

## References

- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- gitleaks `anthropic-admin-api-key`
- [truffleHog](https://github.com/trufflesecurity/trufflehog)
- [OWASP Credentials Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Credentials_Management_Cheat_Sheet.html)
- [MITRE ATT&CK T1552.001 – Credentials In Files](https://attack.mitre.org/techniques/T1552/001/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-049
// nosec vnx-sec-049
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-049 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
