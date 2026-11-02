---
title: Connect with IAM Identity Center
description: The device authorization flow, the account and permission set picker, the VulnetixCloudscanDeploy role for accounts whose permission sets cannot deploy, and connecting many accounts at once.
order: 10
nav: IAM Identity Center
sources: [vdb-site/api/internal/handler/integrations_aws_sso.go, vdb-site/api/internal/handler/integrations_aws_deployrole.go, vdb-site/api/internal/handler/integrations_aws_accounts.go, vdb-site/api/internal/handler/integrations_aws_accounts_provision.go, vdb-site/api/main.go, saas/prisma/models/vdb-api.prisma]
checked: [vdb-site@1a06d67, saas@50cedf37]
updated: 02 Nov 2026
---

IAM Identity Center is the recommended connector. Vulnetix never stores a long-lived AWS credential for it: it holds the short-lived access portal token from your sign-in and, after the bootstrap stack exists, assumes the `VulnetixSecurityAuditor` role for every later operation. Every call Vulnetix makes in your account appears in your CloudTrail with the role session name `vulnetix-resolve`.

## Device authorization

The flow is the OAuth device authorization grant (RFC 8628). Your browser never redirects back to Vulnetix.

1. Vulnetix registers an OIDC client named `vulnetix-resolve` against your access portal and starts device authorization.
2. You approve the user code on AWS's own page.
3. The console polls. Each poll answers `pending`, `slow_down` or `authorized`; an expired code answers `410` and you start again.

Inputs:

| Field | Rule |
|---|---|
| Access portal URL | `https` and a host matching `<name>.awsapps.com`. It is normalised to `https://<name>.awsapps.com/start`. Anything else is refused, so the URL cannot point Vulnetix at another host. |
| Region | One of the commercial regions on the allowlist: `us-east-1`, `us-east-2`, `us-west-1`, `us-west-2`, `ca-central-1`, `ca-west-1`, `sa-east-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-central-1`, `eu-central-2`, `eu-north-1`, `eu-south-1`, `eu-south-2`, `ap-southeast-1` to `ap-southeast-4`, `ap-northeast-1` to `ap-northeast-3`, `ap-south-1`, `ap-south-2`, `ap-east-1`, `me-south-1`, `me-central-1`, `af-south-1`, `il-central-1`. |

The region is also where the two stacks and the probe are deployed. The trail itself is multi-region.

## Account and permission set

After approval the drawer lists every account and permission set your sign-in can reach. The permission set you pick is the identity the **bootstrap** stack is deployed with, so it must be able to create the resources on [What Vulnetix deploys](/cloud-security/aws/what-gets-deployed/). Everything after bootstrap runs as `VulnetixSecurityAuditor`, not as your permission set.

## When no permission set can deploy

The access portal token can list accounts and permission sets and mint credentials for one of them. It cannot reach IAM. So:

| Situation | What you can do |
|---|---|
| No permission set is assigned to you in the account | Nothing from the drawer. Get a permission set assigned, or use the [access key connector](/cloud-security/aws/connect-access-key/). |
| Only read-only sets, but one of them can write IAM | Press **Create deploy role**. Vulnetix creates `VulnetixCloudscanDeploy` with that set's credentials and adopts it for every later deploy. |

`VulnetixCloudscanDeploy`:

- carries one inline policy, also named `VulnetixCloudscanDeploy`, which is the same generated deploy policy the access key connector asks for (see [Permissions](/cloud-security/aws/permissions/#the-deploy-policy));
- trusts the permission set you used to create it. If Vulnetix cannot read that permission set's exact role ARN, the role trusts the account instead, and the drawer says so: anyone in the account already allowed to call `sts:AssumeRole` could then adopt it;
- is tagged `ManagedBy=Vulnetix`. A role with the same name and no such tag is never modified;
- is checked on each open: the drawer reports a role that is missing, no longer trusts you, or carries an out-of-date policy.

You can also create the role yourself (Terraform, the IAM console) with that name, the deploy policy and a trust policy naming your identity. Vulnetix treats any role named `VulnetixCloudscanDeploy` the same way.

API: `GET`, `POST`, `DELETE /v1/integrations/aws/sso/accounts/{accountId}/deploy-role`.

## Many accounts

One Identity Center connection reaches many accounts. **Add accounts** in the drawer records several at once and, with **Deploy** ticked, queues each for provisioning. Up to 4 accounts deploy at a time; an account claimed by a worker that stops is reclaimed after 20 minutes. Each account's state is one of `queued`, `deploying`, `deployed` or `failed`.

| Method | Path | Body |
|---|---|---|
| `GET` | `/v1/integrations/aws/accounts` | |
| `POST` | `/v1/integrations/aws/accounts` | `{ "accounts": [{ "accountId", "accountName", "roleName" }], "deploy": true }` |
| `PATCH` | `/v1/integrations/aws/accounts/{accountId}` | `{ "enabled": false, "deploy": false }` |

Source opt-ins apply to every connected account, including accounts you connect later.
