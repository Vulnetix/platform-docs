---
title: Connect Wiz
description: Create a Wiz service account with admin:audit, connect it after AWS, and what Vulnetix pulls from Wiz on each daily sync.
order: 30
nav: Connect Wiz
sources: [vdb-site/api/internal/handler/integrations_wiz.go, vdb-site/api/internal/handler/integrations_wiz_sync.go, vdb-site/api/internal/wizclient/wizclient.go, vdb-site/api/internal/wizclient/queries.go, website/src/components/integrations/console/IntegrationWizDrawer.vue, vdb-site/api/main.go]
checked: [vdb-site@1a06d67, website@ad775f37]
updated: 02 Nov 2026
---

Vulnetix does not re-display Wiz findings. It records each Wiz claim as Wiz made it, then has the probe check the claim from inside your AWS account and records a second verdict beside it. That needs the probe, so **Wiz can only be connected after AWS**. Without an AWS connection the request is refused with `409` and code `aws_required`.

## 1. Create a Wiz service account

1. In the Wiz console, go to **Settings > Service Accounts**.
2. Name it for what it is, for example `Vulnetix AWS Cloudscan`.
3. Select the **`admin:audit`** permission. It is read-only and the only one required.
4. Click **Add Service Account** and copy the **Client ID** and **Client Secret**. The secret is shown once; if you lose it, create another service account.

## 2. Find your datacenter

Your tenant datacenter is the segment in your Wiz API host: `us17` in `api.us17.wiz.io`. It may contain only lowercase letters, digits and hyphens.

## 3. Connect

In the Vulnetix console open **Integrations > Wiz** and enter the client id, client secret and datacenter.

Vulnetix mints a token from Wiz's global auth endpoint and then runs a one-row issues query against `https://api.<datacenter>.wiz.io/graphql`. A token alone proves only authentication; a service account without `admin:audit` mints one too. The query proves the account can read.

| Field | Stored |
|---|---|
| `clientId` | In the clear; shown in the console |
| `tenantDatacenter` | In the clear; shown in the console |
| `clientSecret` | In the Vulnetix secrets vault. Never returned to the console and never sent to the probe. |

Connecting sets the pipeline stack's `WizVerification` parameter to `true` on the next deploy, which attaches `vulnetix-reporter-wiz` (ECR image metadata and SSM inventory reads) to the probe's role. Disconnecting Wiz removes it again on the next deploy.

| Status | Meaning |
|---|---|
| `200` | Connected |
| `400` | A missing field or an invalid datacenter |
| `409` | `aws_required`: connect AWS first |
| `502` | Wiz refused. The message says which: the client id or secret was rejected, or the service account lacks `admin:audit`, or the datacenter host did not resolve. |

## What each sync pulls

The sync runs from Vulnetix, where the credential is. It pulls three datasets, in this order:

| Dataset | One row per |
|---|---|
| `cloudResources` | Resource in Wiz's current inventory |
| `issues` | Control and resource |
| `vulnerabilityFindings` | Resource, package and CVE |

The inventory comes first so a claim about a resource Wiz still lists in an old snapshot is checked against what exists now. Rows are filed under the scanner `Wiz` and never edited afterwards.

| Plan | Cadence |
|---|---|
| Pro and above | Daily, staggered across a 3-hour window |

**Sync now** (`POST /v1/integrations/wiz/sync`) answers `202` at once; the outcome appears as the connection's `lastSyncedAt` or `lastSyncError`. **Test** (`POST /v1/integrations/wiz/test`) re-runs the credential check.

## Disconnect

`DELETE /v1/integrations/wiz`. Findings already ingested from Wiz are kept with their triage history.
