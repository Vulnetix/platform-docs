---
title: How Wiz claims are verified
description: How the probe checks each Wiz claim from inside the AWS account, the five verdicts and what each does to the finding's triage state.
order: 31
nav: Verification
sources: [vdb-site/api/internal/handler/cloud_wiz_verification.go, cloudscan/wiz.go, cloudscan/README.md]
checked: [vdb-site@1a06d67, cloudscan@67eeabb]
updated: 02 Nov 2026
---

Wiz reasons from an agentless graph. The probe runs inside the account with a role that can read the resource. After each Wiz sync, Vulnetix invokes the probe with `{"mode": "wiz-verify", "runId": ...}`. The probe asks Vulnetix for its work list, resolves each ARN against the live account with the same describe calls the sweep uses, and posts one verdict per claim.

The work list carries the resource, the assertion type and the values to compare. It carries no Wiz prose, severity or remediation text, so the probe is never told the answer it is checking. The probe never receives a Wiz credential.

## Verdicts

| Verdict | Means | Triage state written | Resolves the finding |
|---|---|---|---|
| `confirmed` | The deployed version is below the fixed version Wiz named | `affected` | No |
| `false_positive` | The deployed version is at or past the fix | `false_positive`, justification `vulnerable_code_not_present` | Yes |
| `not_affected` | The version Wiz named is not the one deployed | `not_affected`, justification `vulnerable_code_not_present` | Yes |
| `resource_absent` | The ARN does not exist: Wiz is describing something deleted | `resolved`, justification `component_not_present` | Yes |
| `unverifiable` | A denied describe, an unreadable field, or nothing on the resource reports the version claimed | `under_investigation` | No |

A verdict never edits the Wiz row. It appends a second triage entry and a verification record naming the probe and its version, so the Wiz claim and the Vulnetix verdict show side by side on the finding page.

Two rules the probe keeps:

- It never concludes from absence of evidence. A failed describe is `unverifiable`, never `confirmed`.
- It never compares a version against a claim about something else. An RDS engine version says nothing about an OS package on the same host, so that is `unverifiable` too.

Control-type issues (configuration rather than a version) come back `unverifiable` with the observed configuration attached: the resource, its version, its public reachability and the path to it.
