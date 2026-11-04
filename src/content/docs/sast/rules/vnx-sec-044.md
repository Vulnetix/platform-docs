---
title: "VNX-SEC-044: Microsoft Teams webhook URL"
nav: "VNX-SEC-044"
description: "Reports complete Microsoft Teams incoming webhook URLs (webhook.office.com/webhookb2 and legacy outlook.office.com/webhook) written into files."
order: 938
sources: ["cli/internal/sast/rules/vnx-sec-044.rego", "cli/internal/sast/docs/vnx-sec-044.md"]
checked: ["cli@1700795"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-044` |
| Severity | High |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `secrets` `teams` `webhook` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-044.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-044.rego) |

## Overview

This rule reports a complete Microsoft Teams incoming webhook URL: `https://<tenant>.webhook.office.com/webhookb2/<group-guid>@<tenant-guid>/IncomingWebhook/<32-hex>/<guid>` and the legacy `https://outlook.office.com/webhook/...` and `outlook.office365.com` forms. Truncated URLs, placeholder GUIDs (all zeros, `xxxxxxxx-...`), URLs read from the environment, Power Automate workflow URLs and test, fixture and vendored paths are not reported, and the snippet is redacted. These URLs grant the ability to post messages to a Teams channel and are commonly leaked in CI logs and public config files.

## Why this matters

A leaked Teams webhook URL lets any attacker post to the channel, which is often the same channel where incident-response and security alerts are delivered. The attacker can use this for phishing (fake "your password expires today" messages), social engineering, or simply to drown out real alerts with noise.

Microsoft has deprecated the legacy Office 365 Connectors in favour of Workflows, but a large number of pre-2025 webhooks remain valid.

## Remediation

1. **Delete the webhook in Teams** → Channel • • • → Connectors → Incoming Webhook → Configure → Delete.
2. **Migrate to a Power Automate workflow** with an HTTP trigger and an Azure AD-protected endpoint.
3. **Store the new webhook URL in Azure Key Vault or GitHub Actions secrets**.
4. **Audit Teams channel activity** for messages you did not post.
5. **Purge from git history** with `git filter-repo`.

## References

- [Microsoft Teams Incoming Webhooks](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook)
- [Microsoft 365 Connectors retirement](https://devblogs.microsoft.com/microsoft365dev/retirement-of-office-365-connectors-within-microsoft-teams/)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [gitleaks `microsoft-teams-webhook`](https://github.com/gitleaks/gitleaks)
- [MITRE ATT&CK T1566 – Phishing](https://attack.mitre.org/techniques/T1566/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-044
// nosec vnx-sec-044
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-044 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
