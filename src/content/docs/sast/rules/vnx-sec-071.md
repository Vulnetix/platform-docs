---
title: "VNX-SEC-071: GitLab session cookie"
nav: "VNX-SEC-071"
description: "Detects captured GitLab session cookie values (_gitlab_session with a 32-hex session id) in any file."
order: 965
sources: ["cli/internal/sast/rules/vnx-sec-071.rego", "cli/internal/sast/docs/vnx-sec-071.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-071` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `gitlab` `session` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-071.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-071.rego) |

## Overview

This rule reports `_gitlab_session` followed by `=` (a `Cookie` header, `document.cookie`, a curl argument) by a quoted or symbol key and `:`/`=`/`=>` (a cookies dict, hash or object), by a call argument pair (`cookies.set("_gitlab_session", "...")`) or by a tab (Netscape `cookies.txt`); or a cookie object whose `"name"` is `_gitlab_session` with its `"value"` on the same line or up to 12 lines below, as browser cookie exports write it; and then a 32-character lowercase hexadecimal session id. The value is masked in the snippet.

It does not report the cookie name on its own (Rails `session_store key: "_gitlab_session"`), a value read from a variable or the environment, placeholder values (all zeros, `xxxx...`), and generated, vendored and test-suffixed files.

## What gets flagged

```sh
curl -s -H "Cookie: _gitlab_session=<32 hex>" https://gitlab.acme-corp.io/api/v4/projects
```

```python
cookies = {"_gitlab_session": "<32 hex>"}
```

Not flagged:

```python
cookies = {"_gitlab_session": os.environ["GITLAB_SESSION"]}
```

## Why this matters

Hardcoded gitlab session cookie values are routinely scraped by automated bots within minutes of a public push, and then used to access the account, exfiltrate data, or pivot into downstream services. Once the credential is in git history it is permanently in third-party hands.

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
# nosec vnx-sec-071
// nosec vnx-sec-071
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-071 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
