---
title: Triggers
description: Run a saved search or alert rule on a schedule and, when rows pass the levers, start a Software Factory workflow, post to a messaging connection or email.
order: 2
sources: [siem/worker/src/triggers/model.ts, siem/worker/src/triggers/run.ts, siem/worker/src/api/triggers.ts, siem/worker/src/schedule.ts, siem/docs/triggers.md, vdb-site/api/internal/handler/factory_templates_guardian.go]
checked: [siem@e0f71fa, vdb-site@1a06d67]
updated: 02 Nov 2026
---

A trigger runs a saved search or an alert rule every `everySec` seconds. When the result has rows that pass its levers, it starts something with those rows as context. A run with no rows starts nothing.

Rules alert on every match; a trigger acts on a pattern, with a cooldown and an hourly cap, so it suits starting an investigation.

## Fields

| Field | Rule |
|---|---|
| `name` | Required, at most 160 characters |
| `sourceKind` | `search` or `rule` |
| `sourceRef` | The saved search or rule id. It must compile. |
| `everySec` | 60 to 86400. Default 300. |
| `levers` | See below |
| `destination` | See below |
| `enabled` | Default `true` |

Your pack caps enabled triggers at 25, 100, 250 or 1000.

## Levers

| Lever | Default | Range | Meaning |
|---|---|---|---|
| `minRows` | 1 | 1 to 100000 | Fire a group once it has at least this many rows in the window |
| `windowSec` | 300 | 60 to 604800 | How far back each run reads, on event time, ending 120 s behind now |
| `countBy` | none | a column name | Count rows per value of this column; each value is its own group. Counted over the first 1,000 rows the query returns. |
| `cooldownSec` | 3600 | 0 to 604800 | Do not fire the same group again for this long |
| `maxPerHour` | 4 | 1 to 60 | At most this many fires per hour for the trigger |
| `hours` | `always` | `always`, `business`, `outside_business` | `business` is 09:00 to 17:00, Monday to Friday |
| `zone` | `UTC` | IANA name | Time zone for `hours` |
| `rowsCap` | 25 | 1 to 100 | Rows kept as context per fire |
| `columns` | all | up to 30 names | Columns kept as context |
| `ask` | `workflow` | `workflow`, `always` | For workflow runs: follow the workflow's asks, or always ask before a change |

States: `armed`, `cooling` (a group is in cooldown), `off`, `erroring`.

## Destinations

`destination` is `{ kind, connections, emails, severity }`.

| `kind` | Sends | Needs |
|---|---|---|
| `workflow` (default) | A `siem.fired` source event to the Software Factory | Nothing; the workflow's trigger chooses which fires it takes |
| `messaging` | A `siem.trigger.fired` event straight to the chosen connections, at `severity` (`info`, `notice`, `warning` default, `critical`) | 1 to 10 of your connections |
| `email` | One email per fire | 1 to 20 addresses |

### Software Factory workflows

A `workflow` fire becomes a Software Factory sighting with source `siem` and type `siem.fired`, deduplicated on trigger, group and window end. Every published workflow whose `firewall`-kind trigger names source `siem` and matches its filters starts a run:

| Filter | Values |
|---|---|
| `categories` | `network`, `dns`, `waf`, `http`, `cloud_audit`, `vulnetix` (from the table) |
| `providers` | `aws`, `cloudflare`, `vulnetix`, `mixed` (from the rows' `source`) |
| `triggers` | Guardian trigger ids |
| `tables` | Table names |

The event carries the fire id, the trigger, category, provider, group, row count and as many context rows as fit in 4 KiB. The full capped set is on the fire record (`GET /v1/guardian/fires/{id}`). The agent receives the rows marked as data gathered by Vulnetix, not instructions. See [Triggers](/software-factory/workflows/triggers/) and [Source events](/software-factory/workflows/source-events/) in the Software Factory docs.

**Guardian > Workflows** lists the built-in templates. Each has the same shape: an investigator agent writes `investigation.md` with a verdict (`benign`, `needs_change`, `incident`); on a needed change a person approves, a remediator changes the infrastructure code and opens a draft pull request (or writes the commands to `remediation.md` when the resource is not in code); every run notifies and files a card. Agents never apply a change to a cloud account.

| Template id | Name |
|---|---|
| `guardian-aws-net-egress` | AWS egress to a new or flagged destination |
| `guardian-aws-net-lateral` | AWS lateral movement inside a VPC |
| `guardian-aws-net-exposure` | AWS admin or database port open to the internet |
| `guardian-aws-dns-ioc` | AWS DNS query for an indicator |
| `guardian-aws-dns-dga` | AWS NXDOMAIN burst or generated names |
| `guardian-aws-audit-tamper` | AWS logging or detection turned off |
| `guardian-aws-audit-exposure` | AWS resource made public |
| `guardian-aws-audit-identity` | AWS risky identity activity |
| `guardian-aws-waf-spike` | AWS WAF block spike |
| `guardian-cf-waf-spike` | Cloudflare WAF block spike |
| `guardian-cf-waf-cve` | Cloudflare managed rule names a CVE |
| `guardian-cf-http-stuffing` | Cloudflare credential stuffing on a login path |
| `guardian-cf-dns-ioc` | Cloudflare DNS query for an indicator |
| `guardian-cf-net-newdest` | Cloudflare new external destination |
| `guardian-cf-audit-change` | Cloudflare risky account change |
| `guardian-ioc-anywhere` | Indicator seen anywhere |
| `guardian-sandbox-egress` | Pix Sandbox egress |

AWS investigators read your account through the [read-only role](/siem/sources/aws/#the-investigation-role); Cloudflare investigators use a Cloudflare token saved in the Secrets Vault.

## Dry run

**Dry run** (`POST /v1/guardian/triggers/dry-run` with a draft, or `POST /v1/guardian/triggers/{id}/dry-run`) answers how often the levers would have fired in the last 24 hours, by hour. Use it to set `minRows`, `cooldownSec` and `maxPerHour` before you turn a trigger on.

## Fires

`GET /v1/guardian/triggers/{id}/fires` lists a trigger's fires: time, group, rows, outcome. `GET /v1/guardian/fires/{id}` returns one fire with its context rows.

## Example

Start an investigation when one host resolves 50 or more names that fail, at most once a day per host:

```json
{
  "name": "NXDOMAIN burst per host",
  "sourceKind": "search",
  "sourceRef": "<saved search id>",
  "everySec": 300,
  "levers": { "minRows": 50, "windowSec": 600, "countBy": "src_ip", "cooldownSec": 86400, "maxPerHour": 4, "rowsCap": 25 },
  "destination": { "kind": "workflow" }
}
```

where the saved search is `dns_events | where rcode == 'NXDOMAIN'`.
