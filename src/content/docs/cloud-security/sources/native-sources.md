---
title: Cloud-native sources
description: The opt-in AWS sources the probe can read, including Inspector, Security Hub, GuardDuty, Config, Macie, IAM Access Analyzer and WAF, and how to turn one on.
order: 20
nav: Cloud-native sources
sources: [vdb-site/api/internal/handler/cloud_native.go, vdb-site/api/internal/handler/integrations_aws_native.go, vdb-site/api/internal/handler/assets/aws-pipeline.yaml, saas/prisma/models/cloud.prisma, cloudscan/README.md, website/src/components/integrations/console/AwsNativeSourceDrawer.vue]
checked: [vdb-site@1a06d67, saas@50cedf37, cloudscan@67eeabb, website@ad775f37]
updated: 02 Nov 2026
---

A connected account is swept for its resources and the CVEs CRIT criteria say affect them. Everything beyond that is a **source** you turn on. Each source is off until you choose it, and each one, when on, attaches one named inline policy to the probe's role (`vulnetix-reporter-execution`).

## Turning one on

1. Open the source's card under **Integrations > Cloud** and switch it on (`POST /v1/integrations/aws/native/{source}` with `{"enabled": true}`). This only records the choice.
2. Press **Deploy** (`POST /v1/integrations/aws/native/{source}/deploy`). Vulnetix redeploys the pipeline stack. Which policies it attaches is decided from your recorded choices, never from the request, so the endpoint cannot grant a permission for a source nobody turned on.
3. The drawer reads the role and shows **policy attached** only when the inline policy is really there. After the next sweep it shows the last run and how many findings it filed.

Turning a source off stops it being read on the next deploy. Findings already ingested are kept with their triage history.

A choice applies to every connected account, including accounts connected later.

| Status | Body | Meaning |
|---|---|---|
| `200` | `{source, enabled, note}` | Recorded |
| `404` | `unknown source` | Not an id from the table below |
| `409` | `{"code": "aws_required"}` | Turning a source on needs a connected AWS account |
| `202` | `{"accepted": true}` | Deploy started |
| `502` | | The stack update failed; the message is CloudFormation's |

## Sources

| Id | Label | Reads | Inline policy |
|---|---|---|---|
| `inspector` | Amazon Inspector | Vulnerability findings for EC2, ECR images and Lambda, with the package, installed version and fixed version | `vulnetix-reporter-inspector` |
| `security-hub` | AWS Security Hub | Security Hub's own control and standards findings. A finding Security Hub carries for another product is filed under that product. | `vulnetix-reporter-securityhub` |
| `guardduty` | Amazon GuardDuty | Threat detection findings, through Security Hub | `vulnetix-reporter-securityhub` |
| `config` | AWS Config | Config rule evaluations, through Security Hub | `vulnetix-reporter-securityhub` |
| `macie` | Amazon Macie | Sensitive-data findings, through Security Hub. The classified data is never read. | `vulnetix-reporter-securityhub` |
| `access-analyzer` | IAM Access Analyzer | External-access and unused-access findings, through Security Hub | `vulnetix-reporter-securityhub` |
| `waf` | AWS WAF | Web ACL configuration. See [AWS WAF posture](/cloud-security/sources/waf-posture/). | `vulnetix-reporter-waf` |
| `compute` | Compute runtime | SSM inventory, EMR, EKS, ECS, CIS controls, CloudFormation templates. See [Compute runtime](/cloud-security/sources/compute/). | `vulnetix-reporter-compute` |
| `compute-artifacts` | Images and Lambda code | Packages inside ECR images and Lambda code. Needs `compute`. | `vulnetix-reporter-artifacts` |
| `network-logs` | Network logs | Resolver query logs and VPC flow logs in CloudWatch Logs, matched against indicators. Needs `compute`. | `vulnetix-reporter-network-logs` |
| `eks-workloads` | EKS workloads | Pods and their images, through the Kubernetes API. Needs `compute` and an EKS access entry per cluster. | `vulnetix-reporter-eks-workloads` |

The exact actions each policy grants are on [Permissions](/cloud-security/aws/permissions/#per-source-inline-policies).

> [!WHY] Five products, one grant
> GuardDuty, Config, Macie and IAM Access Analyzer are all read through `securityhub:GetFindings`; AWS offers no permission at a finer grain. Turning on one of them attaches the shared Security Hub policy, and which products are ingested is decided by a product filter on the query. Once a source is on, everything it reports is taken: a source half ingested would leave a queue where nobody can say why one finding is there and another is not.

## What happens to a native finding

Each finding is filed under the product's own name (for example `Amazon Inspector`), so it lands on that product's integration card. Before it is filed, the probe checks it against the resource it names, the same way it checks Wiz claims. For Inspector, which carries the installed and fixed versions, a fix that is already deployed becomes a false positive rather than another open row. A CRIT record can also resolve a finding the provider has already fixed, but never from a stale record, and never in the direction of creating a finding.

## Prerequisites in AWS

The probe reads what these products already produce. It does not turn them on, except Security Hub, which the initial deploy enables (see [Quickstart](/cloud-security/get-started/quickstart/#2-watch-the-deploy)). Enable Inspector, GuardDuty, Config, Macie or Access Analyzer in the account yourself, and for the four read through Security Hub, make sure their Security Hub integration is on.
