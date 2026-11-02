---
title: Errors and plan-gated answers
nav: Errors
description: The error body shapes and HTTP status codes the VDB API returns, which ones to retry, and how answers above your plan come back as 200 with nulled fields or a planLocked marker.
order: 5
sources: [vdb-api/internal/middleware/auth.go, vdb-api/internal/middleware/ratelimit.go, vdb-api/internal/middleware/maintenance.go, vdb-api/internal/middleware/clientabort.go, vdb-api/internal/middleware/profilter.go, vdb-api/internal/handler/entitlements.go, vdb-api/internal/handler/catchall.go, vdb-api/internal/inputs/inputs.go, cli/pkg/vdb/client.go]
checked: [vdb-api@4145f0a, cli@4c8c3b71c]
updated: 02 Nov 2026
---

## Error bodies

Most errors have this shape:

```json
{ "success": false, "error": "Invalid API key" }
```

Some add `details` with the underlying cause. Input errors name the parameter at fault:

```json
{ "error": "cel expression is longer than 4096 bytes", "field": "cel" }
```

A path that matches no route returns `404` with a different body, listing a few starting points:

```json
{
  "success": false,
  "message": "VDB API - Invalid endpoint",
  "documentation": "/v1/spec/ui",
  "openapi": "/v1/spec",
  "availableEndpoints": ["GET /v1/spec - OpenAPI specification", "..."]
}
```

## Status codes

| Status | Meaning | Retry? |
|---|---|---|
| 200 | Success. May still be [plan-gated](#plan-gated-answers) | |
| 400 | A parameter is missing or malformed, for example `Invalid month. Use YYYY-MM` | No |
| 401 | No credential, or it is invalid or expired. See [Authentication](/vdb-api/api/authentication/#failures) | No; fix the credential or fetch a new JWT |
| 403 | The organisation is inactive | No |
| 404 | The advisory, package or record is not in the database, or the path matches no route. Also `Organization not found` when the key's organisation has been removed | No |
| 409 | An API token whose account belongs to several organisations | No; contact support |
| 413 | An input field over 512 characters, a CEL expression over 4 KiB, or more than 100 advisory ids | No |
| 422 | An input that cannot be resolved: a SWID tag id without the tag, an unsupported TEI type | No |
| 429 | Daily quota used. See [Rate limits](/vdb-api/api/rate-limits/#at-the-limit) | After the window moves |
| 499 | The client closed the connection before the answer; recorded server-side, never seen by the client | |
| 500 | Server error | Yes, with backoff |
| 502, 504 | Gateway error or timeout | Yes, with backoff |
| 503 | `authentication backend temporarily unavailable` (with `Retry-After: 2`), or maintenance mode | Yes, after `Retry-After` |

The CLI retries `429`, `502`, `503`, `504` and connection timeouts or resets, at most twice, waiting `Retry-After` when the API sends it.

## Maintenance mode

During maintenance, write requests (anything other than `GET`, `HEAD` and `OPTIONS`) are refused and reads keep working:

```
HTTP/2 503
Retry-After: 120
X-Maintenance-Mode: true
X-Vulnetix-Maintenance: true
```

```json
{ "success": false, "error": "maintenance_mode", "message": "...", "retry_after_seconds": 120 }
```

Most of the public VDB API is reads, so this mainly affects the `POST` routes (`/scan/*`, `/packages/refresh`, bulk and search bodies) and the CLI's upload routes.

## Plan-gated answers

The VDB API does not answer `402` or `403` for a feature above your plan. It answers `200` and tells you what was withheld, in one of two ways.

**Fields withheld.** On about 26 routes (exploit detail, fixes, KEV, IOCs, sightings, detection rules, virtual patches, remediation plans and others), fields above your plan are set to `null` and two markers are added:

```json
{
  "...": "the normal answer, with gated fields set to null",
  "_pro_data": ["$.exploits"],
  "_entitlements": {
    "plan": "community",
    "gated": [
      { "feature": "full-enrichment", "requiredPlan": "pro", "paths": ["$.exploits"] }
    ]
  }
}
```

That is what a Community key gets from `GET /v2/exploits/{identifier}`: the counts and summary, with the exploit records themselves nulled. `full-enrichment` is the feature name for any rule that does not name its own.

`_pro_data` lists only the paths that need Pro; `_entitlements.gated` lists every gated feature, including those that need Teams or Enterprise. Both are absent when nothing was withheld.

**Whole answer withheld.** Routes that are a paid feature end to end (Safe Harbour safety matrix and refresh, exploit and raw advisory archive downloads, some defence and YARA content) return a marker body instead:

```json
{
  "planLocked": true,
  "feature": "safe-harbour",
  "requiredPlan": "pro",
  "upgrade": true,
  "_entitlements": { "plan": "community", "gated": [{ "feature": "safe-harbour", "requiredPlan": "pro" }] }
}
```

Check for `planLocked` before you read the rest of the body. The packages in `GET /v2/packages/free-demo` get Safe Harbour data on every plan.

Plan-dependent answers are always sent `Cache-Control: private, no-store`, because the same URL answers different plans differently.
