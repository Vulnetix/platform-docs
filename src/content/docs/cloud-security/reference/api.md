---
title: Resolve Platform API
description: Every route behind the cloud security pages of the Resolve Platform, with the method, path and purpose. These routes take a signed-in Resolve Platform session.
order: 50
nav: API routes
sources: [vdb-site/api/main.go]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

The Resolve Platform calls these on the Vulnetix site API, under `https://www.vulnetix.com/api/site`. They authenticate with the signed-in Resolve Platform session, not an API key, and every one needs the Pro plan or above. Routes marked *probe* are called by the probe in your account with the API key pair from `vulnetix/vdb-credentials`; you do not call them.

## AWS

| Method | Path | Does |
|---|---|---|
| `GET` | `/v1/integrations/aws` | The connection, or `{"connection": null}` |
| `DELETE` | `/v1/integrations/aws[?force=true]` | Disconnect, one step per call |
| `POST` | `/v1/integrations/aws/iam-user` | Connect with an access key |
| `GET` | `/v1/integrations/aws/policy` | The deploy policy to attach |
| `PATCH` | `/v1/integrations/aws/advanced` | Private reporting opt-in, `{"enabled": bool}` |
| `POST` | `/v1/integrations/aws/sso/start` | `{startUrl, region}`: begin device authorization |
| `POST` | `/v1/integrations/aws/sso/poll` | `{deviceCode}`: `pending`, `slow_down` or `authorized` |
| `GET` | `/v1/integrations/aws/sso/accounts` | Accounts the Identity Center session can reach |
| `GET` | `/v1/integrations/aws/sso/accounts/{accountId}/roles` | Permission sets in one account |
| `GET`, `POST`, `DELETE` | `/v1/integrations/aws/sso/accounts/{accountId}/deploy-role` | The `VulnetixCloudscanDeploy` role |
| `POST` | `/v1/integrations/aws/connect` | `{accountId, accountName, roleName}`: choose the account and permission set |
| `GET`, `POST` | `/v1/integrations/aws/accounts` | Connected accounts; add many |
| `PATCH` | `/v1/integrations/aws/accounts/{accountId}` | Enable, disable or redeploy one |
| `GET` | `/v1/integrations/aws/provision` | `{state, nextPhase, steps}` |
| `POST` | `/v1/integrations/aws/provision` | `{phase}`: `bootstrap`, `probe`, `pipeline` or `securityhub` |
| `POST` | `/v1/integrations/aws/verify` | The reachability checks |
| `GET` | `/v1/integrations/aws/probe` | Deployed and available probe versions |
| `POST` | `/v1/integrations/aws/probe/upgrade` | Stage and deploy the current probe |

## Cloud-native sources

| Method | Path | Does |
|---|---|---|
| `GET` | `/v1/integrations/aws/native` | Every source with `enabled`, `policyAttached`, last run |
| `POST` | `/v1/integrations/aws/native/{source}` | `{"enabled": bool}` |
| `POST` | `/v1/integrations/aws/native/{source}/deploy` | Redeploy so the role carries the policies |
| `POST` | `/v1/cloud/native/findings` | *Probe*: native findings |

## Wiz

| Method | Path | Does |
|---|---|---|
| `GET`, `POST`, `DELETE` | `/v1/integrations/wiz` | Read, connect (`{clientId, clientSecret, tenantDatacenter}`), disconnect |
| `POST` | `/v1/integrations/wiz/test` | Re-check the credential |
| `POST` | `/v1/integrations/wiz/sync` | Start a sync now (`202`) |
| `GET` | `/v1/cloud/wiz/worklist` | *Probe*: claims to check |
| `POST` | `/v1/cloud/wiz/verifications` | *Probe*: verdicts |

## Findings and WAF

| Method | Path | Does |
|---|---|---|
| `GET` | `/v1/cloud-findings`, `/by-vulnerability`, `/coverage`, `/runtime`, `/{findingUuid}` | See [Cloud findings](/cloud-security/get-started/cloud-findings/) |
| `GET` | `/v1/cloud/waf/coverage`, `/changes`, `/unprotected`, `/policies`, `/policies/{policyUuid}` | See [AWS WAF posture](/cloud-security/sources/waf-posture/) |
| `POST` | `/v1/cloud/waf/inventory`, `/v1/cloud/waf/finalize` | *Probe*: WAF collection |

## Plan lock

A request below the Pro plan answers `200` with the plan-locked body the Resolve Platform renders as an upgrade prompt, not `403`.
