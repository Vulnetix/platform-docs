---
title: Result metadata
description: The vulnetix/* keys in every tool result's _meta, where each value comes from, and how to read plan, quota, cache and shaping from them.
order: 2
nav: Result _meta
sources:
  - mcp-server/src/tools/result.ts
  - mcp-server/src/ai/augment.ts
  - mcp-server/src/tools/raw.ts
  - mcp-server/src/config.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Every tool result is a normal MCP `CallToolResult`. Alongside `content` and `structuredContent` it carries `_meta`, with keys under the `vulnetix/` prefix.

```json
"_meta": {
  "vulnetix/plan": "community",
  "vulnetix/rateLimit": { "limit": "50", "remaining": "37", "reset": "1786406400" },
  "vulnetix/upstream": { "calls": 1, "ms": 4889, "bytes": 2606569, "cached": false },
  "vulnetix/shaping": { "rawBytes": 2606569, "shapedBytes": 10613, "ratio": 0.00407 }
}
```

## Keys

| Key | Type | Present when | Source |
|---|---|---|---|
| `vulnetix/plan` | string | vdb-api sent `X-VDB-Plan` on the last upstream call | `X-VDB-Plan` response header |
| `vulnetix/rateLimit` | object: `limit`, `remaining`, `reset` (strings) | any of the three headers was sent | `RateLimit-DayLimit`, `RateLimit-Remaining`, `RateLimit-Reset` |
| `vulnetix/upstream` | object: `calls`, `ms`, `bytes`, `cached`, `retries` | every tool that called vdb-api | the server's upstream client |
| `vulnetix/shaping` | object: `rawBytes`, `shapedBytes`, `ratio` | every shaped tool | raw body size against serialised payload size |
| `vulnetix/degraded` | array of strings | a composing tool had a leg fail | `vulnetix_threat_feed`, `vulnetix_detection_rules`, `vulnetix_purl` |
| `vulnetix/ai` | object | the five AI tools | see below |
| `vulnetix/truncated` | `true` | `vdb_request` cut the body at `maxBytes` | `vdb_request` |

`vulnetix/upstream` fields:

| Field | Meaning |
|---|---|
| `calls` | Upstream calls this tool made. The ceiling is 12 per tool. |
| `ms` | Sum of upstream call durations. |
| `bytes` | Sum of raw response sizes, before shaping. |
| `cached` | `true` only when every call was served from the edge cache. |
| `retries` | Present only when a GET was retried after a 5xx or a network error. |

`ratio` in `vulnetix/shaping` is `shapedBytes / rawBytes`, to 5 decimal places.

## `vulnetix/ai`

When the analysis ran:

| Field | Meaning |
|---|---|
| `model` | The model id, `{provider}/{model}` |
| `promptTokens`, `completionTokens` | Token counts the gateway reported |
| `ms` | Inference time |
| `cached` | `true` when the AI Gateway served a cached completion |
| `derived` | Always `true`. The section is model output, not VDB data. |

When it was skipped: `{"skipped": "<code>", "reason": "<text>"}`.

| `skipped` | Cause |
|---|---|
| `disabled` | You passed `ai: false`, or the deployment has `INFERENCE_MODE=off` |
| `unconfigured` | `CF_AIG_TOKEN` or `CF_AIG_ACCOUNT_ID` is not set on the deployment |
| `gated` | The plan in `X-VDB-Plan` is not `pro`, `teams` or `enterprise` |

A model call that fails after the checks pass sets `analysis: null` and `analysisSkipped: "AI analysis failed: ..."` in the payload, with no `skipped` code in `_meta`.

## Reading quota

`reset` is Unix epoch seconds. An agent can read `remaining` and slow down before it runs out. When the quota is exhausted the tool returns an error result with the reset time as an ISO timestamp, and the text tells the agent not to retry. See [Errors](/mcp-server/reference/errors/).

## Reading plan tier

The plan is never derived from your credential. It is whatever vdb-api reports on that call, so `vulnetix_auth_status` does not show it. Call any VDB tool and read `vulnetix/plan`.
