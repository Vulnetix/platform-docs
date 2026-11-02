---
title: Tables
description: Every table Guardian stores, its columns and types, which sources write to it, and the common columns every event row carries.
order: 3
sources: [siem/worker/src/pipeline.ts, siem/worker/src/normalise/finish.ts, siem/docs/datasets.md]
checked: [siem@e0f71fa]
updated: 02 Nov 2026
---

Guardian stores seven tables. A search starts with a table name; a Sigma rule's `logsource` picks one (see [Sigma](/siem/detection/sigma/#logsources)). The search page's help panel (`GET /v1/guardian/help`) lists the same columns.

| Table | Holds | Written by |
|---|---|---|
| `net_events` | Flow records and connection decisions | AWS VPC flow logs, Cloudflare `gateway_network` and `network_analytics_logs`, Pix Sandbox egress, the runtime sensor egress proxy |
| `dns_events` | DNS queries | Route 53 Resolver query logs, Cloudflare `dns_logs`, `gateway_dns`, `dns_firewall_logs`, the runtime sensor DNS guard |
| `waf_events` | WAF matches | Cloudflare `firewall_events` |
| `http_events` | HTTP requests | Cloudflare `http_requests` and `workers_trace_events` fetches, the Vulnetix API access log |
| `cloud_audit` | Control-plane changes | AWS CloudTrail management events, Cloudflare `audit_logs_v2` |
| `product_events` | Vulnetix product decisions | Package Firewall, AI Firewall, Cloudflare Worker invocations other than fetch |
| `ioc_indicators` | The daily Vulnetix indicator snapshot | Loaded by Guardian each day |

## Common columns

Every event table (all but `ioc_indicators`) carries:

| Column | Type | Meaning |
|---|---|---|
| `tenant` | string | Your organisation. Set from the ingest token, never from the payload. |
| `ts` | timestamp | When it happened, UTC. A time more than 5 minutes after ingest is set to the ingest time. |
| `ingested_at` | timestamp | When Guardian received it, UTC. |
| `event_id` | string | A UUID minted at ingest. Row alerts are keyed on it. |
| `source` | string | The producer: `vpc-flow`, `route53-resolver`, `cloudtrail`, `cloudflare-<dataset>`, `pix`, `sensor`, or the `source` an events request named. |
| `host` | string | Instance, sandbox, device or machine name, when known. |
| `ts_clamped` | bool | True when the producer's `ts` was missing, unreadable or in the future and was set to ingest time. |
| `raw` | json | Every field the normaliser did not lift into a column. Read one with `raw.<key>`. |

An `ip` column has an integer companion `<column>_v4` holding the IPv4 address as a number, so `in 10.0.0.0/8` is a range check. IPv6 addresses are stored as text and have no companion. A `list` column (`answers`) is stored as comma-bounded text; `contains` matches an element.

## `net_events`

Network flows. One row per flow record or connection decision: AWS VPC flow logs, Cloudflare Gateway network and Network Analytics logs, Pix Sandbox egress.

