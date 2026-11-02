---
title: "VNX-SEC-034: Alibaba Cloud access key"
nav: "VNX-SEC-034"
description: "Reports an Alibaba Cloud RAM AccessKey ID: a standalone token of LTAI followed by 12 or 20 letters and digits (the 16- and 24-character ID formats), in either case. A token made of letters only in a single case, placeholder values and test or fixture paths are not reported; the AccessKey secret is covered by VNX-SEC-161 and STS keys by VNX-SEC-145."
order: 928
sources: ["cli/internal/sast/rules/vnx-sec-034.rego", "cli/internal/sast/docs/vnx-sec-034.md"]
checked: ["cli@de9b52a"]
updated: "02 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-SEC-034` |
| Severity | Critical |
| SARIF level | `error` |
| Kind | `secrets` |
| Languages | Any file |
| CWE | [CWE-798](https://cwe.mitre.org/data/definitions/798.html) |
| CAPEC | [CAPEC-191](https://capec.mitre.org/data/definitions/191.html) |
| ATT&CK | [T1552.001](https://attack.mitre.org/techniques/T1552/001/) |
| CWSS vector | `CWSS:1.0/TI:C/AP:A/AL:A/IC:N/FC:LT/RP:N/RL:A/AV:I/AS:N/IN:A/SC:A/BI:C/DI:H/EX:H/EC:N/P:W` |
| Tags | `secrets` `alibaba` `credentials` |
| Source | [`internal/sast/rules/vnx-sec-034.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-sec-034.rego) |

## Overview

This rule detects Alibaba Cloud access key IDs matching the `LTAI[a-z0-9]{20}` pattern. Alibaba keys are 24 characters long, always begin with `LTAI`, and grant the holder the RAM permissions of the associated user. They are frequently committed by developers working with Aliyun OSS, ECS, or Function Compute.

## Why This Matters

Alibaba Cloud hosts a large share of Asia-Pacific e-commerce workloads. A leaked key allows an attacker to spin up ECS instances for cryptomining, exfiltrate OSS bucket contents, manipulate RDS databases, or pivot through RAM roles. Alibaba's RAM service provides CloudTrail-equivalent audit logs via ActionTrail; review `CreateAccessKey`, `RunInstances`, and `GetObject` calls you did not initiate.

## What Gets Flagged

Flagged (a standalone `LTAI` ID of 16 or 24 characters, mixed letters and digits):

```python
config = Config(access_key_id="LTAI5t<18 letters and digits>",
                access_key_secret=os.environ["ALIYUN_SECRET"])
```

Not flagged: `os.getenv("ALIBABA_CLOUD_ACCESS_KEY_ID")`, `LTAIxxxxxxxxxxxxxxxxxxxx`, a word such as `LTAIWANESEMARK`, `LTAI` inside a longer identifier, and test or fixture files. The AccessKey secret is VNX-SEC-161.

## Remediation

1. **Revoke the key in the Alibaba Cloud RAM console** → Users → AccessKey. Do not delete until you have rotated.
2. **Replace with RAM Role + STS tokens** when running on ECS, ECI, or Function Compute, STS tokens expire in 1 hour by default.
3. **Purge from git history** with `git filter-repo` then re-scan with `gitleaks detect --source .`.
4. **Enable ActionTrail** if not already on, so you can audit any unauthorised use.
5. **Adopt the principle of least privilege**: even the new key should only carry the permissions the workload strictly needs.

## References

- [Alibaba Cloud RAM access keys](https://www.alibabacloud.com/help/en/ram/user-guide/create-an-accesskey-pair)
- [Alibaba Cloud STS](https://www.alibabacloud.com/help/en/ram/user-guide/overview-of-sts)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- [gitleaks `alibaba-access-key-id`](https://github.com/gitleaks/gitleaks)
- [MITRE ATT&CK T1552.001](https://attack.mitre.org/techniques/T1552/001/)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-sec-034
// nosec vnx-sec-034
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-sec-034 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
