---
title: "VNX-SEC-041: Atlassian API token"
nav: "VNX-SEC-041"
description: "Reports Atlassian Cloud API tokens (ATATT3 prefix, and legacy 24-character tokens assigned to Jira/Confluence/Atlassian token fields) written into files."
order: 935
sources: ["cli/internal/sast/rules/vnx-sec-041.rego", "cli/internal/sast/docs/vnx-sec-041.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-041` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `atlassian` `jira` `confluence` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-041.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-041.rego) |

## Overview

This rule reports an Atlassian Cloud API token: the current `ATATT3`-prefixed token (about 190 base64url characters ending in a checksum) wherever it stands alone in a line, and a legacy 24-character alphanumeric token quoted as the value of a field named for Atlassian, Jira or Confluence and a token, key, secret or password (`jira_api_token: "..."`). Placeholders (`ATATT3xxxx...`, `your-jira-api-token-here`), truncated tokens, low-entropy legacy values, environment lookups and test, fixture and vendored paths are not reported, and the snippet is redacted. These tokens grant API access to Jira, Confluence, Bitbucket Cloud, and other Atlassian Cloud products using the account of the issuing user.

## Why this matters

A leaked Atlassian API token can be used to read confidential Jira issues, exfiltrate Confluence spaces (which often hold architecture diagrams, credentials, and runbooks), and pull private Bitbucket repositories. Because Atlassian Cloud has no IP allow-listing by default, the token works from any host on the public internet.

## Remediation

1. **Revoke the API token in id.atlassian.com/manage-profile/security/api-tokens**.
2. **Use OAuth 2.0 (3LO) authorization** for any integration that needs user-context access.
3. **Audit the Atlassian audit log** for API calls you did not initiate.
4. **Purge from git history** with `git filter-repo`.

## References

- [Atlassian API Tokens](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/)
- [Atlassian OAuth 2.0](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [gitleaks `atlassian-api-token`](https://github.com/gitleaks/gitleaks)
- [MITRE ATT&CK T1552.001](https://attack.mitre.org/techniques/T1552/001/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-041
// nosec vnx-sec-041
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-041 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
