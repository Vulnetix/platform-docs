---
title: API
description: Every route of the Guardian console API and the ingest host, authentication, roles, error shape and status codes.
order: 1
sources: [siem/worker/src/api/routes.ts, siem/worker/src/api/context.ts, siem/worker/src/api/http.ts, siem/worker/src/auth.ts, siem/worker/src/index.ts, siem/docs/api.md]
checked: [siem@e0f71fa]
updated: 02 Nov 2026
---

Guardian has two hosts:

| Host | Serves |
|---|---|
| `https://guardian.vulnetix.com` | The console API under `/v1/guardian/...`, the AWS templates under `/v1/templates/...`, `/v1/health` |
| `https://ingest.vulnetix.com` | Log ingest under `/v1/ingest/...`, authenticated by [ingest token](/siem/sources/ingest-tokens/) |

## Authentication

Console API requests carry `Authorization: Bearer <access token>`, the OIDC access token of a signed-in console session (an RS256 JWT issued by Vulnetix sign-in). Guardian verifies it, looks up the user, and resolves your organisation from the user. No route takes an organisation from the request. Vulnetix API keys are not accepted here.

The template downloads and `/v1/health` need no token.

## Access

| Condition | Answer |
|---|---|
| Not signed in, or the token is invalid or expired | `401` |
| Plan below Business, or no active ingest pack | `402` with `needs: "business"` or `needs: "pack"` (every route but `me`, `help` and billing) |
| Not an owner or admin, on token, Cloudflare and billing checkout routes | `403` |

Errors are JSON: `{ "error": "<message>", "code": "<code>" }`, plus `needs` on a `402`. Codes include `sign_in` (401), `plan` (402), `compile`, `source`, `limit`, `exists` and `in_use` (400), `budget` (429) and `internal` (500).

## Console API

All paths are under `https://guardian.vulnetix.com/v1/guardian`.

