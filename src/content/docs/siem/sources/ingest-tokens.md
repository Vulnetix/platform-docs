---
title: Ingest tokens and source health
description: The three kinds of Guardian ingest token, creating and revoking them, what the Sources page shows, and the silent-source and usage messages.
order: 4
nav: Ingest tokens
sources: [siem/worker/src/api/sources.ts, siem/worker/src/ingest/tokens.ts, siem/worker/src/ingest/gate.ts, siem/worker/src/sources-health.ts, siem/worker/src/billing/packs.ts]
checked: [siem@e0f71fa]
updated: 02 Nov 2026
---

Every batch Guardian receives carries an ingest token. The token decides which organisation the rows belong to. Nothing in a payload can change that.

## Kinds

| Kind | Sent as | Accepted by |
|---|---|---|
| `aws` | Firehose access key (`X-Amz-Firehose-Access-Key`) | `/v1/ingest/aws/{flow,dns,cloudtrail}` |
| `cloudflare` | `Authorization: Bearer` header set by Logpush `header_Authorization` | `/v1/ingest/cloudflare/<dataset>` |
| `events` | `Authorization: Bearer` | `/v1/ingest/events` |

A token used on another kind's route is refused with `401`. Tokens look like `gdn_` followed by 20 to 64 characters from `A-Z a-z 0-9 _ -`.

## Create and revoke

On **Guardian > Sources**, an owner or admin creates a token, picks its kind and optionally gives it a label (at most 120 characters; default `<kind> <date>`). The full token is shown once. Guardian stores only a hash and the first 10 characters, which the page shows as the prefix.

Cloudflare onboarding creates its own `cloudflare` token. Removing the last job on it revokes it (see [Cloudflare](/siem/sources/cloudflare/#remove-jobs)).

Revoking a token takes effect within a minute (token lookups are cached for one minute): after that every sender using it gets `401`. Firehose then parks batches in your error bucket; Logpush marks its jobs failing.

API: `POST /v1/guardian/sources/tokens` with `{ "kind": "aws" | "cloudflare" | "events", "label": "..." }` answers `{ id, token, prefix }`. `DELETE /v1/guardian/sources/tokens/{id}` revokes. See [API](/siem/reference/api/).

## What the Sources page shows

| Item | Meaning |
|---|---|
| Last batch | When the token last delivered |
| Today's volume | Rows and bytes received today (UTC) |
| Last error | Why the latest batch was refused or partly unread, for example "Guardian is not active for this organisation", "N flow records were not in a format Guardian reads", or "decode or send failed" |
| Cloudflare jobs | The last batch per job, matched by the destination `label` |
| Ingest today | Bytes against the pack's daily cap: `ok`, `warning` (80%), `exceeded` (100%), `refusing` (150%) |

## Messages

Guardian sends these through your organisation's messaging routes:

| Event | When |
|---|---|
| `siem.source.silent` | A token that delivered before has sent nothing for six hours. Once, until it recovers. Checked hourly. |
| `siem.source.recovered` | A silent token delivers again. |
| `siem.usage.warning` | Today's ingest reached 80% of the pack's cap. Once per UTC day. |
| `siem.usage.exceeded` | Today's ingest reached 100% of the cap. Once per UTC day. |

Past 1.5 times the cap, ingest answers `429` with code `ingest_cap` until 00:00 UTC. The sender keeps the batch, so nothing is dropped without you knowing. See [Packs and limits](/siem/reference/packs-and-limits/).
