---
title: AWS WAF posture
description: What the AWS WAF source reads, including web ACLs, rules, managed rule groups, IP and regex sets and logging, what it skips, and where the result appears.
order: 22
nav: AWS WAF posture
sources: [cloudscan/waf.go, cloudscan/README.md, vdb-site/api/internal/handler/cloud_native.go, vdb-site/api/internal/handler/cloud_waf_read.go, vdb-site/api/main.go, vdb-site/api/internal/handler/assets/aws-pipeline.yaml]
checked: [cloudscan@67eeabb, vdb-site@1a06d67]
updated: 02 Nov 2026
---

A cloud finding can say a load balancer is internet-facing and affected. It cannot say whether a WAF stands in front of it, or whether that WAF blocks anything: a web ACL whose every rule is in `COUNT` mode looks, from outside, the same as one that enforces. The `waf` source answers both from configuration.

## What it reads

- Web ACLs in the `REGIONAL` scope of every region, and the `CLOUDFRONT` scope (served from `us-east-1`).
- Each ACL's rules and their actions, managed rule groups and their versions against the vendor's current default, custom rule groups, IP sets and regex pattern sets.
- The logging configuration of each ACL.
- What each ACL is attached to, and CloudFront distributions.
- WAF Classic (`waf`, `waf-regional`). A Classic record has no managed rule groups, labels or capacity, and the Resolve Platform marks it as a weaker record.

What it does **not** read: CloudWatch metrics and `GetSampledRequests`. Those are the only signals that prove a rule fired. Everything reported describes what a rule is configured to do, never what it has done. Calls the account refused are recorded, so an empty answer is never mistaken for an account with no WAF.

The pass runs on its own chain beside the sweep. A sweep that fails still produces WAF data, and a WAF pass denied every call still lets the sweep finish.

## Turn it on

Switch on **AWS WAF** under **Integrations > Cloud** and press **Deploy**. This attaches `vulnetix-reporter-waf` (actions on [Permissions](/cloud-security/aws/permissions/#per-source-inline-policies)) and sets `ReadWafConfiguration=true`. The probe must be `v0.5.0` or later; on an older probe the WAF tab says the probe is too old rather than showing an empty table. Upgrade it from the AWS drawer ([Upgrade the probe](/cloud-security/aws/verify-upgrade-disconnect/#upgrade-the-probe)).

## Where it shows

The **WAF** tab on the **Virtual patching** page. To push Vulnetix virtual-patch rules into AWS WAF, see [/virtual-patching/](/virtual-patching/).

| Method | Path | Returns |
|---|---|---|
| `GET` | `/v1/cloud/waf/coverage` | The header strip per provider, and whether an empty answer means no WAF or never looked |
| `GET` | `/v1/cloud/waf/policies?provider=&region=&mode=&q=` | Web ACLs, one row each |
| `GET` | `/v1/cloud/waf/policies/{policyUuid}` | One ACL with its rules |
| `GET` | `/v1/cloud/waf/unprotected` | Resources with nothing in front of them |
| `GET` | `/v1/cloud/waf/changes` | Configuration changes between collections |