| Column | Type | Meaning |
|---|---|---|
| common columns | | See [Common columns](#common-columns). |
| `src_ip` | ip | Source address. |
| `src_ip_v4` | int | Source address. As an integer, for CIDR matching (IPv4 only). |
| `src_port` | int | Source port. |
| `dst_ip` | ip | Destination address. |
| `dst_ip_v4` | int | Destination address. As an integer, for CIDR matching (IPv4 only). |
| `dst_port` | int | Destination port. |
| `dst_host` | string | Destination host name, when the producer saw one (sandbox egress, proxies). |
| `proto` | string | tcp, udp, icmp or the protocol number. |
| `bytes` | int | Bytes in the record. |
| `packets` | int | Packets in the record. |
| `action` | string | ACCEPT, REJECT, allow, block. |
| `direction` | string | ingress or egress, when known. |
| `tcp_flags` | int | TCP flags, VPC flow logs only. |
| `account` | string | AWS account or Cloudflare account id. |
| `region` | string | AWS region or Cloudflare colo. |
| `vpc` | string | VPC id. |
| `eni` | string | Network interface id. |
| `device` | string | Cloudflare WARP device id or name. |
| `policy` | string | The policy or rule that decided, when there was one. |

## `dns_events`

DNS queries. One row per query: Route 53 Resolver query logs, Cloudflare DNS, Gateway DNS and DNS Firewall logs, the sensor DNS guard.

| Column | Type | Meaning |
|---|---|---|
| common columns | | See [Common columns](#common-columns). |
| `qname` | string | The name asked for, lower case, no trailing dot. |
| `qtype` | string | A, AAAA, TXT and the rest. |
| `rcode` | string | NOERROR, NXDOMAIN, SERVFAIL. |
| `answers` | list | Addresses or names returned. |
| `src_ip` | ip | Who asked. |
| `src_ip_v4` | int | Who asked. As an integer, for CIDR matching (IPv4 only). |
| `instance` | string | EC2 instance or resource id that asked. |
| `resolver` | string | Resolver endpoint or Cloudflare colo. |
| `action` | string | allow, block, override, when a policy acted. |
| `policy` | string | DNS Firewall or Gateway policy name. |
| `device` | string | Cloudflare WARP device. |
| `account` | string | AWS account or Cloudflare account id. |
| `vpc` | string | VPC id. |
| `zone` | string | Cloudflare zone, for authoritative DNS logs. |

## `waf_events`

WAF events. One row per WAF match: Cloudflare firewall events; AWS WAF logs when ingested.

| Column | Type | Meaning |
|---|---|---|
| common columns | | See [Common columns](#common-columns). |
| `action` | string | block, challenge, managed_challenge, log, skip, allow. |
| `rule_id` | string | The rule that matched. |
| `rule_source` | string | firewallManaged, firewallCustom, ratelimit, bic and so on. |
| `description` | string | The rule description. |
| `client_ip` | ip | Client address. |
| `client_ip_v4` | int | Client address. As an integer, for CIDR matching (IPv4 only). |
| `host_header` | string | Requested host. |
| `path` | string | Request path. |
| `query` | string | Request query string. |
| `method` | string | HTTP method. |
| `status` | int | Edge response status. |
| `ray_id` | string | Cloudflare Ray ID. |
| `user_agent` | string | User agent. |
| `asn` | int | Client ASN. |
| `country` | string | Client country. |
| `zone` | string | Zone name. |
| `account` | string | Cloudflare or AWS account id. |

## `http_events`

HTTP requests. One row per request: Cloudflare HTTP requests (sampled when the tenant asks) and Vulnetix API access logs.

| Column | Type | Meaning |
|---|---|---|
| common columns | | See [Common columns](#common-columns). |
| `client_ip` | ip | Client address. |
| `client_ip_v4` | int | Client address. As an integer, for CIDR matching (IPv4 only). |
| `host_header` | string | Requested host. |
| `method` | string | HTTP method. |
| `path` | string | Request path. |
| `query` | string | Query string. |
| `status` | int | Response status. |
| `bytes` | int | Response bytes. |
| `duration_ms` | int | Time to respond. |
| `user_agent` | string | User agent. |
| `bot_score` | int | Cloudflare bot score, 1 to 99. |
| `asn` | int | Client ASN. |
| `country` | string | Client country. |
| `zone` | string | Zone name. |
| `ray_id` | string | Cloudflare Ray ID. |

## `cloud_audit`

Cloud audit. Control-plane changes: AWS CloudTrail management events and Cloudflare audit logs.

| Column | Type | Meaning |
|---|---|---|
| common columns | | See [Common columns](#common-columns). |
| `event_name` | string | CloudTrail eventName or the Cloudflare action type. |
| `event_source` | string | CloudTrail eventSource (iam.amazonaws.com) or the Cloudflare resource product. |
| `actor` | string | Principal ARN, user name or Cloudflare actor email. |
| `actor_type` | string | Root, IAMUser, AssumedRole, AWSService, user, api_token. |
| `src_ip` | ip | Caller address. |
| `src_ip_v4` | int | Caller address. As an integer, for CIDR matching (IPv4 only). |
| `user_agent` | string | Caller user agent. |
| `error_code` | string | Set when the call failed. |
| `resource` | string | The resource acted on, when the record names one. |
| `mfa` | bool | True when the session used MFA, when known. |
| `read_only` | bool | True for a read call. |
| `region` | string | AWS region. |
| `account` | string | AWS account or Cloudflare account id. |

## `product_events`

Vulnetix product events. Decisions and audit from Vulnetix itself: Package Firewall, AI Firewall, runtime sensor matches, Software Factory and Belai audit.

| Column | Type | Meaning |
|---|---|---|
| common columns | | See [Common columns](#common-columns). |
| `product` | string | package-firewall, ai-firewall, sensor, factory, belai, console. |
| `event_type` | string | The producer event type, e.g. package.blocked. |
| `actor` | string | Who or what acted. |
| `subject` | string | What it acted on: a package, a host name, a repository. |
| `decision` | string | allow, block, flag, held and so on. |
| `severity` | string | info, low, medium, high, critical. |
| `detail` | string | A one-line description. |

## `ioc_indicators`

Indicators. The daily snapshot of Vulnetix indicators of compromise (malicious domains, addresses and hashes).

| Column | Type | Meaning |
|---|---|---|
| `tenant` | string | The organisation the snapshot was loaded for. |
| `ts` | timestamp | When the snapshot was loaded. |
| `ingested_at` | timestamp | Same as ts. |
| `event_id` | string | Row id. |
| `kind` | string | domain, ipv4, ipv6, sha256. |
| `value` | string | The indicator, lower case. |
| `ioc_source` | string | Where Vulnetix learned it. |
| `first_seen` | timestamp | First sighting. |
| `label` | string | Malware family or campaign, when known. |

