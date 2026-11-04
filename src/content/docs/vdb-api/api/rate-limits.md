---
title: Rate limits
description: How the VDB API counts requests against a daily quota per API key, each plan's default quota, the RateLimit response headers, and what happens at the limit.
order: 2
sources: [vdb-api/internal/middleware/ratelimit.go, vdb-api/internal/handler/deps.go, vdb-api/internal/handler/appconfig.go, vdb-site/api/internal/handler/tierconfig.go, cli/pkg/vdb/client.go, cli/cmd/vdb.go]
checked: [vdb-api@4145f0a, vdb-site@1a06d67, cli@4c8c3b71c]
updated: 03 Nov 2026
---

The VDB API limits how many requests each API key makes in a day. There is no per-second or per-minute limit.

## Default quota by plan

| Plan | `X-VDB-Plan` | Requests per day |
|---|---|---|
| Community | `community` | 50 |
| Pro | `pro` | 2,000 per API key; 1 API key included, more at $15 a month each |
| Business | `teams` | 100,000 per API key; 10 API keys included, the most a Business organisation can create |
| Enterprise | `enterprise` | Set per contract, often unlimited |

These are the defaults that `GET https://www.vulnetix.com/api/site/v1/config` publishes in `tiers[].max_requests_per_day`. Vulnetix can set a different limit for one organisation, so the number that applies to you is the one in your own `RateLimit-DayLimit` header. Prices are on [vulnetix.com/pricing](https://www.vulnetix.com/pricing).

## How requests are counted

- The quota belongs to the organisation that owns the key. Members of a Business organisation each have their own key, and each key's requests are counted on their own.
- The window is the previous 24 hours, rolling. It is not reset at midnight.
- A request counts once it has authenticated. Requests rejected for a missing or invalid credential are not counted, and neither is a `429`.
- Every other answer counts: `200`, `404` for an unknown CVE, `400` for a bad parameter, and plan-locked answers.
- The CLI's local disk cache answers repeat lookups without calling the API, so cached answers cost nothing.

## Headers

Every authenticated response carries these:

| Header | Value |
|---|---|
| `X-VDB-Plan` | `community`, `pro`, `teams` or `enterprise` |
| `RateLimit-DayLimit` | The daily limit, or `unlimited` |
| `RateLimit-Remaining` | Requests left in the 24-hour window, or `unlimited` |
| `RateLimit-Reset` | The next 00:00 UTC, as Unix epoch seconds |
| `X-Softlimits` | `true` when the limit is advisory for your plan. Absent otherwise |

```
X-VDB-Plan: community
RateLimit-DayLimit: 50
RateLimit-Remaining: 37
RateLimit-Reset: 1793664000
```

> [!CAREFUL] `RateLimit-Reset` is not when your quota comes back
> The count is a rolling 24 hours, but `RateLimit-Reset` always gives the next 00:00 UTC. A burst of requests made at 18:00 UTC still counts against you until 18:00 the next day, well after the time the header quotes. Pace scripts against `RateLimit-Remaining`, not the reset time.

## At the limit

On a hard limit the API refuses the request:

```
HTTP/2 429
```

```json
{
  "success": false,
  "error": "Daily rate limit exceeded",
  "details": "Limit: 50 requests per day. Resets in 7 hours."
}
```

When `X-Softlimits: true` is present, requests over the limit are counted but still answered.

## The CLI and the quota

| Behaviour | Detail |
|---|---|
| Retries | `429`, `502`, `503` and `504` are retried at most twice. The wait is `Retry-After` if present, otherwise `RateLimit-Reset`, so a `429` can wait hours. `-v` shows a countdown |
| Built-in Community key | With no credential configured, the CLI uses an embedded Community key whose quota is shared by everyone using it |
| Community fallback | When your own key gets a `429`, the CLI retries once with the embedded Community key. `--no-community` turns this off |
| Disk cache | On by default. `--no-cache` bypasses it; `--refresh-cache` fetches fresh and rewrites it. See [CLI flags, output and cache](/vdb-api/cli/flags-and-output/#local-cache) |
| Visibility | `-v` prints the plan, remaining quota and time to reset on stderr |

In CI, run the CLI under a timeout so a `429` cannot hold a job for hours, and use a key of your own rather than the shared Community key.
