---
title: Permissions
description: "Every IAM permission the AWS integration grants, by role: VulnetixSecurityAuditor, vulnetix-reporter-execution and its per-source inline policies, and the deploy policy for the access key connector and VulnetixCloudscanDeploy."
order: 13
sources: [vdb-site/api/internal/handler/assets/aws-bootstrap.yaml, vdb-site/api/internal/handler/assets/aws-pipeline.yaml, vdb-site/api/internal/handler/integrations_aws_iamuser.go, vdb-site/api/internal/handler/cloud_native.go]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

Three identities matter. Only the first is used by Vulnetix from outside your account.

| Identity | Created by | Used by | Can write |
|---|---|---|---|
| `VulnetixSecurityAuditor` | Bootstrap stack | Vulnetix, from its own AWS account, with your organisation id as the external id | Only the resources the two stacks own, by name |
| `vulnetix-reporter-execution` | Pipeline stack | The probe function, inside your account | Its own log group, its state prefix in the Vulnetix bucket, its own queue |
| Deploy policy (`VulnetixCloudscanDeploy` role or your IAM user) | You, or the drawer | The bootstrap deploy | The two stacks and what they declare |

## VulnetixSecurityAuditor

This role is not read-only: CloudFormation runs as it when it builds the pipeline stack, so it has to be able to create what that stack declares. Each statement is scoped to the stack-owned resource names where AWS allows a resource.

| Sid | Actions | Resource |
|---|---|---|
| `CloudFormationStacks` | `CreateStack`, `UpdateStack`, `DeleteStack`, `DescribeStacks`, `DescribeStackEvents`, `DescribeStackResource(s)`, `GetTemplate`, `GetTemplateSummary`, `DetectStackDrift`, `DetectStackResourceDrift`, `DescribeStackDriftDetectionStatus`, `DescribeStackResourceDrifts` | Stacks `vulnetix-security-bootstrap` and `vulnetix-security-pipeline` in this account |
| `CloudFormationValidate` | `cloudformation:ValidateTemplate` | `*` |
| `CloudTrail` | `CreateTrail`, `DeleteTrail`, `DescribeTrails`, `GetTrail`, `GetTrailStatus`, `StartLogging`, `StopLogging`, `UpdateTrail`, `AddTags`, `ListTags`, `RemoveTags`, `PutEventSelectors`, `GetEventSelectors` | `*` |
| `LogBucket` | Bucket create, delete, list, ACL, location, policy, public access block, encryption, ownership controls, tagging; `GetObject`, `PutObject`, `DeleteObject`, `DeleteObjectVersion` | `vulnetix-cloudtrail-<your-account-id>` and its objects |
| `SecurityHub` | `DescribeHub`, `EnableSecurityHub`, `GetFindings`, `BatchGetFindings`, `BatchImportFindings` | `*` |
| `EventBridge` | `PutRule`, `DeleteRule`, `DescribeRule`, `PutTargets`, `RemoveTargets`, `ListTargetsByRule`, tag actions | Rule `vulnetix-cloudtrail-to-reporter` |
| `ReporterQueue` | `CreateQueue`, `DeleteQueue`, `GetQueueUrl`, `GetQueueAttributes`, `SetQueueAttributes`, tag actions | Queue `vulnetix-security-reporter` |
| `ReporterFunction` | Lambda function create, delete, get, update code and configuration, `InvokeFunction`, tags, event source mapping management | `*` (Lambda has no resource-level control on create) |
| `ReporterExecutionRole` | Role create, delete, get, pass, inline and managed policy attach and detach, tags | Role `vulnetix-reporter-execution` |
| `AuditorRoleSelf` | `GetRole`, `GetRolePolicy`, `ListRolePolicies`, `PutRolePolicy`, `DeleteRolePolicy` | This role, for teardown |
| `VulnetixSecrets` | Secret create, delete, describe, get, put, update, tag | Secrets under `vulnetix/*` |
| `ReporterLogs` | Log group create, delete, retention, tags, `DescribeLogStreams`, `FilterLogEvents`, `GetLogEvents` | `/aws/lambda/vulnetix-security-reporter*` |
| `LogsDescribe` | `logs:DescribeLogGroups` | `*` |
| `CallerIdentity` | `sts:GetCallerIdentity` | `*` |

`lambda:InvokeFunction` is how Vulnetix starts a sweep and how support runs the probe on demand. The probe reads only, so an invocation changes nothing in the account.

## vulnetix-reporter-execution

The probe's role. It always carries the AWS managed policies **`SecurityAudit`** and **`job-function/ViewOnlyAccess`**, plus these inline policies:

| Inline policy | Grants |
|---|---|
| `vulnetix-reporter-logs` | Write to its own log group |
| `vulnetix-reporter-secrets` | Read `vulnetix/vdb-credentials` |
| `vulnetix-reporter-queue` | Receive, delete and send on its own queue |
| `vulnetix-reporter-logdata` | `cloudtrail:GetTrailStatus`, `DescribeTrails`; list the Vulnetix bucket and read its objects |
| `vulnetix-reporter-state` | Write and delete under `vulnetix/state/` in the Vulnetix bucket |
| `vulnetix-reporter-discovery` | `tag:GetResources`, `GetTagKeys`, `GetTagValues`, `ec2:DescribeRegions`, `cloudtrail:LookupEvents`, `cloudformation:DescribeStacks` |

### Per-source inline policies

Each is attached only while its source is on, and the presence of the policy on the role is the record of your consent. Turning a source off and redeploying detaches it.

| Inline policy | Source | Actions |
|---|---|---|
| `vulnetix-reporter-inspector` | Amazon Inspector | `inspector2:ListFindings`, `ListCoverage`, `BatchGetAccountStatus` |
| `vulnetix-reporter-securityhub` | Security Hub, GuardDuty, Config, Macie, IAM Access Analyzer | `securityhub:GetFindings`, `DescribeHub` |
| `vulnetix-reporter-wiz` | A Wiz connection | `ecr:DescribeImages`, `DescribeRepositories`, `ListImages`, `BatchGetImage`, `DescribeImageScanFindings`; `ssm:DescribeInstanceInformation`, `GetInventory`, `GetInventorySchema`, `ListInventoryEntries` |
| `vulnetix-reporter-waf` | AWS WAF | `wafv2:` `ListWebACLs`, `GetWebACL`, `GetLoggingConfiguration`, `ListResourcesForWebACL`, `ListIPSets`, `GetIPSet`, `ListRegexPatternSets`, `GetRegexPatternSet`, `ListRuleGroups`, `GetRuleGroup`, `ListAvailableManagedRuleGroups`, `ListAvailableManagedRuleGroupVersions`, `DescribeManagedRuleGroup`, `ListTagsForResource`; WAF Classic `waf:` and `waf-regional:` `ListWebACLs`, `GetWebACL`, `GetRule`, `GetLoggingConfiguration` (and `waf-regional:ListResourcesForWebACL`); `cloudfront:ListDistributions`, `GetDistributionConfig` |
| `vulnetix-reporter-compute` | Compute runtime | `ssm:DescribeInstanceInformation`, `ListInventoryEntries`, `ListResourceComplianceSummaries`; `elasticmapreduce:ListClusters`, `DescribeCluster`, `GetBlockPublicAccessConfiguration`; `eks:ListClusters`, `DescribeCluster`, `ListNodegroups`, `DescribeNodegroup`; `emr-containers:ListVirtualClusters`, `ListJobRuns`; `ecr:DescribeRepositories`, `DescribeImages`; `ecs:ListClusters`, `ListTasks`, `DescribeTasks`; `ec2:DescribeInstances`, `DescribeSecurityGroups`, `DescribeVpcs`, `DescribeFlowLogs`, `GetEbsEncryptionByDefault`; `iam:GetAccountSummary`, `GetAccountPasswordPolicy`, `ListPolicies`, `GetPolicyVersion`; `s3:GetAccountPublicAccessBlock`; `cloudtrail:DescribeTrails`, `GetTrailStatus`; `config:DescribeConfigurationRecorderStatus`; `cloudformation:DescribeStacks`, `GetTemplate` |
| `vulnetix-reporter-artifacts` | Images and Lambda code | `ecr:BatchGetImage`, `GetDownloadUrlForLayer`; `lambda:ListFunctions`, `GetFunction`, `GetLayerVersion` |
| `vulnetix-reporter-network-logs` | Network logs | `route53resolver:ListResolverQueryLogConfigs`, `logs:FilterLogEvents` |
| `vulnetix-reporter-eks-workloads` | EKS workloads | `eks:ListAccessEntries` |

> [!CAREFUL] The managed policies already read a lot
> `SecurityAudit` and `ViewOnlyAccess` are attached whatever you turn on, and they already allow many describe and list calls, including some that overlap the per-source policies. The per-source control is enforced in two places: the inline policy that grants the reads `SecurityAudit` lacks, and the source list Vulnetix passes on each invocation. The probe does not call a source that is not in that list.

## The deploy policy

