---
title: Jail exemptions
nav: Exemptions
description: Time-boxed waivers of one Jail rule or a whole policy for a repository, their limits, and why they never change the reported evidence.
order: 3
sources: [saas/prisma/models/jail.prisma, cli/cmd/jail.go, cli/cmd/config_jail.go, vdb-site/api/internal/handler/jail_policy.go]
checked: [cli@4c8c3b7, vdb-site@1a06d67, saas@50cedf37]
updated: 02 Nov 2026
---

An exemption waives one rule, or every rule in the policy, for one repository until a date.

## Create

```bash
vulnetix jail exempt --rule 3f6c2a1e-0000-4000-8000-000000000000 \
  --reason "tracked in JIRA-42, fix lands in 2.4.0" --expires 336h
```

| Flag | Default | Meaning |
|---|---|---|
| `--rule` | none | Rule UUID. Omit to exempt every rule in the policy. |
| `--reason` | required | Why. At least 8 characters; recorded with who approved it. |
| `--expires` | `720h` (30 days) | Go duration. Capped at 365 days by the server. |
| `--path` | `.` | Repository whose identity is used |

Rule UUIDs are shown by `vulnetix jail list` and `vulnetix jail explain`. The same command is available as `vulnetix config set jail exempt`.

## Retire

```bash
vulnetix jail exempt --deactivate 9a1b2c3d-0000-4000-8000-000000000000 \
  --deactivate-reason "fixed in 2.4.0"
```

Retiring records who did it, when, and why. The row is kept.

## Limits

| Limit | Value | Server error |
|---|---|---|
| Reason | at least 8 characters | `a reason of at least 8 characters is required` |
| Default expiry | 30 days | |
| Maximum expiry | 365 days; a later date is cut to 365 days | |
| Repository | must have a policy that applies to it | `no jail policy applies to that repository` |

## Exemptions never hide the evidence

An exemption applies after the rule is aggregated. The verdict is `exempt`, and it still reports the real observed value, the threshold, that the rule would have breached, and which exemption suppressed it. An exemption that zeroed a count would let policy erode without anyone noticing.

Exemptions expire by design. A permanent waiver is a policy change and belongs in the policy, where people can see it.

## Listing

The console's Jail page lists active exemptions per repository with their reason, approver and expiry.
