---
title: "VNX-SEC-040: GitLab pipeline trigger / deploy / runner token"
nav: "VNX-SEC-040"
description: "Reports a GitLab infrastructure token by its documented prefix and body shape: pipeline trigger (glptt- + 40 hex), deploy (gldt-), runner authentication (glrt-), runner registration (GR1348941), Kubernetes agent (glagent-), CI job (glcbt-), OAuth application secret (gloas-), incoming mail (glimt-), feature-flag client (glffct-), feed (glft-) and SCIM (glsoat-) tokens. A prefix without a token body of the right length, placeholders and test or fixture paths are not reported; glpat- access tokens are VNX-SEC-039."
order: 934
sources: ["cli/internal/sast/rules/vnx-sec-040.rego", "cli/internal/sast/docs/vnx-sec-040.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-040` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `gitlab` `ci` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-040.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-040.rego) |

## Overview

This rule detects GitLab infrastructure tokens for pipeline triggers, deploy tokens, runner authentication, Kubernetes agents, CI/CD jobs, OAuth applications, incoming mail, feature flags, feeds, SCIM provisioning, and runner registration.

## Why this matters

Each of these tokens grants a specific kind of automated access. A leaked runner authentication token (glrt-) lets the attacker register their own runner and execute arbitrary code inside your CI jobs. A leaked Kubernetes agent token (glagent-) gives the attacker a foothold in your cluster.

## What gets flagged

Flagged (prefix plus a token body of the documented shape):

```yaml
script:
  - curl -X POST -F token=glptt-<40 hex> -F ref=main https://gitlab.com/api/v4/projects/42/trigger/pipeline
```

```toml
[[runners]]
  token = "glrt-<20+ characters>"
```

Also `gldt-` deploy, `GR1348941` runner registration, `glagent-` agent, `glcbt-` CI job, `gloas-` OAuth secret, `glimt-` incoming mail, `glffct-` feature-flag, `glft-` feed and `glsoat-` SCIM tokens.

Not flagged: a prefix named in prose, a CSS class such as `.glft-icon-container-wrapper`, `$CI_JOB_TOKEN`, placeholders, and test or fixture files.

## Remediation

1. **Revoke the token in GitLab** in the corresponding settings page (Project → Settings → CI/CD for runners, Admin → Tokens for runners, etc.).
2. **Use a CI/CD variable** (Settings → CI/CD → Variables, masked + protected) to inject the token at job time.
3. **Audit the GitLab audit log** for any pipeline / deploy / runner activity you did not initiate.
4. **Purge from git history** with `git filter-repo`.

## References

- [GitLab CI/CD Variables](https://docs.gitlab.com/ee/ci/variables/)
- [GitLab Runner Registration](https://docs.gitlab.com/runner/register/)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [GitLab Secret Detection](https://docs.gitlab.com/ee/user/application_security/secret_detection/)
- [MITRE ATT&CK T1552.001](https://attack.mitre.org/techniques/T1552/001/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-040
// nosec vnx-sec-040
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-040 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
