---
title: Events API
description: Post your own rows to Guardian over HTTPS with an events token, the request and response format, the tables you may write, and the Vulnetix products that send to Guardian.
order: 3
sources: [siem/worker/src/ingest/routes.ts, siem/worker/src/normalise/events.ts, siem/worker/src/normalise/finish.ts, siem/worker/src/pipeline.ts, cli/internal/sensor/siem/siem.go, cli/cmd/vulnetix-sensor/main.go]
checked: [siem@e0f71fa, cli@4c8c3b71c]
updated: 02 Nov 2026
---

The events route takes rows that are already shaped like Guardian's tables. Use it for a log source Guardian has no connector for, a script, or the Vulnetix runtime sensor.

```
POST https://ingest.vulnetix.com/v1/ingest/events
Authorization: Bearer gdn_...
Content-Type: application/json
```

The token must be an ingest token of kind `events`, created on **Guardian > Sources** (shown as **Events API**). The organisation comes from the token; a `tenant` key in a row is dropped and counted.

## Request

```json
{
  "source": "my-proxy",
  "events": [
    {
      "table": "net_events",
      "row": {
        "ts": "2026-11-02T03:14:07Z",
        "host": "proxy-1",
        "src_ip": "10.0.4.17",
        "dst_host": "example.org",
        "dst_port": 443,
        "proto": "tcp",
        "action": "allow",
        "direction": "egress",
        "raw": { "rule": "default-allow" }
      }
    }
  ]
}
```

| Field | Rule |
|---|---|
| `source` | Optional, at most 40 characters. Becomes the `source` column of every row. Default `vulnetix`. |
| `events` | At most 5,000 per request. Body at most 100 MB. |
| `events[].table` | One of `net_events`, `dns_events`, `http_events`, `product_events`. Anything else is rejected. |
| `events[].row` | Column names from [Tables](/siem/search/tables/). Unknown keys are dropped. |
| `row.ts` | An ISO 8601 / RFC 3339 string. Missing, unparseable, or more than 5 minutes in the future: set to ingest time and `ts_clamped` is `true`. |
| `row.event_id`, `row.ingested_at`, `row.*_v4` | Ignored. Guardian sets them. |
| list columns (`answers`) | An array of strings. |
| `row.raw` | A JSON object for anything without a column. |

A quick test from a shell:

```sh
curl -sS https://ingest.vulnetix.com/v1/ingest/events \
  -H "Authorization: Bearer $GUARDIAN_EVENTS_TOKEN" -H 'Content-Type: application/json' \
  --data '{"source":"smoke","events":[{"table":"product_events","row":{"ts":"2026-11-02T00:00:00Z","product":"smoke","event_type":"smoke.test","decision":"allow","detail":"hello"}}]}'
```

## Response

| Status | Body |
|---|---|
| `200` | `{ "ok": true, "rows": <stored>, "rejected": <events not stored>, "droppedTenant": <rows that carried tenant> }` |
| `400` | `{ "error": "could not store the events" }`: the body is not JSON |
| `401` | `{ "error": "unauthorised" }`: missing, revoked or non-`events` token |
| `402` | `{ "error", "code": "plan" }`: Guardian is not active for the organisation |
| `413` | More than 5,000 events, or the body is over 100 MB |
| `429` | `{ "error", "code": "ingest_cap" }`: today's ingest is over 1.5 times the pack's cap. Resumes at 00:00 UTC. |

## The runtime sensor

`vulnetix-sensor --forward siem` sends every DNS and egress decision it makes to this route, as `dns_events` and `net_events` rows with `source` `sensor`.

| Flag | Env | Default |
|---|---|---|
| `--forward siem` | | off. `siem` is the only value. Needs `--dns-listen`, `--egress-listen` or both. |
| `--siem-token` | `VULNETIX_SIEM_TOKEN` | required with `--forward siem`: an events token |
| `--siem-url` | `VULNETIX_SIEM_URL` | `https://ingest.vulnetix.com/v1/ingest/events`. Must be `https`. |

The sensor buffers up to 20,000 rows and posts up to 1,000 at a time every 10 seconds. Forwarding never slows a decision: when the buffer is full the oldest rows are dropped and counted, and a batch Guardian refuses is dropped too. A blocked or held decision is stored with `action` `block`; `policy` is `<rule table>:<rule uuid>`, and `raw` keeps `decision`, `reason`, `indicator` and `hold_until`. Deploying the sensor is covered on [Vulnetix sensor](/virtual-patching/runtime/sensor/).

## Vulnetix products

These Vulnetix services send to Guardian on your behalf, with no token to set up. Their rows are stored only for organisations with Guardian active, and they do not count against your ingest cap.

| Producer | Table | `source` |
|---|---|---|
| Package Firewall decisions | `product_events` | `package-firewall` |
| AI Firewall decisions | `product_events` | `ai-firewall` |
| Pix Sandbox egress | `net_events` | `pix` |
| Vulnetix API access log (authenticated requests; CDN cache hits are left out) | `http_events` | `vdb-api` |
