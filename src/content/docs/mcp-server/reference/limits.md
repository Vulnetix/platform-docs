---
title: Limits and timeouts
description: Fixed server limits on upstream calls, timeouts, retries, response sizes and cache lifetimes, with the values set in the code.
order: 5
nav: Limits
sources:
  - mcp-server/src/config.ts
  - mcp-server/src/upstream/client.ts
  - mcp-server/src/tools/vuln.ts
  - mcp-server/src/tools/raw.ts
  - mcp-server/src/auth/device.ts
  - mcp-server/terraform/variables.tf
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

| Limit | Value | Constant |
|---|---|---|
| Upstream calls per tool call | 12 | `MAX_UPSTREAM_CALLS` |
| Timeout per upstream attempt | 45 s | `UPSTREAM_TIMEOUT_MS` |
| Attempts per upstream GET | 3 (2 retries) | `UPSTREAM_MAX_ATTEMPTS` |
| Retry backoff | 200 ms, then 500 ms | `UPSTREAM_RETRY_BACKOFF_MS` |
| Buffered response guard | 3 MiB | `MAX_BUFFER_BYTES` |
| Streamed response guard | 64 MiB | `MAX_STREAM_BYTES` |
| `vulnetix_vuln` `raw` refusal | above 524,288 bytes | `RAW_REFUSAL_BYTES` |
| `vdb_request` default cap | 262,144 bytes | `DEFAULT_MAX_BYTES` |
| `vdb_request` `maxBytes` range | 1024 to 1,048,576 | input schema |
| Device-login code lifetime | 300 s | `DEVICE_TTL_SECONDS` |
| Device-login poll interval | 5 s | `DEVICE_POLL_INTERVAL_SECONDS` |
| Device-login vdb-site call timeout | 10 s | `AbortSignal.timeout(10_000)` |
| Edge flood guard | 100 requests per 10 s per colo and source IP, 10 s block | `terraform/variables.tf` defaults |

Retries apply only to GETs, and only on a network error or a 5xx other than 501. A 4xx, including 429, is never retried. Retries do not count against the 12-call budget.

## Edge cache lifetimes

Successful, non-empty upstream responses are stored in the Cloudflare edge cache, keyed per principal. A degraded or empty 200 is not stored.

| TTL | Tools |
|---|---|
| 300 s | `vdb_request` |
| 600 s | `vulnetix_soc_triage`, `vulnetix_search` |
| 900 s | `vulnetix_vuln`, `vulnetix_exploits`, `vulnetix_remediation`, `vulnetix_iocs`, `vulnetix_sightings`, `vulnetix_threat_actors`, the four package tools, `vulnetix_triage_reason`, `vulnetix_fix_plan` |
| 1800 s | `vulnetix_kev`, `vulnetix_kev_status`, `vulnetix_vex`, `vulnetix_threat_feed` |
| 3600 s | `vulnetix_attack_techniques`, `vulnetix_scorecard`, `vulnetix_workarounds`, `vulnetix_advisories`, `vulnetix_timeline`, `vulnetix_detection_rules`, `vulnetix_exploit_test` |
| 86400 s | `vulnetix_eol_products`, `vulnetix_secure_code_write` |

## List cache hints

`tools/list`, `prompts/list`, `resources/templates/list` and `server/discover` carry `ttlMs: 300000`, `cacheScope: "public"`. Resource reads of VDB records carry `ttlMs: 300000`, `cacheScope: "private"`. App views carry `ttlMs: 3600000`, `cacheScope: "public"`. Skills carry `ttlMs: 300000`, `cacheScope: "public"`.

## Plan limits

Daily query quota is set by vdb-api per organisation, not by this server. Read it from `_meta["vulnetix/rateLimit"]`. See [Plans and limits](/mcp-server/get-started/plans-and-limits/).
