---
title: "VNX-SEC-042: Slack webhook URL"
nav: "VNX-SEC-042"
description: "Reports complete Slack incoming, workflow and trigger webhook URLs (hooks.slack.com) written into files; placeholder URLs are not reported."
order: 936
sources: ["cli/internal/sast/rules/vnx-sec-042.rego", "cli/internal/sast/docs/vnx-sec-042.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-042` |
| Severity | High |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `secrets` `slack` `webhook` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-042.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-042.rego) |

## Overview

This rule reports a complete Slack webhook URL: an incoming webhook `https://hooks.slack.com/services/T<team>/B<bot>/<24-character secret>` and a Workflow Builder or trigger webhook `https://hooks.slack.com/workflows/...` or `/triggers/...` ending in a 32-character secret. A URL without its secret segment, the documentation placeholder `T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`, URLs built from the environment and test, fixture and vendored paths are not reported, and the snippet is redacted. Slack webhooks let anyone who knows the URL post arbitrary messages to the channel the webhook is wired to. They cannot read messages, but they are routinely abused for phishing (fake "your account was compromised" alerts), spam, and pivoting into a workspace's trust graph.

## Why This Matters

Webhook URLs are long, high-entropy strings, but unlike API tokens they are routinely pasted into code samples, blog posts, and Stack Overflow answers. Once exposed, the only way to invalidate them is to delete the webhook in the Slack app configuration and create a new one. Because Slack does not surface webhook URLs in any secret-scanning program, they often go unnoticed in public repos for years.

## What Gets Flagged

```python
# FLAGGED: a real team id, bot id and 24-character secret
WEBHOOK = "https://hooks.slack.com/services/T4Q7ZK2M9/B07H3RJ5WQ2/<24-character secret>"
requests.post(WEBHOOK, json={"text": text})

# NOT FLAGGED: the documentation placeholder, or the URL read at runtime
WEBHOOK = "https://hooks.slack.com/services/" + "T00000000/B00000000/" + "X" * 24  # the documented placeholder
WEBHOOK = os.environ["SLACK_WEBHOOK_URL"]
```

## Remediation

1. **Delete the webhook in api.slack.com** → Your App → Incoming Webhooks. The old URL immediately stops accepting posts.
2. **Create a new webhook** and store its URL in a secrets manager (AWS Secrets Manager, GitHub Actions secrets, HashiCorp Vault).
3. **If you must reference a webhook in a public repo** (e.g. example code), use a clearly fake placeholder like `https://hooks.slack.com/services/REPLACE/WITH/YOUR-WEBHOOK-URL`.
4. **Audit Slack audit logs** for posts you did not initiate between the time the URL was committed and the revocation.
5. **Consider migrating to a Slack app with OAuth** so users can revoke access at any time without rotating a single secret.

## References

- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [gitleaks `slack-webhook-url`](https://github.com/gitleaks/gitleaks)
- [truffleHog `SlackWebhook`](https://github.com/trufflesecurity/trufflehog)
- [MITRE ATT&CK T1566 – Phishing](https://attack.mitre.org/techniques/T1566/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-042
// nosec vnx-sec-042
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-042 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
