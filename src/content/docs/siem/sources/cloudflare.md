---
title: Cloudflare
description: Send Cloudflare zone and account logs to Guardian with Logpush, the API token permissions Guardian checks, the datasets it reads, and how to remove the jobs.
order: 2
sources: [siem/worker/src/api/sources.ts, siem/worker/src/cloudflare/permissions.json, siem/worker/src/normalise/cloudflare.ts, siem/worker/src/ingest/routes.ts, siem/docs/cloudflare.md]
checked: [siem@e0f71fa]
updated: 02 Nov 2026
---

Guardian takes Cloudflare logs through Logpush jobs with an HTTP destination: `https://ingest.vulnetix.com/v1/ingest/cloudflare/<dataset>`. Guardian creates the jobs for you with an API token you paste once and it does not keep, or you create them yourself.

## Connect from the Resolve Platform

1. Open **Integrations** and the **Cloudflare** card.
2. Use the pre-filled token link to create an account-owned API token in the Cloudflare dashboard, or paste one you have.
3. **Check** tests the token against each permission below and shows each as granted, missing or could not check, with the zones that lack one. If something is missing, the drawer links the dashboard's token form pre-filled with only the missing permissions.
4. Pick zones and datasets, then **Create jobs**. Guardian creates one Guardian ingest token (kind `cloudflare`) shared by every job it makes in that run, creates the jobs, and forgets your Cloudflare token.
5. Optionally save the Cloudflare token in the Vulnetix Secrets Vault so investigation agents can read your zone during a [workflow](/siem/alerts/triggers/#software-factory-workflows).

Running it again is safe: a dataset that already has a job sending to `ingest.vulnetix.com` is skipped and reported as "already sending to Guardian".

You need an owner or admin role.

## Token permissions

Guardian tests each permission with a call that needs it and changes nothing. A refusal (`403`, or Cloudflare error `9109`, `10000` or `10001`) is **missing**; any other failure is **could not check**, never **granted**. Zone permissions are tested on up to 25 zones.

| Permission (as the token editor shows it) | Need | Why |
|---|---|---|
| Account, Account Settings, Read | required | Find the account and the datasets it offers |
| Zone, Zone, Read | required | List the zones to send logs from |
| Zone, Logs, Edit | required | Create the zone Logpush jobs |
| Account, Logs, Edit | optional | Create account Logpush jobs (Gateway, DNS Firewall, Network Analytics, audit, Workers) |
| Zone, Firewall Services, Read | required | Investigations read the WAF and firewall rules behind an alert |
| Zone, Analytics, Read | required | Investigations read the traffic around an alert |
| Zone, DNS, Read | required | Investigations check the zone's DNS records |
| Zone, Zone Settings, Read | required | Investigations read the security level and bot settings |
| Account, Zero Trust, Read | optional | Investigations read Gateway policies |

## Datasets

| Dataset | Scope | Table | Notes |
|---|---|---|---|
| `firewall_events` | zone | `waf_events` | |
| `http_requests` | zone | `http_events` | High volume. Counts against the daily ingest cap. |
| `dns_logs` | zone | `dns_events` | Authoritative DNS |
| `gateway_dns` | account | `dns_events` | Zero Trust Gateway |
| `dns_firewall_logs` | account | `dns_events` | |
| `gateway_network` | account | `net_events` | `SNI` becomes `dst_host` |
| `network_analytics_logs` | account | `net_events` | Bytes and packets scaled by `SampleInterval` |
| `audit_logs_v2` | account | `cloud_audit` | `source` is `cloudflare-audit_logs_v2` |
| `workers_trace_events` | account | `http_events` or `product_events` | Workers Paid. A `fetch` invocation is an `http_events` row; any other is a `product_events` row with `event_type` `worker.<type>`. Console `Logs` are not stored. |

Account datasets need the 32-character hex account id. DNS query types and response codes arrive as numbers and are stored as names (`A`, `AAAA`, `NXDOMAIN`). Every field not lifted into a column is kept in `raw`. Each row's `source` is `cloudflare-<dataset>`.

> [!CAREFUL] Your Cloudflare plan decides which datasets you can push
> Cloudflare lists Logpush on every plan, but which datasets an account can push depends on the products it has. A dataset your plan does not include is refused by Cloudflare at job creation (sometimes worded as "exceeded max jobs allowed" even with no jobs). Guardian reports that as the plan not including the dataset. Cloudflare also allows at most four Logpush jobs per zone, one dataset each; a zone already at four is reported and not attempted.

## Create the jobs yourself

If you would rather not hand over a token, create an ingest token of kind `cloudflare` on **Guardian > Sources** and create a Logpush job per dataset with this destination:

```
https://ingest.vulnetix.com/v1/ingest/cloudflare/<dataset>?label=<zone name or account id>&header_Authorization=Bearer%20<token>
```

For example, with the Cloudflare API:

```sh
curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/logpush/jobs" \
  -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
  --data '{
    "name": "vulnetix-guardian-firewall_events",
    "dataset": "firewall_events",
    "enabled": true,
    "destination_conf": "https://ingest.vulnetix.com/v1/ingest/cloudflare/firewall_events?label=example.com&header_Authorization=Bearer%20gdn_xxxxxxxxxxxxxxxxxxxx",
    "output_options": {
      "field_names": ["Datetime","Action","RuleID","Source","Description","ClientIP","ClientRequestHost","ClientRequestPath","ClientRequestQuery","ClientRequestMethod","EdgeResponseStatus","RayID","ClientRequestUserAgent","ClientASN","ClientCountry","Kind","MatchIndex","OriginatorRayID"],
      "timestamp_format": "rfc3339",
      "output_type": "ndjson"
    }
  }'
```

`label` lets the Sources page show the last batch per zone when several jobs share one token. Guardian reads RFC 3339 timestamps and ndjson. The fields Guardian maps for each dataset:

| Dataset | `field_names` |
|---|---|
| `firewall_events` | `Datetime Action RuleID Source Description ClientIP ClientRequestHost ClientRequestPath ClientRequestQuery ClientRequestMethod EdgeResponseStatus RayID ClientRequestUserAgent ClientASN ClientCountry Kind MatchIndex OriginatorRayID` |
| `http_requests` | `EdgeStartTimestamp ClientIP ClientRequestHost ClientRequestMethod ClientRequestPath ClientRequestURI EdgeResponseStatus EdgeResponseBytes EdgeTimeToFirstByteMs ClientRequestUserAgent BotScore ClientASN ClientCountry RayID SecurityAction WAFAttackScore` |
| `dns_logs` | `Timestamp QueryName QueryType ResponseCode SourceIP ColoCode ResponseCached EDNSSubnet` |
| `gateway_dns` | `Datetime QueryName QueryTypeName RCode SrcIP DeviceName DeviceID Email ResolverDecision PolicyName ResolvedIPs ColoCode AccountID MatchedCategoryNames MatchedIndicatorFeedNames` |
| `dns_firewall_logs` | `Timestamp QueryName QueryType ClientResponseCode SourceIP ColoCode ResponseReason ClusterID UpstreamIP` |
| `gateway_network` | `Datetime SourceIP SourcePort DestinationIP DestinationPort TransportProtocol Action DeviceName DeviceID Email PolicyName SNI AccountID SessionID` |
| `network_analytics_logs` | `Datetime IPSourceAddress SourcePort IPDestinationAddress DestinationPort IPProtocolName Outcome RuleName RuleID Direction ColoCode IPTotalLength SampleInterval TCPFlags AttackVector MitigationReason` |
| `workers_trace_events` | `EventTimestampMs EventType Outcome ScriptName ScriptTags ScriptVersion Entrypoint DispatchNamespace CPUTimeMs WallTimeMs Exceptions Event` |
| `audit_logs_v2` | `ActionTimestamp ActionType ActionResult ActionDescription ResourceProduct ResourceType ResourceID ResourceScope ActorEmail ActorID ActorType ActorIPAddress AccountID ZoneName` |

Logpush checks a new destination by uploading a gzipped `test.txt.gz` holding `{"content":"tests"}`. Guardian answers it `200` without storing anything.

## Responses Logpush sees

| Status | When |
|---|---|
| `200` | `{ ok, rows, skipped }`, or `{ ok, probe: true }` for the destination check |
| `401` | Missing, revoked or non-`cloudflare` token |
| `402` | Guardian is not active for the organisation |
| `404` | Unknown dataset in the path |
| `413` | Body over 100 MB |
| `429` | Today's ingest is over 1.5 times the pack's cap |
| `500` | Guardian could not store the batch |

Logpush retries a failed push and then marks the job as failing in your Cloudflare dashboard.

## Health

**Guardian > Sources** shows, per job, when its last batch arrived and whether its ingest token is revoked. Cloudflare's own job status (`last_complete`, `last_error`) is in your Cloudflare dashboard; Guardian keeps no token to read it.

## Remove jobs

**Remove** on the Sources page takes a Cloudflare token again, deletes the selected jobs from Cloudflare and forgets them. A job Cloudflare no longer has counts as deleted. When no job is left on an ingest token, Guardian revokes that token, so a job deleted elsewhere cannot keep sending.

Without a Cloudflare token, revoke the ingest token on the Sources page. Every job that shares it stops being accepted, and Cloudflare shows those jobs failing until you delete them.
