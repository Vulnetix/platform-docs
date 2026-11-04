---
title: Pagination
description: The VDB API's two pagination styles, limit and offset or page and perPage on the package catalogue, with their defaults, caps and how to walk every page.
order: 4
sources: [vdb-api/internal/handler/product.go, vdb-api/internal/handler/identifiers.go, vdb-api/internal/handler/exploits.go, vdb-api/internal/handler/v2_packages.go, vdb-api/internal/handler/openapi-v2.json, vdb-api/internal/handler/inputs_routes.go]
checked: [vdb-api@4145f0a]
updated: 02 Nov 2026
---

## limit and offset

Most list routes take `limit` and `offset` in the query string and echo them back with the total:

```json
{
  "total": 1342,
  "limit": 100,
  "offset": 200,
  "hasMore": true,
  "...": "the page of results"
}
```

`hasMore` is `offset + limit < total`. To walk every page, add `limit` to `offset` until `hasMore` is `false`.

On the product, package and identifier routes, a `limit` above the cap is lowered to the cap, and a `limit` that is zero, negative or not a number falls back to the default. Treat the caps below as the most a page can hold on every route.

| Routes | Default `limit` | Cap |
|---|---|---|
| Product and package routes (`/product/*`, `/{package}/versions`, `/{package}/vulns`, `/{ecosystem}/*`), `/identifiers`, `/gcve`, `/eol/products`, `/eol/identifiers`, `/vuln/{id}/fixes/*`, `/vuln/{id}/affected`, `/vuln/{id}/snort-rules`, `/vuln/{id}/yara-rules`, `/iocs` | 100 | 500 |
| `/snort-rules`, `/yara-rules`, `/attack-techniques`, `/kev`, `/vex`, `/triage`, `/virtual-patches`, `/countermeasures`, `/vuln/{id}/virtual-patches`, `/vuln/{id}/countermeasures` | 100 | 200 |
| `/exploits` (search), `/packages/search` | 100 | 100 |
| `/exploits/{identifier}` | 100 | 1,000 |
| `/scorecard/search` | 20 | 100 |
| `/search/vulns` | 10 | 50, and `offset` at most 1,000 |
| `/vulnetix-kev`, `/ai-discoveries` | 1,000 | 5,000 |

The CLI's list commands use lower defaults of their own (often `--limit 50`); see [the command reference](/vdb-api/cli/commands/).

> [!CAREFUL] Summary counts describe the whole set
> On `/exploits/{identifier}`, the summary counts (by source, by type) always describe every exploit for the CVE, not the page you asked for. A page of 10 with a summary of 340 is correct. Use `total` and `hasMore` to page, not the length of a summary bucket.

## page and perPage

The package catalogue routes page by number instead:

| Route | `page` default | `perPage` default | `perPage` cap |
|---|---|---|---|
| `/packages` | 1 | 50 | 50 |
| `/packages/org` | 1 | 50 | 50 |
| `/packages/enrichment` | 1 | 25 | 100 |

The answer carries a `pagination` object:

```json
{ "pagination": { "page": 2, "perPage": 50, "totalRows": 812, "totalPages": 17 } }
```

## Fan-out answers

When a purl, CPE, TEI or SWID tag sits in a `/v2/vuln/{identifier}/*` path, the route runs for at most 50 of the advisories it resolves to and sets `hasMore: true` if there were more. There is no offset for this; narrow the input instead (add a version, an ecosystem or a vendor). See [Identifiers and inputs](/vdb-api/api/inputs/).

## Walking pages with curl

```bash
AUTH="Authorization: ApiKey ${VULNETIX_ORG_ID}:${VULNETIX_API_KEY}"
offset=0
while :; do
  page=$(curl -s -H "$AUTH" "https://api.vdb.vulnetix.com/v2/identifiers/2024/3?limit=500&offset=${offset}")
  echo "$page" | jq -r '.identifiers[]'
  [ "$(echo "$page" | jq -r '.hasMore')" = "true" ] || break
  offset=$((offset + 500))
done
```

Each page is one request against your [daily quota](/vdb-api/api/rate-limits/).
