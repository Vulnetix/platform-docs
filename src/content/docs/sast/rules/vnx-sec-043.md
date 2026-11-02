---
title: "VNX-SEC-043: Twilio API key"
nav: "VNX-SEC-043"
description: "Reports Twilio API key SIDs (SK followed by exactly 32 lowercase hex characters, standing alone) written into files."
order: 937
sources: ["cli/internal/sast/rules/vnx-sec-043.rego", "cli/internal/sast/docs/vnx-sec-043.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-043` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `twilio` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-043.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-043.rego) |

## Overview

This rule reports a Twilio API key SID: `SK` followed by exactly 32 lowercase hexadecimal characters, not inside a longer word or hex run (`DISK3f2a...`, `TASK...`, a 34-character hash). Placeholders (`SKxxxx...`, `SK000...`), low-entropy values and test, fixture and vendored paths are not reported, and the snippet is redacted. Account SIDs (`AC...`) are identifiers and are not reported. These keys (different from the Account SID + Auth Token pair) are issued via the Twilio console and grant the ability to send SMS, make voice calls, and read account logs.

## Why This Matters

A leaked Twilio API key is sufficient to drain the account balance via SMS pumping fraud (sending thousands of messages to premium-rate numbers controlled by the attacker) or to use the account for phishing and account-takeover campaigns (e.g. by sending "your account was compromised, click here" messages).

## Remediation

1. **Delete the API key in the Twilio console** → Account → API keys & tokens.
2. **Enable geo-permissions and 2FA on the Twilio account** to limit blast radius.
3. **Store the new key in Twilio Vault, AWS Secrets Manager, or a CI secret store**.
4. **Audit the Twilio usage logs** for SMS sent to numbers you did not intend to contact.
5. **Purge from git history** with `git filter-repo`.

## References

- [Twilio API Keys](https://www.twilio.com/docs/iam/api-keys)
- [Twilio SMS Pumping Fraud mitigation](https://www.twilio.com/docs/messaging/compliance/sms-pumping)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [gitleaks `twilio-api-key`](https://github.com/gitleaks/gitleaks)
- [truffleHog Twilio detector](https://github.com/trufflesecurity/trufflehog)
- [MITRE ATT&CK T1552.001](https://attack.mitre.org/techniques/T1552/001/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-043
// nosec vnx-sec-043
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-043 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