| Method and path | Does | Page |
|---|---|---|
| `GET /me` | Organisation, plan, role, whether Guardian is active and what it `needs`, the pack and subscription, packs on sale, today's ingest state, limits | |
| `POST /billing/checkout` | `{ pack, returnUrl? }`: a Stripe checkout for `guardian_5`, `guardian_25` or `guardian_100`. `409` if a subscription is already active. | [Packs](/siem/reference/packs-and-limits/) |
| `POST /billing/portal` | `{ returnUrl? }`: the Stripe portal to change or cancel the pack | [Packs](/siem/reference/packs-and-limits/) |
| `GET /help` | Templates, syntax and table columns | [Syntax](/siem/search/syntax/) |
| `POST /search` | Run a search | [Syntax](/siem/search/syntax/#api) |
| `POST /compile` | The SQL a search would run | [Syntax](/siem/search/syntax/#api) |
| `POST /translate` | Search language to Sigma or back | [Syntax](/siem/search/syntax/#switching-to-sigma) |
| `GET, POST /searches`; `PATCH, DELETE /searches/{id}` | Saved searches | [Saved searches](/siem/search/saved-searches/) |
| `GET, POST /rules`; `GET, PATCH, DELETE /rules/{id}` | Alert rules | [Rules](/siem/detection/rules/) |
| `POST /rules/upload` | Up to 200 Sigma files | [Rules](/siem/detection/rules/#upload) |
| `POST /rules/{id}/suppressions`; `DELETE /rules/{id}/suppressions/{n}` | Suppressions | [Rules](/siem/detection/rules/#tuning) |
| `POST /rules/{id}/test`, `POST /rules/{id}/backfill`, `GET /rules/{id}/runs` | Test, backfill, run history | [Rules](/siem/detection/rules/#test-and-backfill) |
| `GET /catalogue?q=` | SigmaHQ rules that compile and the indicator rules | [Rules](/siem/detection/rules/#rule-sources) |
| `GET /alerts`; `PATCH /alerts/{id}` | Alerts | [Alerts](/siem/alerts/alerts/#api) |
| `GET, POST /triggers`; `PATCH, DELETE /triggers/{id}` | Triggers | [Triggers](/siem/alerts/triggers/) |
| `POST /triggers/dry-run`, `POST /triggers/{id}/dry-run` | Fires the levers would have made in the last 24 hours | [Triggers](/siem/alerts/triggers/#dry-run) |
| `GET /triggers/{id}/fires`, `GET /fires/{id}` | Fire records | [Triggers](/siem/alerts/triggers/#fires) |
| `GET, POST /sends`; `PATCH, DELETE /sends/{id}` | Scheduled sends | [Scheduled reports](/siem/alerts/scheduled-reports/) |
| `POST /sends/{id}/preview`, `POST /sends/{id}/send-now` | Preview, send now | [Scheduled reports](/siem/alerts/scheduled-reports/#api) |
| `GET /sources` | Ingest tokens, Cloudflare jobs, datasets offered | [Ingest tokens](/siem/sources/ingest-tokens/) |
| `POST /sources/tokens`; `DELETE /sources/tokens/{id}` | Create (shown once) or revoke a token | [Ingest tokens](/siem/sources/ingest-tokens/) |
| `GET /sources/aws` | Template links, quick-create links, CLI commands, your external id | [AWS](/siem/sources/aws/) |
| `POST /sources/cloudflare/check` | `{ apiToken, accountId? }`: permission check | [Cloudflare](/siem/sources/cloudflare/#token-permissions) |
| `POST /sources/cloudflare` | `{ apiToken, accountId, zoneIds, datasets }`: create Logpush jobs | [Cloudflare](/siem/sources/cloudflare/) |
| `POST /sources/cloudflare/remove` | `{ apiToken, ids }`: delete jobs | [Cloudflare](/siem/sources/cloudflare/#remove-jobs) |
| `GET /connections` | Your messaging connections, for destination pickers | |
| `GET /surface?rangeMs=&from=&to=&refresh=1` | The attack surface: an aggregate of the tenant's `http_events` and `waf_events` by route, ASN and country. The window is `rangeMs` (1 hour to 30 days, default one day) or `from` and `to` (at most 30 days). The answer is cached and says `cached: true`; `refresh=1` recomputes it. | |
| `PUT /surface/templates` | `{ version, templates: [{ method, path, key }] }`: replaces the tenant's route and operation template set, at most 20,000. Ingest matches request paths against it to fill `path_template`. Vulnetix pushes it. | [Tables](/siem/search/tables/) |
| `GET /usage` | Fourteen days of bytes scanned, queries and rows ingested, and the daily budget | [Packs](/siem/reference/packs-and-limits/) |

An unknown path answers `404`; a known path with the wrong method `405`.

## Unauthenticated routes

| Method and path | Returns |
|---|---|
| `GET https://guardian.vulnetix.com/v1/templates/vulnetix-siem.yaml` | The delivery CloudFormation template |
| `GET https://guardian.vulnetix.com/v1/templates/vulnetix-guardian-readonly.yaml` | The investigation role template |
| `GET https://guardian.vulnetix.com/v1/health` | `{ "ok": true }` |

## Ingest

| Method and path | Token kind | Page |
|---|---|---|
| `POST https://ingest.vulnetix.com/v1/ingest/aws/{flow,dns,cloudtrail}` | `aws`, as `X-Amz-Firehose-Access-Key` | [AWS](/siem/sources/aws/#responses-firehose-sees) |
| `POST https://ingest.vulnetix.com/v1/ingest/cloudflare/<dataset>` | `cloudflare`, as `Authorization: Bearer` | [Cloudflare](/siem/sources/cloudflare/#responses-logpush-sees) |
| `POST https://ingest.vulnetix.com/v1/ingest/events` | `events`, as `Authorization: Bearer` | [Events API](/siem/sources/events/) |
