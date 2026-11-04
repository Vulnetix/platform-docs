---
title: Packs and limits
description: Guardian ingest packs, prices, the daily ingest cap and query budget, what happens past them, retention, and every other limit in one table.
order: 2
sources: [siem/worker/src/billing/packs.ts, siem/worker/src/billing/entitlement.ts, siem/worker/src/billing/webhook.ts, siem/worker/src/ingest/gate.ts, siem/worker/src/rules/run.ts, siem/worker/src/api/searches.ts, siem/worker/src/api/search.ts, siem/docs/billing.md, siem/docs/decisions.md]
checked: [siem@e0f71fa]
updated: 02 Nov 2026
---

Guardian is an add-on to the Business or Enterprise plan, sold as a flat monthly ingest pack. Guardian is active while the pack's subscription is active, or past due while Stripe retries the payment.

## Packs

| Pack | Ingest per day | Price per month (USD) | Query budget per day | Enabled rules | Enabled triggers | Enabled sends |
|---|---|---|---|---|---|---|
| `guardian_5` | 5 GB | $599 | 50 GiB | 50 | 25 | 25 |
| `guardian_25` | 25 GB | $2,490 | 250 GiB | 200 | 100 | 100 |
| `guardian_100` | 100 GB | $8,900 | 1 TiB | 500 | 250 | 250 |
| `enterprise` | 500 GB, or as quoted | quoted | 5 TiB | 2000 | 1000 | 1000 |

Prices are the Resolve Platform's fallback; the Stripe price shown at checkout is what you pay. Ingest is measured in decimal GB of normalised rows; the query budget in binary GiB scanned.

## Buy, change, cancel

- **Buy.** An owner or admin presses **Start Guardian** (on a Guardian page that answered `402`, or the Integrations page's log sources). Checkout uses your organisation's existing Stripe customer.
- **Change or cancel.** **Change pack** opens the Stripe portal, which offers only the three packs. A switch takes effect when Stripe reports it.
- **Enterprise.** Quoted and set up by Vulnetix, not sold through checkout. A later checkout replaces it.

## The daily ingest cap

Ingest tokens are checked against the pack on every batch (the entitlement is cached for one minute). Days are UTC.

| Today's ingest | What happens |
|---|---|
| Below 80% | `ok` |
| 80% | `warning`. One `siem.usage.warning` message. |
| 100% | `exceeded`. One `siem.usage.exceeded` message. Ingest continues. |
| 150% | `refusing`. Ingest answers `429` `ingest_cap` until 00:00 UTC. Firehose and Logpush keep the batch and retry; Firehose parks it in your error bucket after 300 s. |
| No pack | Ingest answers `402` `plan`, and the token's last error says Guardian is not active. |

Vulnetix product sources (Package Firewall, AI Firewall, Pix Sandbox, the Vulnetix API) do not count against the cap.

## The query budget

Searches, rule runs, triggers and sends are charged by bytes scanned. When the warehouse does not report bytes scanned, the run is charged an estimate from its duration and **Usage** says so.

- Search answers `429` `budget` when the day's budget is used.
- Rules are skipped until 00:00 UTC and `siem.rule.budget_exhausted` is sent once.
- A rule whose runs scan more than 512 MiB on average runs proportionally less often, up to hourly.

`GET /v1/guardian/usage` returns 14 days of bytes scanned, queries and rows ingested.

## Retention

31 days on every pack. Rows older than that are deleted nightly. A search covers at most 30 days.

## Other limits

| Limit | Value |
|---|---|
| Saved searches per organisation | 500 |
| Search text | 16 KiB |
| Search range | 1 minute to 30 days |
| Rows a search returns | 10,000 (default 500) |
| Rule text | 256 KiB |
| Sigma files per upload | 200 |
| Suppressions per rule | 50 |
| Rule backfill | 7 days |
| Rule test window | 1 to 1440 minutes |
| Alerts per rule run | 1 to 1000 (default 50) |
| Trigger context rows | 1 to 100 (default 25) |
| Rows in a scheduled message / CSV | 100 / 1,000 |
| Events per ingest request | 5,000 |
| Ingest request body | 100 MB |
| Connections per destination / emails | 10 / 20 |
