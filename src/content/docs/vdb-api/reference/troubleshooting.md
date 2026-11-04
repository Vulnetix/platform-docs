---
title: VDB API troubleshooting
nav: Troubleshooting
description: The VDB API and vulnetix vdb errors you are most likely to see, what causes each one and how to fix it, including answers that look wrong but are not errors.
order: 50
sources: [vdb-api/internal/middleware/auth.go, vdb-api/internal/middleware/ratelimit.go, vdb-api/main.go, vdb-api/internal/handler/v2_cli_handlers.go, cli/pkg/vdb/client.go, cli/pkg/vdb/api_v2.go, cli/cmd/vdb.go, cli/cmd/vdb_v2.go, cli/cmd/vdb_zz_inputs.go]
checked: [vdb-api@c81369489, cli@v4.17.1]
updated: 04 Nov 2026
---

The API answers errors as JSON with an `error` field. The CLI prints them as `Error: API error (<status>): <error>` on stderr and exits `1`; the full list of statuses is on [Errors and plan-gated answers](/vdb-api/api/errors/).

## Credentials

| Symptom or message | Cause | Fix |
|---|---|---|
| `401` `Invalid API key` from curl, while the CLI works | The header carries the org id twice: `ApiKey <org>:<org>:<hex>`. The console shows the key as `<orgId>:<hex>` already | Put only the hex part in `VULNETIX_API_KEY`, or paste the console value straight after `ApiKey `. See [Authentication](/vdb-api/api/authentication/#api-key) |
| `401` `Invalid API key` everywhere | The secret was regenerated on the Account page, so the old HMAC no longer matches | Copy the new key from the [Account page](https://www.vulnetix.com/resolve/account) |
| `401` `Malformed ApiKey header. Expected: Authorization: ApiKey <orgId>:<sha256-hex>` | No `:` in the value, or one half is empty | Check the variables are set: an unset `VULNETIX_ORG_ID` leaves `ApiKey :<hex>` |
| `401` `Token has expired. Please obtain a new token from /v1/auth/token.` | A JWT older than 15 minutes | Fetch a new one from `GET /v2/auth/token`. There is no refresh token. The CLI does this itself for SigV4 |
| `Auth: Unauthenticated Community (run 'vulnetix auth login' for higher rate limits)` with `-v` | No credential was found, so the CLI used the shared built-in Community key | Sign in, or set the variables. Which source wins is on [CLI flags, output and cache](/vdb-api/cli/flags-and-output/#credentials) and [Troubleshooting authentication](/cli/authentication/troubleshooting/) |

## Quota and retries

| Symptom or message | Cause | Fix |
|---|---|---|
| `429` `Daily rate limit exceeded` with `Limit: 50 requests per day. Resets in 7 hours.` | The key used its quota for the rolling 24 hours | Wait, or move to a plan with more requests. Pace against `RateLimit-Remaining`. See [Rate limits](/vdb-api/api/rate-limits/#at-the-limit) |
| Quota is still gone after the `RateLimit-Reset` time | The window is a rolling 24 hours; `RateLimit-Reset` always quotes the next 00:00 UTC | Count from when the requests were made, not from the header |
| A `vdb` command waits for minutes or hours, showing a rate-limit countdown on stderr | On a `429` the CLI waits for `Retry-After`, otherwise `RateLimit-Reset` | Run the CLI under a timeout in CI. `-v` also prints each retry |
| `request failed after 2 retries: HTTP 503` | `authentication backend temporarily unavailable` or maintenance mode, still failing after two retries | Try again later. The key is not invalid. Maintenance refuses writes only; see [Maintenance mode](/vdb-api/api/errors/#maintenance-mode) |

## Results look wrong

| Symptom | Cause | Fix |
|---|---|---|
| `⚠ Vulnerability "<id>" was not found in the database.` | The API answered `404` for that id | Check the spelling against [Identifiers and inputs](/vdb-api/api/inputs/#advisory-ids). URL-encode ids with `:` or `/` in curl paths |
| Fields are `null` and the answer has `_pro_data` or `_entitlements`, or the body is `{"planLocked": true, ...}` | Those fields, or the whole route, need a higher plan. It is a `200`, not an error | Read `_entitlements.gated` for the plan each one needs. See [Plan-gated answers](/vdb-api/api/errors/#plan-gated-answers) |
| An answer is stale | The CLI's disk cache answered | `--refresh-cache` for one call, or `vulnetix vdb cache clear`. See [Local cache](/vdb-api/cli/flags-and-output/#local-cache) |
| `vdb exploits poc` or `vdb exploits download` fails with `API error (404): {"error":"Package not found", ...}` | The CLI asks for a route the API does not serve | Use the `/archive` route with curl. See [vulnetix vdb commands](/vdb-api/cli/commands/) |
| `vdb triage` always prints an empty feed | The triage endpoint the CLI calls first returns no items yet | Query `GET /v2/triage` directly |
| Reachability reports nothing | The v2 reachability route is not served, and the CLI reads the not-found as "no queries" | Pass `--reachability off` to skip the call |

## Still stuck

Collect the CLI version from `vulnetix version`, the exact command, and its output with `-v` (or `-vv` for raw evidence), which shows the plan, the remaining quota and the credential source. Add `vulnetix auth status` and, for curl, the status line and the response headers (`curl -sS -D - -o /dev/null ...`) with the key removed. For credential problems, work through [Troubleshooting authentication](/cli/authentication/troubleshooting/) first.
