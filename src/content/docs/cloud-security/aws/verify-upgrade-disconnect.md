---
title: Verify, upgrade and disconnect
description: Checking that Vulnetix can read a connected account, upgrading the probe when a new release is out, the private reporting opt-in, and removing everything Vulnetix deployed.
order: 14
nav: Verify, upgrade, disconnect
sources: [vdb-site/api/internal/handler/integrations_aws_verify.go, vdb-site/api/internal/handler/integrations_aws_probe.go, vdb-site/api/internal/handler/integrations_aws_stack.go, vdb-site/api/internal/handler/integrations_aws_iamuser.go, vdb-site/api/main.go]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

## Verify

`POST /v1/integrations/aws/verify`, the **Verify** button. It answers whether the data is reachable right now, with the credentials and calls the probe uses. A stack in `CREATE_COMPLETE` with a trail that stopped logging, or a role whose policy someone edited, passes CloudFormation's view and fails here.

| Check id | Label | `fail` means |
|---|---|---|
| `assume-role` | Cross-account access | Vulnetix cannot assume `VulnetixSecurityAuditor` with your organisation id. The role was deleted, or its trust policy changed. |
| `cloudtrail` | CloudTrail delivering | The trail `vulnetix-management-events` is not logging. |
| `log-objects` | Log data readable | A log object cannot be listed or read back. |
| `event-queue` | Event stream wired | The EventBridge rule does not target the reporter queue. |
| `security-hub` | Security Hub readable | `securityhub:GetFindings` was denied. |
| `probe-function` | Probe function live | The function is missing, not `Active`, or its queue mapping is off. |
| `probe-ran` | Probe has run | (`warn` only) No `access ok` or `access degraded` summary in the last 24 hours. The probe runs on a sweep or when the account has write activity. |

`warn` is a sound path with nothing to show yet, such as a trail that has not written its first object (up to 15 minutes).

## Upgrade the probe

The probe is a Lambda in your account. It never updates itself and Vulnetix does not replace it without asking. `GET /v1/integrations/aws/probe` reads the version from the staged bundle key (`vulnetix/probe/cloudscan-<version>-<digest>.zip`) on the pipeline stack and answers:

| Field | Meaning |
|---|---|
| `deployedVersion` | What the function runs |
| `availableVersion` | The release Vulnetix currently deploys |
| `upgradeAvailable` | `true` when they differ and the deployed one is older |
| `grantsNewPermissions` | `true` when the upgrade attaches a policy the role does not carry now |
| `newPermissionReasons` | What would be attached, for example `analyser`, `wiz`, `waf` |

**Upgrade** (`POST /v1/integrations/aws/probe/upgrade`) stages the new bundle and redeploys the pipeline stack. The bootstrap stack, which holds the bucket and the access role, is not touched. When `grantsNewPermissions` is `true` the drawer lists the new grants and asks first.

## Private reporting

By default the probe reports to Vulnetix over the public HTTPS endpoint, which needs nothing from you. `PATCH /v1/integrations/aws/advanced` with `{"enabled": true}` opts in to a private network path; Vulnetix fills the `PrivateReporting` and endpoint parameters on the next pipeline deploy. The private endpoint is only reachable once its endpoint service connection is accepted in your account, so leave this off unless Vulnetix support has set that up with you.

## Disconnect

`DELETE /v1/integrations/aws`, the **Disconnect** button. It removes everything Vulnetix put in the account, one resumable step per call, and answers `{ "done": false, "step": "..." }` until it is finished. The console calls it until `done` is `true`. The order is fixed:

1. Delete the pipeline stack (CloudTrail stops writing to the bucket).
2. Empty the log bucket, in batches. The step reports how many objects it removed.
3. Delete the bootstrap stack with your own credentials, because it contains the role the earlier steps used.
4. Remove the connection.

`DELETE /v1/integrations/aws?force=true` drops the connection without reaching AWS, for when AWS refuses a step indefinitely. The answer names the stacks left behind; delete them yourself in the CloudFormation console.

Findings already ingested are kept with their triage history.
