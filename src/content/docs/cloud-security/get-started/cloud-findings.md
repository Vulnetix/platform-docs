---
title: Cloud findings
description: What a cloud finding is, the filters on the Cloud page, how a resource is attributed to the repository that deployed it, and when a sweep may resolve a finding.
order: 3
sources: [vdb-site/api/internal/handler/cloud_findings.go, vdb-site/api/internal/handler/cloud_findings_grouped.go, vdb-site/api/main.go, saas/prisma/models/cloud.prisma, cloudscan/README.md]
checked: [vdb-site@1a06d67, saas@50cedf37, cloudscan@67eeabb]
updated: 02 Nov 2026
---

A cloud finding names one resource ARN and one CVE (or control). The verdict comes from evaluating a CRIT record's criteria against that resource, and the criteria evaluated, with what each saw, are served with the finding as its evidence. It is a finding with category `cloud`, so triage, suppressions, VEX and exports work as for any other finding.

## The Cloud page

**Resolve > Cloud** (`/resolve/cloud`) shows findings grouped by vulnerability by default: one CVE against 68 resources is 68 findings and one decision. Filters on `GET /v1/cloud-findings`:

| Parameter | Filters on |
|---|---|
| `region` | AWS region |
| `service` | AWS service of the resource |
| `accountId` | Connected account |
| `verdict` | CRIT verdict |
| `findingId` | The CVE or control id |
| `repo` | The attributed repository |
| `iacTool` | The tool that deployed the resource |
| `tool` | Scanner (for example `Amazon Inspector`, `Wiz`) |
| `exposed=1` | Only resources reachable from the internet |
| `q` | Free text |
| `includeResolved=1` | Include resolved findings |

Other views: `GET /v1/cloud-findings/by-vulnerability`, `GET /v1/cloud-findings/coverage`, `GET /v1/cloud-findings/runtime` (the Runtime page), `GET /v1/cloud-findings/{findingUuid}`.

## Which repository deployed it

The sweep derives the repository from what the account records, and stores which rule fired with a confidence:

| Method | Source |
|---|---|
| `resource-tag` | A repository tag on the resource |
| `cfn-stack-tag` | A repository tag on its CloudFormation stack |
| `ci-oidc-subject` | The OIDC subject of the CI session that wrote it, joined from the `AssumeRoleWithWebIdentity` event in CloudTrail |
| `ci-session-tag` | Session tags on the assume-role call |
| `ci-session-name` | The role session name, when it parses as `owner/name` |
| `cfn-stack-metadata` | The stack description |

The first rule that produces a repository wins. A resource created by hand has no repository, and the field stays empty.

## Coverage and resolution

Each sweep writes a coverage record: regions attempted, succeeded and skipped, ARNs and resource types seen, CRIT answers fetched or cached, access denials and throttles. A sweep only resolves a finding by absence when its scope was read completely. ARNs that CloudTrail shows but the sweep did not enumerate count as a gap and block resolution in the scopes they touch.
