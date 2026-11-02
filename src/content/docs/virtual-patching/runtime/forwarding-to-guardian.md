---
title: Forwarding to Guardian
description: Copy every DNS lookup and egress connection the sensor decides to Guardian, the Vulnetix SIEM, with an events ingest token.
order: 7
nav: Forwarding to Guardian
sources: [cli/internal/sensor/siem/siem.go, cli/cmd/vulnetix-sensor/main.go, cli/deploy/sensor/README.md, siem/worker/src/ingest/routes.ts, siem/worker/src/normalise/events.ts]
checked: [cli@4c8c3b7, siem@e0f71fa]
updated: 02 Nov 2026
---

With `--forward siem`, the sensor sends every DNS lookup the DNS guard answers and every connection the egress proxy carries or refuses to Guardian, matched or not. The Sensors page still gets only the matches. Guardian gets the whole stream, so a detection can look at the clean traffic around a hit.

```bash
export VULNETIX_SIEM_TOKEN=gdn_...
vulnetix-sensor --mode guard \
  --feed https://vulnetix.com/feeds/<org-uuid>/<feed-uuid> \
  --dns-listen 127.0.0.1:53 --egress-listen 127.0.0.1:3128 \
  --forward siem
```

## The token

Create an **Events API** ingest token on Guardian's Sources page (`/resolve/guardian/sources`). It is shown once. It belongs to your organisation and Guardian files every row under it; a row never names a tenant. See [Events ingest](/siem/sources/events/).

| Setting | Flag | Environment | Default |
|---|---|---|---|
| Ingest token | `--siem-token` | `VULNETIX_SIEM_TOKEN` | none; required |
| Events route | `--siem-url` | `VULNETIX_SIEM_URL` | `https://ingest.vulnetix.com/v1/ingest/events` |

Use the environment variable for the token: a flag shows in `ps`. In Kubernetes, add it to the sensor's secret.

The sensor refuses to start when:

| Error | Fix |
|---|---|
| `--forward siem needs a Guardian ingest token: …` | Set `VULNETIX_SIEM_TOKEN` or `--siem-token` |
| `--forward siem sends DNS and egress decisions: set --dns-listen, --egress-listen or both` | Forwarding covers only those two; add one |
| `--forward "<x>": the only destination is siem` | `siem` is the only value |

## What is sent

Each lookup is a `dns_events` row and each connection a `net_events` row, with `source` `sensor` and `host` set to the machine name.

| Table | Columns |
|---|---|
| `dns_events` | `ts`, `host`, `qname` (lower case, no trailing dot), `qtype`, `rcode`, `answers`, `src_ip`, `action`, `policy` |
| `net_events` | `ts`, `host`, `src_ip`, `src_port`, `dst_host`, `dst_ip`, `dst_port`, `proto` (`tcp`), `bytes` (both directions), `direction` (`egress`), `action`, `policy` |

`action` is `allow` or `block`. A hold refuses while it lasts, so it is `block`; `raw.decision` keeps the sensor's own word (`allowed`, `held`, `blocked`) with the reason. `policy` is `<rule table>:<rule uuid>` when a rule matched. A refused connection is sent at once; one the proxy carried is sent when it closes, so a long-lived tunnel appears when it ends.

Search them in Guardian, for example:

```text
net_events
| where source == 'sensor' and action == 'block'
| stats count() as blocked by dst_host, host
| sort -blocked
```

## Delivery

Forwarding never slows a decision.

| | |
|---|---|
| Queue | In memory, at most 20,000 rows. Past that the oldest are dropped and counted. |
| Send | One request every 10 seconds, or as soon as 1,000 rows are waiting |
| Failure | A request that fails or takes more than 10 seconds is dropped, not retried. The failure is logged at most once a minute with the running drop count. |
| Shutdown | What is left is sent once more on the way out |

The request body is `{"source": "sensor", "events": [{"table": "...", "row": {...}}]}`, the shape the events route takes (at most 5,000 events per request). Guardian answers `402` when the organisation has no active Guardian ingest pack, and `429` past one and a half times the day's ingest cap; both count as failures here.
