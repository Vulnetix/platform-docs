---
title: Log ingest targets
description: Where cloud logs go with each Vulnetix integration, which stay in your account, which are read in place, and the HTTPS endpoints that accept pushed logs.
order: 40
nav: Log ingest targets
sources: [vdb-site/api/internal/handler/assets/aws-pipeline.yaml, cloudscan/README.md, siem/aws/vulnetix-siem.yaml, siem/worker/src/index.ts, siem/worker/src/ingest/routes.ts, siem/worker/src/ingest/tokens.ts]
checked: [vdb-site@1a06d67, cloudscan@67eeabb, siem@e0f71fa]
updated: 02 Nov 2026
---

Two Vulnetix products touch your cloud logs, and they handle them differently:

- **Cloud security** (this segment) reads logs **in place**, inside your account. CloudTrail objects and network logs never leave the account; only findings are reported.
- **Guardian**, the SIEM, takes logs **by push** to an HTTPS endpoint and stores them for search, detection rules and alerts. See [/siem/](/siem/).

## Read in place by the probe

| Log | Where it lives | Who reads it | Used for |
|---|---|---|---|
| CloudTrail management events | Trail `vulnetix-management-events`, bucket `vulnetix-cloudtrail-<your-account-id>`, in your account | The probe, through `vulnetix-reporter-logdata` | Verification, and seeding the resource ledger from history (30 days by default, at most 90) |
| CloudTrail write events | EventBridge rule `vulnetix-cloudtrail-to-reporter` to queue `vulnetix-security-reporter` | The probe | The resource ledger: which repository or CI session created a resource, and an independent record of resources a sweep failed to enumerate |
| Route 53 Resolver query logs | CloudWatch Logs, in your account | The probe, with the `network-logs` source | Matching names against indicators, last 24 hours |
| VPC flow logs | CloudWatch Logs, in your account | The probe, with the `network-logs` source | Matching addresses against indicators, last 24 hours |

Resolver and flow logs delivered to S3 or Firehose are not read by the probe; the run records the gap `log-destination-not-cloudwatch`. See [Compute runtime](/cloud-security/sources/compute/#extension-network-logs).

## Pushed to Guardian

All push targets are on `https://ingest.vulnetix.com`. Each needs a Guardian ingest token of the matching kind (`aws`, `cloudflare` or `events`), created on the Guardian Sources page and shown once. A token of one kind is refused on another kind's route with `401`.

| Target | Method and path | Auth | Body |
|---|---|---|---|
| VPC flow logs | `POST /v1/ingest/aws/flow` | Firehose access key (`X-Amz-Firehose-Access-Key`) | Firehose HTTP endpoint delivery |
| Route 53 Resolver query logs | `POST /v1/ingest/aws/dns` | Firehose access key | Firehose HTTP endpoint delivery |
| CloudTrail through EventBridge | `POST /v1/ingest/aws/cloudtrail` | Firehose access key | Firehose HTTP endpoint delivery |
| Cloudflare Logpush | `POST /v1/ingest/cloudflare/<dataset>` | `Authorization: Bearer <token>` | Logpush gzip ndjson |
| Your own events, and the runtime sensor | `POST /v1/ingest/events` | `Authorization: Bearer <token>` | `{"source": "...", "events": [{"table": "...", "row": {...}}]}`, at most 5,000 events |

The AWS routes are what the Guardian delivery CloudFormation stack (`vulnetix-siem`) wires up; deploy it per region from the Guardian Sources page. Its CloudTrail stream carries management write events only while a trail logs them, and the cloud security trail `vulnetix-management-events` does. Details: [Guardian AWS log shipping](/siem/sources/aws/), [Cloudflare](/siem/sources/cloudflare/), [Events API](/siem/sources/events/). The runtime sensor forwards to the events route: [Vulnetix sensor](/virtual-patching/runtime/sensor/).

Guardian needs the Business plan with a Guardian ingest pack. Cloud security needs Pro. The two are independent: you can run either without the other.
