---
title: Cloud security troubleshooting
nav: Troubleshooting
description: The most likely errors while connecting AWS, deploying the stacks, verifying and reading cloud findings, what causes each and the fix.
order: 60
sources: [vdb-site/api/internal/handler/integrations_aws.go, vdb-site/api/internal/handler/integrations_aws_sso.go, vdb-site/api/internal/handler/integrations_aws_connect.go, vdb-site/api/internal/handler/integrations_aws_iamuser.go, vdb-site/api/internal/handler/integrations_aws_deployrole.go, vdb-site/api/internal/handler/integrations_aws_stack.go, vdb-site/api/internal/handler/integrations_aws_verify.go, vdb-site/api/internal/handler/integrations_aws_native.go, vdb-site/api/internal/handler/integrations_aws_probe.go, vdb-site/api/internal/handler/integrations_wiz.go, website/src/stores/vdb-auth.ts, cloudscan/probe.go, cloudscan/README.md]
checked: [vdb-site@d2ea72f23, cloudscan@67eeabb5b, website@7f3b734cd]
updated: 04 Nov 2026
---

The AWS and Wiz drawers show the API's error message as written. This page lists the ones you are most likely to see, by stage, with the cause and the fix. Errors from the API are JSON, `{"error": "<message>"}`, sometimes with a `code`.

## Connecting AWS

| Symptom or message | Cause | Fix |
|---|---|---|
| `the AWS access portal URL must be a *.awsapps.com address` (also `must use https`, `that is not a valid URL`) | The URL is not an IAM Identity Center access portal | Paste the portal URL, `https://<name>.awsapps.com/start`. See [Connect with IAM Identity Center](/cloud-security/aws/connect-identity-center/#device-authorization). |
| `the code expired; start again` (HTTP `410`) | The device code was not approved in time | Start the sign-in again and approve the new code |
| `aws sso session expired` (HTTP `401`, code `SESSION_EXPIRED`) | The access portal sign-in lapsed. This is the AWS session, not your Resolve Platform session. | Press **Re-authorize** in the drawer |
| `NO_PERMISSION_SET` (HTTP `409`): `You have no permission set in this account, ...` | Your sign-in has no permission set in the chosen account, and the portal token alone cannot reach IAM | Get a permission set assigned, or use the [access key connector](/cloud-security/aws/connect-access-key/) |
| `DEPLOY_ROLE_DENIED` (HTTP `403`): `None of your permission sets are allowed to create the role. ...` | No permission set can call `iam:CreateRole`, `iam:PutRolePolicy` and `iam:TagRole` for `VulnetixCloudscanDeploy`. The message ends with what AWS said. | Grant one set those actions, or create the role yourself. See [When no permission set can deploy](/cloud-security/aws/connect-identity-center/#when-no-permission-set-can-deploy). |

## Deploying the stacks

| Symptom or message | Cause | Fix |
|---|---|---|
| `a CloudTrail named vulnetix-management-events already exists in this account outside Vulnetix` | A trail with the fixed name exists and is not in the pipeline stack | Rename or remove that trail, then run the deploy again |
| `the bucket vulnetix-cloudtrail-<account> already exists outside Vulnetix` | A bucket with the fixed name exists and is not in the bootstrap stack | Remove the bucket, then run the deploy again |
| A step shows `failed` with a CloudFormation reason | CloudFormation rolled the stack back. A create that rolled back to `ROLLBACK_COMPLETE` cannot be updated. | Fix what the reason names (usually a missing permission on the deploying identity), then deploy again. Provisioning deletes a `ROLLBACK_COMPLETE` stack before it retries. |

## Verify and the probe

**Verify** reports each check as `ok`, `warn` or `fail`. A `warn` on a new connection is normal for up to 15 minutes. The checks are explained on [Verify](/cloud-security/aws/verify-upgrade-disconnect/#verify).

| Symptom or message | Cause | Fix |
|---|---|---|
| CloudTrail delivering: `the trail exists but logging is stopped` | Someone stopped logging on `vulnetix-management-events` | Start logging on the trail again |
| Log data readable: `no log objects yet` (`warn`) | CloudTrail has not written its first object | Wait up to 15 minutes and verify again |
| Probe has run: `... reported degraded access` (`warn`) | One of the probe's own checks failed. Its summary line in `/aws/lambda/vulnetix-security-reporter` is `access degraded` and lists which. | Read the log line. See [Log lines](/cloud-security/reference/probe-settings/#log-lines). |

## Results look wrong

| Symptom or message | Cause | Fix |
|---|---|---|
| A source is on but shows **policy not attached**, and nothing is read | Switching a source on only records the choice | Press **Deploy** in the source's drawer |
| `aws_required` (HTTP `409`) when turning on a source or connecting Wiz | No AWS account is connected. Native sources and Wiz verification run inside the probe. | Connect AWS first |
| A finding fixed in AWS stays open | The sweep that would close it had a gap (a denial, a throttle, a cap, an unenumerated ARN), so it resolves nothing by absence | Check the coverage record for the gap. See [Coverage and resolution](/cloud-security/get-started/cloud-findings/#coverage-and-resolution) and [Gaps](/cloud-security/sources/compute/#gaps). |
| Wiz connect fails: `Wiz accepted the credentials but refused the query.` | The service account lacks `admin:audit` | Add `admin:audit`. See [Connect Wiz](/cloud-security/wiz/connect-wiz/). |

## Still stuck

Collect the full **Verify** result, the provisioning step that failed with its message, the newest summary line from the `/aws/lambda/vulnetix-security-reporter` log group, the probe version from `GET /v1/integrations/aws/probe`, and the account id and region. The probe logs record each check by id, so the summary line usually names the failing call.
