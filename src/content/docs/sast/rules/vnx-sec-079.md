---
title: "VNX-SEC-079: GitHub fine-grained personal access token"
nav: "VNX-SEC-079"
description: "Reports a whole GitHub fine-grained personal access token (github_pat_ with its 22 and 59 character parts) in any file, excluding placeholders, truncated tokens, prefix checks, CI-secret references and test files."
order: 973
sources: ["cli/internal/sast/rules/vnx-sec-079.rego", "cli/website/content/docs/sast-rules/vnx-sec-079.md"]
checked: ["cli@4c8c3b7"]
updated: "01 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-079` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `github` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-079.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-079.rego) |

## Overview

This rule reports a GitHub fine-grained personal access token, `github_pat_` followed by 22 alphanumeric characters, an underscore and 59 more, on its own, assigned, in an `Authorization` header or inside a clone URL. The token is redacted in the finding's snippet.

## Why This Matters

Hardcoded github fine-grained personal access token values are routinely scraped by automated bots within minutes of a public push, and then used to access the account, exfiltrate data, or pivot into downstream services. Once the credential is in git history it is permanently in third-party hands.

## What Gets Flagged

```javascript
// FLAGGED
export const octokit = new Octokit({ auth: "github_pat_<22 characters>_<59 characters>" });
```

```bash
# FLAGGED: token inside a clone URL
git clone https://x-access-token:github_pat_<22>_<59>@github.com/acme/infra.git
```

Not flagged:

- Classic `ghp_` tokens (VNX-SEC-004 reports them).
- Prefix checks (`strings.HasPrefix(t, "github_pat_")`), truncated tokens and placeholders (`github_pat_xxxx...`).
- CI-secret references (`${{ secrets.RELEASE_PAT }}`).
- Test, fixture, vendored and generated files.

VNX-SEC-004 also reports these tokens as part of its wider GitHub/GitLab set.

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
# nosec vnx-sec-079
// nosec vnx-sec-079
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-079 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
