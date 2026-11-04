---
title: AWS
description: Ship VPC flow logs, Route 53 Resolver query logs and CloudTrail events to Guardian with the vulnetix-siem CloudFormation stack, and grant investigations a read-only role.
order: 1
sources: [siem/aws/vulnetix-siem.yaml, siem/aws/vulnetix-guardian-readonly.yaml, siem/worker/src/api/sources.ts, siem/worker/src/ingest/routes.ts, siem/worker/src/ingest/decode.ts, siem/worker/src/normalise/aws.ts]
checked: [siem@e0f71fa]
updated: 02 Nov 2026
---

Guardian takes AWS logs by push. You deploy a CloudFormation stack that creates Firehose streams pointing at `https://ingest.vulnetix.com/v1/ingest/aws/<kind>`. Vulnetix holds no AWS credentials for delivery and the stack grants Vulnetix no access to the account.

A second, optional stack creates a read-only role that a Guardian investigation agent assumes. See [The investigation role](#the-investigation-role).

To manage delivery with Terraform or OpenTofu instead, use the [`aws-siem-shipping`](/platform-iac/terraform/modules/#aws-siem-shipping) module. It creates the same Firehose streams with the same resource names, so use either the module or the delivery stack in a region, not both.

## Templates

Both templates are served without sign-in:

| Template | URL |
|---|---|
| Delivery | `https://guardian.vulnetix.com/v1/templates/vulnetix-siem.yaml` |
| Investigation role | `https://guardian.vulnetix.com/v1/templates/vulnetix-guardian-readonly.yaml` |

**Guardian > Sources** also shows a CloudFormation quick-create link for each. The delivery link names the stack only, so the token never sits in a URL or your browser history: you paste it into the form. The role link fills in `ExternalId` with your organisation id. The console opens in the region you last used.

## The delivery stack

```sh
curl -fsSLo vulnetix-siem.yaml https://guardian.vulnetix.com/v1/templates/vulnetix-siem.yaml
aws cloudformation deploy --stack-name vulnetix-siem --template-file vulnetix-siem.yaml \
  --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
  --parameter-overrides IngestToken=gdn_xxxxxxxxxxxxxxxxxxxx VpcIds=vpc-0abc1234,vpc-0def5678
```

`CAPABILITY_AUTO_EXPAND` is needed because the template uses `AWS::LanguageExtensions` (`Fn::ForEach`) to create one flow log and one Resolver association per VPC. Deploy the stack once in each region whose VPCs should send. CloudTrail events reach EventBridge in the region where the call was made (calls to global services such as IAM arrive in `us-east-1`), so keep `SendCloudTrail=true` in every region you deploy to.

### Parameters

| Parameter | Default | Meaning |
|---|---|---|
| `IngestToken` | required | A Guardian ingest token of kind `aws`. Must match `^gdn_[A-Za-z0-9_-]{20,64}$`. `NoEcho`. |
| `IngestHost` | `ingest.vulnetix.com` | The ingest host. Leave it. |
| `VpcIds` | empty | Comma-separated VPC ids. Empty sends CloudTrail only. |
| `SendFlowLogs` | `true` | Create a flow log for each VPC. |
| `SendResolverLogs` | `true` | Create Resolver query logging for each VPC. |
| `SendCloudTrail` | `true` | Create the EventBridge rule for CloudTrail events. |

### Resources

| Resource | Name | What |
|---|---|---|
| Firehose streams | `vulnetix-siem-flow`, `vulnetix-siem-dns`, `vulnetix-siem-cloudtrail` | DirectPut streams with an HTTP endpoint destination. The token is the access key (`X-Amz-Firehose-Access-Key`). GZIP encoding, buffer 0 s and 1 MB, 300 s of retries. |
| S3 bucket | `vulnetix-siem-errors-<account>-<region>` | Batches still failing after the retries. Public access blocked, SSE-S3, objects expire after 14 days. Prefixes `flow/`, `dns/`, `cloudtrail/`. |
| IAM role | `vulnetix-siem-firehose-<region>` | Lets Firehose write failed batches to the bucket. Trusts `firehose.amazonaws.com` from your account only. |
| Flow logs | one per VPC | `TrafficType: ALL`, 60 s aggregation, the format below, to the flow stream. |
| Resolver query logging | `vulnetix-siem` and one association per VPC | To the dns stream. |
| EventBridge rule | `vulnetix-siem-cloudtrail` | Detail types `AWS API Call via CloudTrail` and `AWS Console Sign In via CloudTrail`, to the cloudtrail stream, through a role allowed only `firehose:PutRecord` and `firehose:PutRecordBatch` on it. |

Outputs: `FlowStream`, `DnsStream`, `CloudTrailStream`, `ErrorBucket`.

> [!CAREFUL] CloudTrail needs a trail
> EventBridge receives CloudTrail management events only while a trail in the account logs them. Read-only API calls never reach EventBridge, so `cloud_audit` holds write events and console sign-ins only.

### Flow log format

The stack creates flow logs in this format:

```
${version} ${account-id} ${region} ${vpc-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${tcp-flags} ${flow-direction} ${log-status}
```

The default 14-field AWS format is read too. `NODATA` and `SKIPDATA` records are skipped. Any other line Guardian cannot read is counted, and the token's last error on the Sources page says how many records were unreadable.

### Costs

Flow log and Resolver log vended delivery, Firehose ingestion and EventBridge are billed to your AWS account. Guardian's own charge is the [pack](/siem/reference/packs-and-limits/).

## Sending logs you already collect

If flow logs or Resolver logs already go to CloudWatch Logs, you can add a CloudWatch Logs subscription filter to one of the Firehose streams instead of creating new flow logs. Guardian unwraps the subscription envelope (base64, gzipped `DATA_MESSAGE`) into its log lines and skips `CONTROL_MESSAGE` records.

## What ends up where

| Endpoint | Record | Table | `source` |
|---|---|---|---|
| `/v1/ingest/aws/flow` | One flow log line, bare or as `{"message":"<line>"}` | `net_events` | `vpc-flow` |
| `/v1/ingest/aws/dns` | Resolver query log JSON. `answers[].Rdata` becomes `answers`. | `dns_events` | `route53-resolver` |
| `/v1/ingest/aws/cloudtrail` | The EventBridge envelope. `detail` is the CloudTrail record. | `cloud_audit` | `cloudtrail` |

## Responses Firehose sees

| Status | When | Firehose does |
|---|---|---|
| `200` | Stored, including a batch with unreadable lines (a retry would fail the same way) | Moves on |
| `401` | Unknown, revoked or non-`aws` token | Retries for 300 s, then parks the batch in the error bucket |
| `402` | Guardian is not active for the organisation | Retries, then parks |
| `404` | Unknown kind in the path | Retries, then parks |
| `413` | Body over 100 MB | Permanent failure |
| `429` | Today's ingest is over 1.5 times the pack's cap (`ingest_cap`) | Retries, then parks |
| `500` | Guardian could not store the batch | Retries, then parks |

Every response is in Firehose's JSON shape with the request id echoed.

## The investigation role

`vulnetix-guardian-readonly.yaml` creates `VulnetixGuardianReadOnly`, which an investigation agent in a [Guardian workflow](/siem/alerts/triggers/#software-factory-workflows) assumes to read the account. Nothing in it can change the account: a remediation is a pull request or a command a person runs.

```sh
curl -fsSLo vulnetix-guardian-readonly.yaml https://guardian.vulnetix.com/v1/templates/vulnetix-guardian-readonly.yaml
aws cloudformation deploy --stack-name vulnetix-guardian-readonly --template-file vulnetix-guardian-readonly.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides TrustedPrincipalArn=arn:aws:iam::<your-account-id>:user/vulnetix-investigator ExternalId=<your-organisation-id>
```

| Parameter | Meaning |
|---|---|
| `TrustedPrincipalArn` | The IAM user or role whose access key you store in the Vulnetix Secrets Vault as an `env` entry for the investigation sandbox. Pattern `arn:aws:iam::<12 digits>:(user\|role)/<name>`. |
| `ExternalId` | Your Vulnetix organisation id (a UUID), shown on the Sources page. Required in `sts:ExternalId` on every assume. |

The role has a 1-hour maximum session and:

| Grant | Actions |
|---|---|
| AWS managed | `SecurityAudit`, `job-function/ViewOnlyAccess` |
| Logs | `logs:FilterLogEvents`, `logs:StartQuery`, `logs:GetQueryResults`, `logs:DescribeLogGroups`, `cloudtrail:LookupEvents`, `cloudwatch:GetMetricData` |
| Network and detection | `route53resolver:List*`, `route53resolver:Get*`, `wafv2:Get*`, `wafv2:List*`, `guardduty:Get*`, `guardduty:List*`, `ssm:DescribeInstanceInformation`, `ssm:DescribeSessions`, `iam:GenerateCredentialReport`, `iam:GetCredentialReport` |

There is no explicit deny statement: IAM refuses a wildcard service prefix such as `*:Get*`, so the role is read-only because nothing it holds allows a write. Put the `RoleArn` output into the investigation agent's `aws_role_arn` fact.

For connecting an AWS account to Vulnetix cloud scanning (a different role), see [Cloud security](/cloud-security/).
