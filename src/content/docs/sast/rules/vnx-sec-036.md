---
title: "VNX-SEC-036: Heroku API key"
nav: "VNX-SEC-036"
description: "Reports a Heroku platform API key: a standalone v2 key (HRKU-AA followed by 58 characters), or a legacy UUID-format key assigned to a name that contains heroku and key, token or secret (HEROKU_API_KEY=..., heroku_api_token: ..., ENV['HEROKU_API_KEY'] ||= ...), or sent as a Bearer token on a line that calls api.heroku.com. A bare UUID without that context, placeholder or example UUIDs and test or fixture paths are not reported."
order: 930
sources: ["cli/internal/sast/rules/vnx-sec-036.rego", "cli/internal/sast/docs/vnx-sec-036.md"]
checked: ["cli@1700795"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-036` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `heroku` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-036.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-036.rego) |

## Overview

This rule detects Heroku API keys (v2 format) matching the `HRKU-AA[0-9a-zA-Z_-]{58}` pattern. Heroku API keys grant full account access including the ability to deploy applications, modify add-ons (e.g. Postgres, Redis), and read environment variables containing credentials.

## Why this matters

A leaked Heroku API key is sufficient to push a malicious build to a production app, attach to the production database, and exfiltrate customer data. Because Heroku's git push deploy model is git-based, the attacker can deploy without re-authentication if they have a key with `deploy` scope.

## What gets flagged

Flagged:

```bash
HEROKU_API_KEY=HRKU-AA<58 characters>
export HEROKU_API_KEY=<uuid>          # legacy key, named as a Heroku key or token
```

Not flagged: a UUID assigned to a name without both `heroku` and key/token/secret (`HEROKU_APP_ID`, `REQUEST_ID`), `ENV["HEROKU_API_KEY"]`, the all-zero UUID and other placeholders, and test or fixture files.

## Remediation

1. **Regenerate the API key** in the Heroku account settings.
2. **Use platform API OAuth tokens** for CI instead of long-lived API keys.
3. **Store the new key in Heroku Config Vars** or an external secrets manager.
4. **Audit recent deploys** in the Heroku activity log.
5. **Purge from git history** with `git filter-repo` and re-scan.

## References

- [Heroku API Authentication](https://devcenter.heroku.com/articles/authentication)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [gitleaks `heroku-api-key-v2`](https://github.com/gitleaks/gitleaks)
- [MITRE ATT&CK T1552.001](https://attack.mitre.org/techniques/T1552/001/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-036
// nosec vnx-sec-036
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-036 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
