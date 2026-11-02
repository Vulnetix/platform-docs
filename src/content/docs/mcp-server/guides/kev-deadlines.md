---
title: Meet a KEV deadline
description: Find CISA KEV due dates that apply to your dependencies, order the work by days remaining, and record a position when a date cannot be met.
order: 4
nav: KEV deadlines
sources:
  - mcp-server/src/tools/intel.ts
  - mcp-server/src/shaping/filters/exploits.ts
  - mcp-server/src/shaping/filters/remediation.ts
  - mcp-server/src/prompts/generated.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

The CISA Known Exploited Vulnerabilities catalogue is a security list with a date attached. For US federal agencies under BOD 22-01 it is binding; for everyone else it is the strongest public signal that something is used against real systems.

## What has been added

```text
What was added to the KEV catalogue recently?
```

`vulnetix_kev` pages the catalogues (`limit` up to 200):

```json
{
  "count": 1247,
  "sources": ["CISA", "vulnetix", "enisa", "vulncheck"],
  "hasMore": true,
  "items": [{
    "cveId": "CVE-2026-XXXXX",
    "vendor": "Microsoft",
    "product": "Windows",
    "dateAdded": "2026-08-10T06:01:14Z",
    "dueDate": "2026-08-31T00:00:00Z",
    "knownRansomware": "Known",
    "requiredAction": "Apply mitigations per vendor instructions..."
  }]
}
```

> [!CAREFUL] Only CISA rows carry `dueDate`
> VulnCheck, ENISA and Vulnetix rows record membership with no deadline. A null `dueDate` means that source issues none. If BOD 22-01 applies to you, the CISA row is the one that binds.

## Does it apply to you

For one advisory, `vulnetix_kev_status` is the direct check. For your whole dependency tree, ask the agent to intersect the catalogue with your manifests:

```text
List the KEV entries added in the last 30 days. For each, check with vulnetix_package_vulns whether
any package in this repository's lockfiles is affected at the installed version.
```

For a specific advisory against this repository:

```text
/mcp__vulnetix__vulnetix_repo_impact CVE-2026-XXXXX
```

## Order by what is due

Sort by `dueDate`, not severity. A CVSS 7.5 due in six days outranks a CVSS 9.8 with no deadline.

`vulnetix_remediation` marks overdue entries:

```json
"kevEntries": [{
  "dateAdded": "2021-12-10T00:00:00Z",
  "dueDate": "2021-12-24T00:00:00Z",
  "daysUntilDue": -1691,
  "overdue": true,
  "knownRansomwareCampaignUse": "Known"
}]
```

## Close them

```text
/mcp__vulnetix__vulnetix_fix CVE-2026-XXXXX
/mcp__vulnetix__vulnetix_verify_fix CVE-2026-XXXXX
```

`verify_fix` re-scans and records the verdict in `.vulnetix/memory.yaml`, which is the evidence.

## When the date cannot be met

1. `vulnetix_workarounds` for mitigations without a patch.
2. `vulnetix_detection_rules` for detection while exposed.
3. `/mcp__vulnetix__vulnetix_vex_publish` to record the justification as a VEX statement.

A documented, mitigated and monitored exception is defensible. A silent miss is not.
