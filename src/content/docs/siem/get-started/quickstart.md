---
title: Quickstart
description: Start a Guardian pack, ship AWS logs with the CloudFormation stack, run a first search and turn on an alert rule.
order: 2
sources: [siem/worker/src/api/sources.ts, siem/aws/vulnetix-siem.yaml, siem/worker/src/dsl/help.ts, siem/worker/src/api/rules.ts]
checked: [siem@e0f71fa]
updated: 02 Nov 2026
---

This takes about 15 minutes. You need an owner or admin role in a Vulnetix organisation on the Business or Enterprise plan, and permission to create IAM roles, Firehose streams and flow logs in an AWS account.

## 1. Start a pack

Open **Guardian** in the console. If Guardian is not active, the page shows **Start Guardian**. Pick a pack and finish the Stripe checkout. The page reloads with Guardian active.

## 2. Create an AWS ingest token

On **Guardian > Sources**, press **New token** and pick kind **AWS**. It looks like `gdn_...` and is shown once. Copy it now.

A token is tied to one kind (`aws`, `cloudflare` or `events`). An AWS token sent to the Cloudflare or events endpoint is refused with `401`.

## 3. Deploy the delivery stack

Use **Launch in AWS** on the Sources page and paste the token into the `IngestToken` field, or deploy from a shell:

```sh
curl -fsSLo vulnetix-siem.yaml https://guardian.vulnetix.com/v1/templates/vulnetix-siem.yaml
aws cloudformation deploy --stack-name vulnetix-siem --template-file vulnetix-siem.yaml \
  --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
  --parameter-overrides IngestToken=gdn_xxxxxxxxxxxxxxxxxxxx VpcIds=vpc-0abc1234,vpc-0def5678
```

Deploy it once per region whose VPCs should send. Parameters and resources are on [AWS](/siem/sources/aws/).

## 4. Check the token is delivering

Within a few minutes **Sources** shows a last batch time and today's volume for the token. If the token shows an error, see [Ingest tokens](/siem/sources/ingest-tokens/).

## 5. Run a search

On **Guardian > Search**, set the range to the last hour and run:

```
net_events
| where direction == 'egress' and not dst_ip in (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
| stats count() as flows, sum(bytes) as bytes by dst_ip, host
| sort -bytes
| limit 20
```

The help panel lists more templates. Syntax is on [Search syntax](/siem/search/syntax/).

## 6. Turn on a rule

On **Guardian > Rules**, open the catalogue and turn on **Indicator domain resolved** (`ioc-dns`, level `critical`), which matches DNS queries against the Vulnetix indicator list. Set a target (a messaging connection or an email address) on the rule. New matches arrive as `siem.alert.<level>` messages. See [Alert rules](/siem/detection/rules/).
