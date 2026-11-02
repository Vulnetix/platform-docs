---
title: What Vulnetix deploys
description: Every resource in the vulnetix-security-bootstrap and vulnetix-security-pipeline CloudFormation stacks, the external ID, the probe function's settings, and what each costs you.
order: 12
nav: What gets deployed
sources: [vdb-site/api/internal/handler/assets/aws-bootstrap.yaml, vdb-site/api/internal/handler/assets/aws-pipeline.yaml, vdb-site/api/internal/handler/integrations_aws_stack.go, vdb-site/api/internal/handler/integrations_aws.go, vdb-site/api/internal/handler/cloud_scheduler.go]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

Everything Vulnetix creates in an account lives in two CloudFormation stacks, in the region you chose when connecting. The stack names are fixed, so CloudFormation itself is the record of how far provisioning got: you can see the same state in your own CloudFormation console. Both stacks carry a `ManagedBy` tag that CloudFormation copies to every resource.

## The external ID

The bootstrap stack's `ExternalId` parameter is your Vulnetix **organisation id** (a uuid). The role's trust policy requires it in `sts:ExternalId` on every assume, so a third party who learns the role ARN still cannot use it. Vulnetix fills it in; you do not choose it.

This is not the same identity as the `ReportingOrgId` in the pipeline stack. The external id names the organisation; `ReportingOrgId` names the API principal the probe reports as, and is half of the API key pair stored in the secret.

## Stack 1: `vulnetix-security-bootstrap`

Deployed with your own credentials (the Identity Center permission set, the deploy role, or the access key), because the role it creates does not exist yet.

| Resource | Name | Notes |
|---|---|---|
| S3 bucket | `vulnetix-cloudtrail-<your-account-id>` | CloudTrail's destination, and where the probe zip is staged. Public access blocked, SSE-S3 (AES256), bucket owner enforced. |
| Bucket policy | | Lets CloudTrail check the ACL and write under `AWSLogs/<your-account-id>/`, only for the trail `vulnetix-management-events` in this account (`aws:SourceArn`). |
| IAM role | `VulnetixSecurityAuditor` | Assumed by Vulnetix for everything after this stack. Max session 12 hours. Trusts the Vulnetix service account with your organisation id as the external id. Permissions: [Permissions](/cloud-security/aws/permissions/#vulnetixsecurityauditor). |

Parameters:

| Parameter | Value |
|---|---|
| `ExternalId` | Your organisation id. Pattern `^[A-Za-z0-9-]{8,64}$`. |
| `VulnetixAccountId` | The AWS account the Vulnetix service runs in. Set by Vulnetix. |

Outputs: `LogBucketName`, `AuditorRoleArn`.

## Stack 2: `vulnetix-security-pipeline`

Deployed as `VulnetixSecurityAuditor`.

| Resource | Name | Notes |
|---|---|---|
| CloudTrail trail | `vulnetix-management-events` | Multi-region, global service events, log file validation on. Writes to the bootstrap bucket. |
| SQS queue | `vulnetix-security-reporter` | 14-day retention, 900 s visibility timeout. Only the rule below may send to it. |
| EventBridge rule | `vulnetix-cloudtrail-to-reporter` | `AWS API Call via CloudTrail` events whose `eventName` starts with a write verb (`Create`, `Update`, `Put`, `Delete`, `Modify`, `Attach`, `Detach`, `Run`, `Start`, `Stop`, `Terminate`, `Tag` and others) from 48 services, including EC2, Lambda, ECS, EKS, ECR, RDS, S3, IAM, STS, KMS and CloudFormation. Read calls are not forwarded. |
| Secrets Manager secret | `vulnetix/vdb-credentials` | `{"orgId", "secret"}`: the API key pair the probe reports with. |
| IAM role | `vulnetix-reporter-execution` | The probe's execution role. Permissions: [Permissions](/cloud-security/aws/permissions/#vulnetix-reporter-execution). |
| Log group | `/aws/lambda/vulnetix-security-reporter` | 14-day retention. |
| Lambda function | `vulnetix-security-reporter` | `provided.al2023`, arm64, 300 s timeout. 512 MB memory and 512 MB ephemeral storage, or 1024 MB and 2048 MB with **Images and Lambda code** on. |
| Event source mapping | | The queue to the function: batch 100, 10 s batching window, at most 10 concurrent invocations, partial batch failures reported. |

Parameters that change what the probe reads, all set by Vulnetix from your choices in the console:

| Parameter | Default | Set from |
|---|---|---|
| `WizVerification` | `false` | `true` while a Wiz connection exists |
| `ReadInspectorFindings` | `false` | The Amazon Inspector source |
| `ReadSecurityHubFindings` | `false` | Any of Security Hub, GuardDuty, Config, Macie, IAM Access Analyzer |
| `ReadWafConfiguration` | `false` | The AWS WAF source |
| `ReadComputeRuntime` | `false` | The Compute runtime source |
| `ReadComputeArtifacts` | `false` | Images and Lambda code, only with Compute runtime on |
| `ReadNetworkLogs` | `false` | Network logs, only with Compute runtime on |
| `ReadEksWorkloads` | `false` | EKS workloads, only with Compute runtime on |
| `NativeSources` | empty | Comma-separated ids of the sources you turned on |
| `PrivateReporting` | `false` | The private reporting opt-in (`PATCH /v1/integrations/aws/advanced`) |

Outputs: `QueueUrl`, `FunctionArn`, `TrailArn`.

## How a sweep starts

Nothing in your account schedules the probe. Vulnetix assumes `VulnetixSecurityAuditor` and invokes the function it deployed, with a payload naming the run and the sources you turned on. The probe reads nothing outside that list.

| Plan | Cadence |
|---|---|
| Pro and above | Daily, staggered across a 4-hour window |

A run that has not reported 15 minutes after its own deadline is recorded as lost rather than as clean.

## What it costs you

All of it is billed to your account at AWS rates: the trail's S3 delivery, EventBridge, SQS, Lambda invocations, CloudWatch Logs, Secrets Manager (one secret), and Security Hub, which the `securityhub` phase enables with its default standards when it is off.