The policy for the [access key connector](/cloud-security/aws/connect-access-key/) and for the `VulnetixCloudscanDeploy` role. Get the current document with `GET /v1/integrations/aws/policy`. Replace `<your-account-id>` before you attach it.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "IdentifyTheAccount", "Effect": "Allow", "Action": "sts:GetCallerIdentity", "Resource": "*" },
    { "Sid": "ManageVulnetixStacks", "Effect": "Allow",
      "Action": ["cloudformation:CreateStack", "cloudformation:UpdateStack", "cloudformation:DeleteStack",
        "cloudformation:DescribeStacks", "cloudformation:DescribeStackEvents", "cloudformation:DescribeStackResource",
        "cloudformation:DescribeStackResources", "cloudformation:GetTemplate", "cloudformation:GetTemplateSummary",
        "cloudformation:DetectStackDrift", "cloudformation:DetectStackResourceDrift",
        "cloudformation:DescribeStackDriftDetectionStatus"],
      "Resource": ["arn:aws:cloudformation:*:<your-account-id>:stack/vulnetix-security-bootstrap/*",
        "arn:aws:cloudformation:*:<your-account-id>:stack/vulnetix-security-pipeline/*"] },
    { "Sid": "ValidateTemplates", "Effect": "Allow", "Action": "cloudformation:ValidateTemplate", "Resource": "*" },
    { "Sid": "CreateTheAccessRole", "Effect": "Allow",
      "Action": ["iam:CreateRole", "iam:DeleteRole", "iam:GetRole", "iam:PassRole", "iam:PutRolePolicy",
        "iam:DeleteRolePolicy", "iam:GetRolePolicy", "iam:ListRolePolicies", "iam:ListAttachedRolePolicies",
        "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:TagRole", "iam:UntagRole", "iam:ListRoleTags",
        "iam:UpdateAssumeRolePolicy"],
      "Resource": ["arn:aws:iam::<your-account-id>:role/VulnetixSecurityAuditor",
        "arn:aws:iam::<your-account-id>:role/vulnetix-reporter-execution"] },
    { "Sid": "CreateTheLogBucket", "Effect": "Allow",
      "Action": ["s3:CreateBucket", "s3:DeleteBucket", "s3:ListBucket", "s3:ListBucketVersions", "s3:GetBucketAcl",
        "s3:GetBucketLocation", "s3:GetBucketPolicy", "s3:PutBucketPolicy", "s3:DeleteBucketPolicy",
        "s3:GetBucketPublicAccessBlock", "s3:PutBucketPublicAccessBlock", "s3:GetEncryptionConfiguration",
        "s3:PutEncryptionConfiguration", "s3:GetBucketOwnershipControls", "s3:PutBucketOwnershipControls",
        "s3:GetBucketTagging", "s3:PutBucketTagging", "s3:GetObject", "s3:PutObject", "s3:DeleteObject",
        "s3:DeleteObjectVersion"],
      "Resource": ["arn:aws:s3:::vulnetix-cloudtrail-<your-account-id>",
        "arn:aws:s3:::vulnetix-cloudtrail-<your-account-id>/*"] },
    { "Sid": "CreateTheLoggingPipeline", "Effect": "Allow",
      "Action": ["cloudtrail:CreateTrail", "cloudtrail:DeleteTrail", "cloudtrail:UpdateTrail", "cloudtrail:DescribeTrails",
        "cloudtrail:GetTrail", "cloudtrail:GetTrailStatus", "cloudtrail:StartLogging", "cloudtrail:StopLogging",
        "cloudtrail:AddTags", "cloudtrail:ListTags", "cloudtrail:RemoveTags", "cloudtrail:PutEventSelectors",
        "cloudtrail:GetEventSelectors", "events:PutRule", "events:DeleteRule", "events:DescribeRule",
        "events:PutTargets", "events:RemoveTargets", "events:ListTargetsByRule", "events:ListTagsForResource",
        "events:TagResource", "events:UntagResource", "sqs:CreateQueue", "sqs:DeleteQueue", "sqs:GetQueueUrl",
        "sqs:GetQueueAttributes", "sqs:SetQueueAttributes", "sqs:ListQueueTags", "sqs:TagQueue", "sqs:UntagQueue",
        "lambda:CreateFunction", "lambda:DeleteFunction", "lambda:GetFunction", "lambda:GetFunctionConfiguration",
        "lambda:UpdateFunctionCode", "lambda:UpdateFunctionConfiguration", "lambda:InvokeFunction",
        "lambda:ListTags", "lambda:TagResource", "lambda:UntagResource", "lambda:CreateEventSourceMapping",
        "lambda:DeleteEventSourceMapping", "lambda:GetEventSourceMapping", "lambda:UpdateEventSourceMapping",
        "lambda:ListEventSourceMappings", "logs:CreateLogGroup", "logs:DeleteLogGroup", "logs:PutRetentionPolicy",
        "logs:DeleteRetentionPolicy", "logs:TagResource", "logs:UntagResource", "logs:ListTagsForResource",
        "logs:DescribeLogGroups", "logs:DescribeLogStreams", "logs:FilterLogEvents", "logs:GetLogEvents",
        "securityhub:DescribeHub", "securityhub:EnableSecurityHub", "securityhub:GetFindings",
        "securityhub:BatchImportFindings", "secretsmanager:CreateSecret", "secretsmanager:DeleteSecret",
        "secretsmanager:DescribeSecret", "secretsmanager:GetSecretValue", "secretsmanager:PutSecretValue",
        "secretsmanager:UpdateSecret", "secretsmanager:TagResource", "secretsmanager:UntagResource"],
      "Resource": "*" }
  ]
}
```
