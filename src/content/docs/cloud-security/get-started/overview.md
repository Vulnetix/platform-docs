---
title: Cloud security
description: What Vulnetix reads from and deploys into a connected AWS account, how Wiz findings are checked against it, and where results appear in the Resolve Platform.
order: 1
nav: Overview
sources: [vdb-site/api/main.go, vdb-site/api/internal/handler/integrations_aws.go, vdb-site/api/internal/handler/integrations_aws_stack.go, vdb-site/api/internal/handler/cloud_native.go, vdb-site/api/internal/handler/entitlements.go, vdb-site/api/internal/handler/cloud_scheduler.go, cloudscan/README.md]
checked: [vdb-site@1a06d67, cloudscan@67eeabb, website@ad775f37]
updated: 04 Nov 2026
---

Cloud security is for teams that run workloads in AWS and need findings that name the affected resource, not only the vulnerable package. It answers which ARN in which account is exposed to which CVE or fails which control, and checks Wiz claims from inside the account. Use it for the state of your resources. Use the [SIEM](/siem/) to collect, search and alert on the logs those resources produce.

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

1. You connect an account from **Integrations > AWS** in the Resolve Platform, with IAM Identity Center or, for accounts without it, an IAM user access key. See [Connect with IAM Identity Center](/cloud-security/aws/connect-identity-center/).
2. Vulnetix deploys two CloudFormation stacks into the account: `vulnetix-security-bootstrap` (a CloudTrail bucket and the cross-account role) and `vulnetix-security-pipeline` (a multi-region trail, an EventBridge rule, an SQS queue, a secret and the probe). See [What Vulnetix deploys](/cloud-security/aws/what-gets-deployed/).
3. Vulnetix invokes the probe on a schedule: daily, staggered across a 4-hour window. The probe reads the account, looks up CRIT criteria from the VDB API and posts its findings back.
4. Each extra source you turn on attaches one named, read-only inline policy to the probe's role on the next stack deploy. See [Cloud-native sources](/cloud-security/sources/native-sources/).

## Plan

Cloud integrations (AWS, the AWS-native sources and Wiz) need the **Pro** plan or above. On a lower plan the Resolve Platform shows the drawer locked with an upgrade link.

## In this section

- [Quickstart](/cloud-security/get-started/quickstart/): connect one account and confirm the probe can read it.
- [Connect Wiz](/cloud-security/wiz/connect-wiz/) and [How Wiz claims are verified](/cloud-security/wiz/verification/): the Wiz service account and the five verdicts.
- [Log ingest targets](/cloud-security/logs/log-ingest-targets/): where cloud logs go with each integration.
- [Probe settings](/cloud-security/reference/probe-settings/): the probe function's environment variables and log lines.
- [Resolve Platform API](/cloud-security/reference/api/): the routes behind the Resolve Platform's cloud security pages.
- [Troubleshooting](/cloud-security/reference/troubleshooting/): connection, deploy, verify and sweep errors.

## Related

- Ship VPC flow, Resolver and CloudTrail logs to the Vulnetix SIEM: [Guardian AWS log shipping](/siem/sources/aws/).
- Deploy virtual patches to AWS WAF: [/virtual-patching/](/virtual-patching/).
- The runtime sensor that runs on your hosts and containers: [Vulnetix sensor](/virtual-patching/runtime/sensor/).

## Platform IaC

The AWS connection, its accounts, which native sources are read, and the Wiz connection are kinds: [`AwsConnection`](/platform-iac/kinds/aws-connection/), [`AwsAccount`](/platform-iac/kinds/aws-account/), [`CloudSensors`](/platform-iac/kinds/cloud-sensors/) and [`WizConnection`](/platform-iac/kinds/wiz-connection/). The config engine applies them, and the Terraform resources and the AWS modules are on [Terraform and OpenTofu](/platform-iac/terraform/). An IAM Identity Center connection reports `AwaitingAuthorization` until someone approves the sign-in; see [status phases](/platform-iac/reference/engine/#status-phases).

When [Drift protection](/platform-iac/guides/drift-protection/) is on, a change made in the Resolve Platform or through a legacy API to an AWS connection, AWS account or cloud sensors that is managed as code (by Terraform or a repository) is refused with HTTP 409 `managed_by_platform_iac`. Change it where it is declared, or ask an owner to turn Drift protection off.
