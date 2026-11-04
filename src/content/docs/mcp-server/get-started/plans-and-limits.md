---
title: Plans and limits
description: What each Vulnetix plan changes in tool results, how withheld records are signalled, how daily quota is counted and reported, and how to spend less of it.
order: 4
sources:
  - mcp-server/src/ai/augment.ts
  - mcp-server/src/shaping/filters/exploits.ts
  - mcp-server/src/shaping/filters/threat.ts
  - mcp-server/src/tools/result.ts
  - mcp-server/src/tools/analysis.ts
  - vdb-api/internal/middleware/ratelimit.go
checked: [mcp-server@8bbe962, vdb-api@4145f0a]
updated: 02 Nov 2026
---

The server works on every plan. It has no plan logic of its own except the AI analysis gate: vdb-api decides which fields each plan receives and reports the plan on every response in `X-VDB-Plan`, which the server copies to `_meta["vulnetix/plan"]`.

## What a plan changes

| Feature | Community | Pro, Business, Enterprise |
|---|---|---|
| All 31 tools, 18 prompts, resources and app views | Yes | Yes |
| Advisory record, KEV, EPSS, SSVC, remediation plan | Yes | Yes |
| Exploit counts per source (`exploitCount`, `activeSources`) | Yes | Yes |
| Individual exploit records (`exploitsBySource`) | Withheld | Yes |
| IOC, sighting and threat-actor records | Withheld, counts returned | Yes |
| Detection rule text (`rawText`) | Withheld (`gated: true`), rule metadata returned | Yes |
| AI `analysis` on the five AI tools | Skipped, code `gated` | Yes |

Current prices and quotas: [vulnetix.com/pricing](https://www.vulnetix.com/pricing).

## Withheld is not absent

Where a plan withholds records, the counts are still returned and the result says so. `vulnetix_exploits` for `CVE-2021-44228` on Community:

```json
{
  "id": "CVE-2021-44228",
  "exploitCount": 19868,
  "activeSources": [
    { "source": "poc", "count": 15259 },
    { "source": "other", "count": 4507 },
    { "source": "crowdSec", "count": 101 }
  ],
  "exploitsBySource": [],
  "note": "Per-source counts are present but the exploit records themselves are empty. That is tier gating, not an absence of exploits. The enumeration requires a Pro plan. Treat `summary` and `activeSources` as authoritative for exploitation signal."
}
```

| Tool | Signal that records are withheld |
|---|---|
| `vulnetix_exploits` | `note` present, `exploitsBySource` empty, `activeSources` non-empty |
| `vulnetix_iocs` | `gated: true` and `note` |
| `vulnetix_sightings` | `gated: true` and `note` |
| `vulnetix_threat_actors` | `gated: true` and `note` |
| `vulnetix_detection_rules` | `rawText: null` on each rule, `gated: true` and `note` on the `snort` or `yara` section |

The `note` text reads: "Counts are authoritative at every plan tier, but the records themselves require Pro. An empty or null list here means the detail is withheld, not that none exist." Because it travels with the data, the agent reads it too.

## Daily quota

vdb-api counts requests per organisation over the previous 24 hours against the organisation's daily limit, and sends three headers on every response. The server copies them into every tool result:

```json
"vulnetix/rateLimit": { "limit": "50", "remaining": "37", "reset": "1786406400" }
```

| Field | Meaning |
|---|---|
| `limit` | The organisation's daily limit, or `unlimited` |
| `remaining` | Requests left in the window, or `unlimited` |
| `reset` | Unix epoch seconds of the next day boundary |

The published defaults per plan:

| Plan | Default requests per day |
|---|---|
| Community | 50 |
| Pro | 2,000 |
| Business | 100,000 per API key |
| Enterprise | Set per contract |

The limit is set per organisation, so it can differ from the plan's published default. Read it from `limit`, not from the pricing page. How requests are counted, and which plans have an advisory (soft) limit, is on [VDB API rate limits](/vdb-api/api/rate-limits/). A tool that composes several upstream calls spends one request per call; `_meta["vulnetix/upstream"].calls` shows how many.

### When it runs out

The tool returns an error result, not an HTTP 429:

```text
Vulnetix daily rate limit exhausted for this organisation. The quota resets at 2026-11-03T00:00:00.000Z. Do NOT retry this call. Retrying cannot succeed until the quota resets and only burns further budget. Either wait, or authenticate a higher-tier organisation (run `vulnetix_auth_start`, then `vulnetix_auth_poll` once a human approves).
```

## AI analysis and plan

`vulnetix_triage_reason`, `vulnetix_secure_code_write`, `vulnetix_detection_rules`, `vulnetix_exploit_test` and `vulnetix_fix_plan` add a model-written `analysis` only when `X-VDB-Plan` is `pro`, `teams` or `enterprise`. On Community you get the full VDB data and:

```json
"analysisSkipped": "AI analysis requires a Pro plan or above; this organisation is on 'community'. The deterministic result above is unaffected."
```

Pass `ai: false` to skip the analysis on any plan.

## Spending less quota

| Do | Instead of |
|---|---|
| `vulnetix_kev_status` for one advisory | Paging `vulnetix_kev` |
| The default `detail: "summary"` | `detail: "full"`, about 20 times larger |
| `limit` on every list tool | Default page sizes |
| `sections` on `vulnetix_threat_feed` | All five sections (five calls) |
| `families` on `vulnetix_detection_rules` | All three families (three calls) |
| Repeating a call within its TTL | A slightly different query; cache hits do not reach vdb-api |

Cache hits are served from the Cloudflare edge and show `cached: true` in `_meta["vulnetix/upstream"]`. TTLs per tool are on [Limits](/mcp-server/reference/limits/).
