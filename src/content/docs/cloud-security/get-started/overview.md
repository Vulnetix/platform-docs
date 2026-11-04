---
title: Cloud security
description: What Vulnetix reads from a connected AWS account, what it deploys there, how Wiz findings are checked against the account, and where each result appears in the console.
order: 1
nav: Overview
sources: [vdb-site/api/main.go, vdb-site/api/internal/handler/integrations_aws.go, vdb-site/api/internal/handler/integrations_aws_stack.go, vdb-site/api/internal/handler/cloud_native.go, vdb-site/api/internal/handler/entitlements.go, vdb-site/api/internal/handler/cloud_scheduler.go, cloudscan/README.md]
checked: [vdb-site@1a06d67, cloudscan@67eeabb, website@ad775f37]
updated: 02 Nov 2026
---

Cloud security connects your AWS accounts to Vulnetix. A small function, the **probe** (`vulnetix-security-reporter`), runs inside each account, enumerates its resources, and reports findings that name a resource ARN and the CVE or control it fails. The probe is the only thing that reads your account's data. Vulnetix assumes a role in the account to deploy and maintain it, and to start a sweep.

## What you get

| Result | Where it appears | Needs |
|---|---|---|
| Cloud findings: a named ARN affected by a named CVE, with the CRIT criteria evaluated and what they saw | **Resolve > Cloud** (`/resolve/cloud`) | An AWS connection |
| Runtime findings: OS packages, EMR, EKS and ECS images, CIS AWS Foundations controls, CloudFormation template checks | **Resolve > Runtime** (`/resolve/runtime`) | The **Compute runtime** source |
| AWS WAF posture: web ACLs, rules, managed rule group versions, what each ACL protects | **Virtual patching**, WAF tab | The **AWS WAF** source |
| Amazon Inspector, Security Hub, GuardDuty, Config, Macie and IAM Access Analyzer findings, each under its own product name | The findings queue and each product's integration card | That product's source |
| Wiz issues and vulnerability findings, each with a second verdict from inside the account | The findings queue, beside the Wiz claim | An AWS connection and a Wiz connection |

Every cloud finding is an ordinary finding (category `cloud`), so triage, suppressions, VEX and exports work on it unchanged.

## How it fits together

1. You connect an account from **Integrations > AWS** in the console, with IAM Identity Center or, for accounts without it, an IAM user access key. See [Connect with IAM Identity Center](/cloud-security/aws/connect-identity-center/).
2. Vulnetix deploys two CloudFormation stacks into the account: `vulnetix-security-bootstrap` (a CloudTrail bucket and the cross-account role) and `vulnetix-security-pipeline` (a multi-region trail, an EventBridge rule, an SQS queue, a secret and the probe). See [What Vulnetix deploys](/cloud-security/aws/what-gets-deployed/).
3. Vulnetix invokes the probe on a schedule: daily, staggered across a 4-hour window. The probe reads the account, looks up CRIT criteria from the VDB API and posts its findings back.
4. Each extra source you turn on attaches one named, read-only inline policy to the probe's role on the next stack deploy. See [Cloud-native sources](/cloud-security/sources/native-sources/).

## Plan

Cloud integrations (AWS, the AWS-native sources and Wiz) need the **Pro** plan or above. On a lower plan the console shows the drawer locked with an upgrade link.

## Related

- Ship VPC flow, Resolver and CloudTrail logs to the Vulnetix SIEM: [Guardian AWS log shipping](/siem/sources/aws/).
- Deploy virtual patches to AWS WAF: [/virtual-patching/](/virtual-patching/).
- The runtime sensor that runs on your hosts and containers: [Vulnetix sensor](/virtual-patching/runtime/sensor/).

## Platform IaC

The AWS connection, its accounts, which native sources are read, and the Wiz connection are kinds: [`AwsConnection`](/platform-iac/kinds/aws-connection/), [`AwsAccount`](/platform-iac/kinds/aws-account/), [`CloudSensors`](/platform-iac/kinds/cloud-sensors/) and [`WizConnection`](/platform-iac/kinds/wiz-connection/). The config engine applies them, and the Terraform resources and the AWS modules are on [Terraform and OpenTofu](/platform-iac/terraform/). An IAM Identity Center connection reports `AwaitingAuthorization` until someone approves the sign-in; see [status phases](/platform-iac/reference/engine/#status-phases).

When [Drift protection](/platform-iac/guides/drift-protection/) is on, a change made in the console or through a legacy API to an AWS connection, AWS account or cloud sensors that is managed as code (by Terraform or a repository) is refused with HTTP 409 `managed_by_platform_iac`. Change it where it is declared, or ask an owner to turn Drift protection off.
