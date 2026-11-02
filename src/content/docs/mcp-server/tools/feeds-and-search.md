---
title: Feed and search tools
description: The SOC triage queue, full-text vulnerability search, the end-of-life product catalogue and the five-section threat digest.
order: 5
nav: Feeds and search
sources:
  - mcp-server/src/tools/feeds.ts
  - mcp-server/src/shaping/filters/feeds.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

None of these take an advisory id. Full parameters: [Tool reference](/mcp-server/reference/tools/).

## `vulnetix_soc_triage`

Recently published vulnerabilities ranked for attention. Each item: `cveId`, `source`, `title` (truncated to 180 characters), `datePublished`, `vendor`, `product`, `cvss`, `epss`, `cess`. Paged with `limit` (1 to 100, default 25) and `offset`. Hosts that render apps show it as the sortable triage queue.

```text
What on the triage queue today affects a Java service?
```

## `vulnetix_search`

Free-text search across titles, descriptions and aliases. `query` needs at least 2 characters; `limit` 1 to 50, default 10. Use it when you know a product, library or nickname (`log4shell`) but not the id.

## `vulnetix_eol_products`

Products with tracked end-of-life dates: runtimes, servers, databases, operating systems. Filter with `category` (for example `server-app`, `lang`, `os`, `db`). Returns up to `limit` products, or 150 when `limit` is omitted. For one product's release dates, call `vdb_request` with path `/eol/products/{product}`.

## `vulnetix_threat_feed`

A digest of up to five sections, fetched in parallel. `limit` (1 to 50, default 10) caps items per AI section; `sections` restricts which run.

| Section | Contents |
|---|---|
| `ai-discoveries` | Vulnerabilities discovered with AI |
| `ai-in-wild` | AI-assisted exploitation seen in the wild |
| `ai-malware` | AI-generated malware families |
| `exploit-trends` | Exploit totals and top CVEs by weaponisation tier, yearly |
| `vendor-trends` | Vendor CVE volume, current and prior years |

A section that fails becomes `{"error": "..."}` and is named in `_meta["vulnetix/degraded"]`; the rest is still returned. Each section costs one upstream call, so request only what you need.

```text
Give me this week's threat digest, exploit and vendor trends only.
```
