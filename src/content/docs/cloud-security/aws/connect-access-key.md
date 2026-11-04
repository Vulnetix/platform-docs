---
title: Connect with an access key
description: The legacy connector for AWS accounts without IAM Identity Center. The IAM policy to attach, what Vulnetix stores, and how it differs from the Identity Center connector.
order: 11
nav: Access key (legacy)
sources: [vdb-site/api/internal/handler/integrations_aws_iamuser.go, vdb-site/api/main.go, website/src/components/integrations/console/IntegrationAwsDrawer.vue]
checked: [vdb-site@1a06d67, website@ad775f37]
updated: 02 Nov 2026
---

Use this connector only for an account that does not use IAM Identity Center. The stacks, the role and the probe are identical to the [Identity Center connector](/cloud-security/aws/connect-identity-center/). The difference is the credential: an access key does not expire, so it stays stored (KMS-encrypted) until you rotate or remove it. Once the bootstrap stack exists, Vulnetix assumes `VulnetixSecurityAuditor` for its work and the key is only the fallback.

To deploy the bootstrap stack with Terraform or OpenTofu instead, use the [`aws-onboarding`](/platform-iac/terraform/modules/#aws-onboarding) module. It creates the same `vulnetix-security-bootstrap` stack the Resolve Platform deploys. You then give the account id and the module's `auditor_role_arn` output to the AWS integration in the Resolve Platform, which deploys the pipeline stack.

## Steps

1. Create an IAM user for Vulnetix in the account and attach the policy the drawer shows. It is generated from the stacks, so it cannot drift from what they need. Fetch it yourself with `GET /v1/integrations/aws/policy`; before a key is accepted, the account id in its ARNs is `*`.
2. Create an access key for that user.
3. In the Resolve Platform, open **Integrations > AWS**, choose **Access key**, and enter the access key id, the secret access key and the region to deploy into.
4. Vulnetix calls `sts:GetCallerIdentity` with the key. The account id comes from that answer, never from the form, so a key can only connect the account it belongs to.
5. Provisioning then runs the same four phases as the quickstart: `bootstrap`, `probe`, `pipeline`, `securityhub`. See [Quickstart](/cloud-security/get-started/quickstart/#2-watch-the-deploy).

## Request

`POST /v1/integrations/aws/iam-user`

```json
{ "accessKeyId": "AKIA...", "secretAccessKey": "<secret>", "region": "us-east-1" }
```

| Status | Meaning |
|---|---|
| `200` | The key works and the account is recorded. |
| `400` | `that does not look like an AWS access key ID` (16 to 128 uppercase letters and digits), a missing secret, an unsupported region, an invalid body, or a key AWS rejected on `GetCallerIdentity`. |
| `503` | `secret storage is not configured`: Vulnetix refuses to store a secret it cannot encrypt. |

## The policy

The generated policy has six statements. Every resource is scoped to the names the stacks create, except where AWS has no resource form for the action. The full list is on [Permissions](/cloud-security/aws/permissions/#the-deploy-policy).

| Sid | Covers |
|---|---|
| `IdentifyTheAccount` | `sts:GetCallerIdentity` |
| `ManageVulnetixStacks` | CloudFormation create, update, delete, describe and drift detection on the stacks `vulnetix-security-bootstrap` and `vulnetix-security-pipeline` only |
| `ValidateTemplates` | `cloudformation:ValidateTemplate` |
| `CreateTheAccessRole` | IAM role and inline policy management on the roles `VulnetixSecurityAuditor` and `vulnetix-reporter-execution` only |
| `CreateTheLogBucket` | Bucket and object management on `vulnetix-cloudtrail-<your-account-id>` only |
| `CreateTheLoggingPipeline` | CloudTrail, EventBridge, SQS, Lambda, CloudWatch Logs, Security Hub and Secrets Manager actions the pipeline stack uses, on `*` |

> [!WHY] Why the pipeline statement is on `*`
> Several of those actions (Lambda create, Security Hub enable) have no resource-level control on the create path. The stacks name every resource they make, so what is created stays bounded by the templates.

## Rotating or removing the key

Reconnect with a new key to replace it. Disconnecting the integration (see [Disconnect](/cloud-security/aws/verify-upgrade-disconnect/#disconnect)) removes the stored key with the row. Delete the IAM user in AWS yourself.
