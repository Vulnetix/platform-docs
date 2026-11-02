---
title: VDB API overview
nav: Overview
description: The Vulnetix Vulnerability Database API serves vulnerability, exploit, fix, KEV, detection-rule and package intelligence over HTTPS at api.vdb.vulnetix.com, and the vulnetix vdb CLI commands wrap it.
order: 1
sources: [vdb-api/main.go, vdb-api/internal/handler/openapi-v2.json, vdb-api/internal/middleware/auth.go, vdb-api/internal/middleware/ratelimit.go, cli/cmd/vdb.go]
checked: [vdb-api@4145f0a, cli@4c8c3b71c]
updated: 02 Nov 2026
---

The VDB API is a read API over the Vulnetix Vulnerability Database. You send an advisory id, a package, a purl, a CPE or another [input](/vdb-api/api/inputs/), and it answers with the vulnerability record, affected versions, fixes, exploits, KEV status, scores, detection rules and remediation guidance it holds for it.

| | |
|---|---|
| Base URL | `https://api.vdb.vulnetix.com/v2` |
| Legacy base URL | `https://api.vdb.vulnetix.com/v1` (deprecated) |
| OpenAPI document | `GET /v2/spec` (JSON), `GET /v2/spec/ui` (Swagger UI) |
| Health | `GET /health` returns `{"status":"healthy"}`, no credential |
| Authentication | `Authorization: ApiKey <orgId>:<hex>`, or a Bearer token. See [Authentication](/vdb-api/api/authentication/) |
| Limits | A daily request quota per API key. See [Rate limits](/vdb-api/api/rate-limits/) |
| Format | JSON. A few routes stream files (exploit archives, raw advisories, CSV, STIX) |
| CLI | [`vulnetix vdb`](/vdb-api/cli/commands/), about 95 commands over the same routes |

## v1 and v2

v2 is the current API and the CLI's default. v1 is kept for backwards compatibility and will be removed. v2 has every v1 route except four: `GET /v1/openapi`, `GET /v1/vuln/{identifier}/fixes` (split on v2 into `fixes/registry`, `fixes/distributions` and `fixes/source`), `GET /v1/vuln/{identifier}/tree-sitter` and `POST /v1/packages/safe-harbour-batch`. v2 adds timelines, scorecards, the unified KEV catalogue, the detection-rule searches, [input kinds](/vdb-api/api/inputs/) and remediation plans.

## What a call looks like

```bash
export VULNETIX_ORG_ID="your-org-uuid"
export VULNETIX_API_KEY="your-api-key-hex"

curl -s -H "Authorization: ApiKey ${VULNETIX_ORG_ID}:${VULNETIX_API_KEY}" \
  "https://api.vdb.vulnetix.com/v2/vuln/CVE-2021-44228/fixes/registry?ecosystem=maven&limit=5"
```

The same lookup with the CLI:

```bash
vulnetix vdb fixes CVE-2021-44228 --ecosystem maven -o json
```

## Routes without a credential

Everything under `/v2` needs a credential except these:

| Route | Returns |
|---|---|
| `GET /v2/spec`, `GET /v2/spec/ui` | The OpenAPI 3 document and its Swagger UI |
| `GET /v2/auth/token` | A 15-minute JWT, in exchange for a SigV4-signed request |
| `GET /v2/auth/api-key` | Your static API key, in exchange for a SigV4-signed request |
| `GET /v2/packages/free-demo` | The packages whose Safe Harbour data is free on every plan |
| `POST /v2/crit/lookup`, `GET /v2/crit/lookup/{provider}/{service}/{resource_type}` | CRIT cloud resource lookups |
| `GET /health`, `GET /ready` | Liveness and readiness |

## Plans

Every authenticated response carries `X-VDB-Plan`: `community`, `pro`, `teams` or `enterprise`. The plan sets the daily quota and decides which fields you see. Fields above your plan come back as `null`, and the response lists them, so a Community key never gets an error for asking. See [Errors and plan-gated answers](/vdb-api/api/errors/#plan-gated-answers).

## Data sources and licensing

The database aggregates public, vendor, government and Vulnetix-derived sources. Which sources feed it, and the terms under which you may use and redistribute what the API returns, are published on the VDB site:

- [VDB data sources](https://vdb.vulnetix.com/sources/)
- [VDB licensing](https://vdb.vulnetix.com/licensing/)

## Where to go next

- [Quickstart](/vdb-api/get-started/quickstart/): get a key and make your first queries.
- [Endpoint reference](/vdb-api/reference/endpoints/): every v2 route, grouped by resource, with its parameters.
- [`vulnetix vdb` commands](/vdb-api/cli/commands/): the CLI reference.

## Platform IaC

The VDB API has no configuration of its own to declare. Config-as-code for the Vulnetix platform (`vulnetix config validate|kinds|schema` and the published JSON Schemas) is described on [Platform IaC](/platform-iac/).
