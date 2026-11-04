---
title: Quickstart
description: Connect one AWS account through IAM Identity Center, let Vulnetix deploy the probe, confirm it can read the account, and turn on a first extra source.
order: 2
sources: [website/src/components/integrations/console/IntegrationAwsDrawer.vue, vdb-site/api/internal/handler/integrations_aws_sso.go, vdb-site/api/internal/handler/integrations_aws_stack.go, vdb-site/api/internal/handler/integrations_aws_verify.go]
checked: [vdb-site@1a06d67, website@ad775f37]
updated: 02 Nov 2026
---

You need:

- a Vulnetix organisation on the Pro plan or above;
- an AWS access portal URL (`https://<your-portal>.awsapps.com/start`) and a permission set in the target account that can create IAM roles, an S3 bucket, a trail, a queue, a secret and a Lambda function. An administrator set works; [Deploy role](/cloud-security/aws/connect-identity-center/#when-no-permission-set-can-deploy) covers the case where none can.

## 1. Sign in to AWS from the Resolve Platform

1. Open **Integrations** in the Resolve Platform and pick the **AWS** card (category **Cloud**).
2. Enter the access portal URL and the IAM Identity Center region. The URL may be pasted with or without `https://` and `/start`; it must be a `*.awsapps.com` address.
3. The drawer shows a user code and a verification link. Open the link, check the code matches, and approve. The drawer polls until AWS answers.
4. Pick the account and the permission set to deploy with, then review and start.

## 2. Watch the deploy

The drawer runs four phases in order and shows each CloudFormation resource as a row:

| Phase | What happens | Runs as |
|---|---|---|
| `bootstrap` | Stack `vulnetix-security-bootstrap`: the CloudTrail bucket and the `VulnetixSecurityAuditor` role | Your permission set |
| `probe` | The pinned probe release is downloaded, its checksum checked, and the zip copied into the new bucket | `VulnetixSecurityAuditor` |
| `pipeline` | Stack `vulnetix-security-pipeline`: trail, EventBridge rule, queue, secret, execution role, probe function | `VulnetixSecurityAuditor` |
| `securityhub` | Security Hub is enabled in the deploy region, with its default standards, if it is not already | `VulnetixSecurityAuditor` |

A deploy takes a few minutes. Closing the drawer does not stop a stack that CloudFormation is already building; reopening it picks up where it got to, because the state is read back from CloudFormation each time.

> [!CAREFUL] Security Hub is turned on
> The last phase calls `securityhub:EnableSecurityHub`, with the default security standards, when Security Hub is off in the deploy region. Security Hub and its standards are billed AWS services. Provisioning does not report `complete` until Security Hub is on, and a later reprovision turns it back on if you disabled it.

## 3. Check the connection

When the deploy completes, press **Verify**. Each check is `ok`, `warn` or `fail`:

| Check | Passes when |
|---|---|
| Cross-account access | Vulnetix can assume `VulnetixSecurityAuditor` with your organisation id as the external id |
| CloudTrail delivering | The `vulnetix-management-events` trail is logging |
| Log data readable | A CloudTrail object can be listed and read back from the bucket |
| Event stream wired | The EventBridge rule targets the reporter queue |
| Security Hub readable | `securityhub:GetFindings` is not denied |
| Probe function live | `vulnetix-security-reporter` is `Active` with its queue mapping enabled |
| Probe has run | The function logged an `access ok` or `access degraded` summary in the last 24 hours. The newest one decides. |

A `warn` on a new connection is normal. CloudTrail can take up to 15 minutes to write its first object, and the probe may not have run yet.

## 4. Turn on a source

Open a source card under **Integrations > Cloud**, for example **Amazon Inspector** or **Compute runtime**, switch it on, then press **Deploy** in the drawer. Deploy updates the pipeline stack so the probe's role carries the source's inline policy. Until then the drawer shows the policy as not attached and nothing is read. See [Cloud-native sources](/cloud-security/sources/native-sources/).

The first sweep runs within the next scheduling window (daily, staggered across 4 hours). Findings appear on **Resolve > Cloud**.
