---
title: "VNX-SEC-039: GitLab personal access token (legacy)"
nav: "VNX-SEC-039"
description: "Reports a GitLab personal, project or group access token: a standalone glpat- token followed by 20 or more base64url characters (the legacy 20-character form and the longer routable form). Placeholders, a body of lower-case words such as glpat-personal-access-token-here, and test or fixture paths are not reported; other GitLab token types are VNX-SEC-040."
order: 933
sources: ["cli/internal/sast/rules/vnx-sec-039.rego", "cli/internal/sast/docs/vnx-sec-039.md"]
checked: ["cli@1700795"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-039` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `gitlab` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-039.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-039.rego) |

## Overview

This rule detects GitLab personal access tokens matching the `glpat-[\w-]{20}` pattern. These tokens grant API access to the user's GitLab account including the ability to clone private repos, push code, read the container registry, and access package registries.

## Why this matters

A leaked GitLab PAT can be used to exfiltrate source code, push malicious commits to private repos, and access the GitLab container and package registries, which often hold production Docker images. GitLab Enterprise audit logs will show the token's IP and user-agent for every API call.

## What gets flagged

Flagged (legacy 20-character and routable `glpat-` tokens):

```python
gl = gitlab.Gitlab("https://gitlab.com", private_token="glpat-<20 characters>")
```

```bash
git clone https://oauth2:glpat-<20 characters>@gitlab.com/acme/app.git
```

Not flagged: `os.environ["GITLAB_TOKEN"]`, `glpat-xxxxxxxxxxxxxxxxxxxx`, `glpat-<your-access-token>`, a truncated example such as `glpat-abc123`, and test or fixture files.

## Remediation

1. **Revoke the token in GitLab user settings** → Access Tokens.
2. **Audit the GitLab audit log** for API calls you did not initiate.
3. **Use a project access token or deploy key** with the minimum required scopes instead of a personal token.
4. **For CI, use GitLab CI/CD job tokens** which are short-lived and bound to a single pipeline.
5. **Purge from git history** with `git filter-repo`.

## References

- [GitLab Personal Access Tokens](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [gitleaks `gitlab-pat`](https://github.com/gitleaks/gitleaks)
- [MITRE ATT&CK T1552.001](https://attack.mitre.org/techniques/T1552/001/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-039
// nosec vnx-sec-039
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-039 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
