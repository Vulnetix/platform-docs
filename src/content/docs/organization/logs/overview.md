---
title: Logs
nav: Logs overview
description: The Logs page in the Resolve Platform, one stream per product (API usage, Pix Sandbox, Pix calls, AI Firewall, Package Firewall and reviews), the shared time range, plan limits and the API behind each stream.
order: 1
sources: [website/src/pages/resolve/logs.vue, website/src/components/account-logs/logs-streams.ts, website/src/components/account-logs/ApiUsageStream.vue, website/src/components/account-logs/PackageFirewallStream.vue, website/src/components/account-logs/SandboxStream.vue, website/src/components/review/review-actions.ts, website/src/shared/plan-features.ts, vdb-site/docs/account-logs-and-billing.md]
checked: [website@d56e8be1, vdb-site@8209415]
updated: 05 Nov 2026
---

The Logs page shows what your organisation did with each Vulnetix product: requests, sessions, decisions and reviews. Open it at **Account › Logs** (`/resolve/logs`). Each product is its own stream with its own charts and log, and a stream reads only its own data, so a slow stream holds up only its own panel.

## Streams

The stream bar at the top shows each stream's headline figure for the selected range. Pick a stream to open its charts and its log. A stream has its own address, so a link can open it directly.

| Stream | Address | What it shows | Read more |
|---|---|---|---|
| API usage (default) | `/resolve/logs` | Requests to the VDB API against the daily quota of each key: status split, the busiest key, the top routes with p95 latency, and the request log | [Rate limits](/vdb-api/api/rate-limits/) |
| Pix Sandbox | `/resolve/logs#sandbox` | Compute: sessions, agents and session hours per sandbox, and CPU samples. Model calls made inside a session are in the AI Firewall stream | [Pix Sandboxes](/software-factory/workforce/pix-sandboxes/) |
| Pix calls | `/resolve/logs#calls` | Every call with Pix, what was said and what Pix did, and the conversations of the retired Pix chat | [Call history](/software-factory/pix/call-history/) |
| AI Firewall | `/resolve/logs#aifw` | Inference metadata while inference logging is on: decisions, the guardrails that blocked or redacted, providers and clients. Prompts and completions are never stored | [Inference logs](/ai-firewall/operations/logs/) |
| Package Firewall | `/resolve/logs#package` | Every decision the proxy made: actions per ecosystem, the most blocked packages, and the decision log | [Decision log](/package-firewall/operations/decision-log/) |
| Reviews | `/resolve/logs#reviews` | Who decided what, one card per kind: firewall decisions, new dependencies, triage, recast scores, suppression reviews and Pix call ratings | [Triage](/vulnerability-management/findings/triage/) |

Older links keep working: `#pix` and `#assistant` open Pix calls, `#reviewers` opens Reviews, and `#audit` or any unknown hash opens API usage.

## Time range

The range control in the page header sets the range for every stream: `24h`, `7d`, `30d` (the default) or `90d`. It is kept in the address as `?range=`, so a shared link opens the same window. A `24h` range draws one bar per hour; the others draw one bar per UTC day.

## Filters and links from other pages

Filters live in the address too. The Package Firewall page links into its stream already filtered, for example `/resolve/logs?action=BLOCK&ecosystem=npm&pkg=axios#package`. The API usage log filters by route, method and status; the status filter narrows the log only, because the chart is the status split. The AI Firewall log filters by provider, client, model and decision, and exports the page on screen as CSV.

## Plans

| Feature | Plan |
|---|---|
| Every stream, with the data you already have | every plan |
| Filter API usage and its charts by member key | Business and Enterprise |
| Turn on AI Firewall inference logging | Pro and above |

Package Firewall requests from a Community organisation are not logged, so its stream stays empty on Community.

## API

Each stream reads a stats route for its charts and a list route for its log. Every stats route takes `?range=24h|7d|30d|90d` and answers the same bucket grid, so the charts on the page share one time axis.

| Stream | Charts | Log |
|---|---|---|
| API usage | `GET /v1/usage/stats` | `GET /v1/usage` |
| Pix Sandbox | `GET /v1/belai/sandboxes/usage/stats` | `GET /v1/belai/sandboxes/usage` |
| AI Firewall | `GET /v1/ai-firewall/logs/stats` | `GET /v1/ai-firewall/logs` |
| Package Firewall | `GET /v1/package-firewall/logs/stats` | `GET /v1/package-firewall/logs` |
| Reviews | `GET /v1/review/audit/summary?kind=` | `GET /v1/review/audit?kind=` |

Billing, invoices and the quota are on **Account › Billing** (`/resolve/billing`).
