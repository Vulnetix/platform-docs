---
title: Self-hosting and configuration
description: Run your own copy of the Worker, with every variable, secret and binding it reads, their defaults, and what breaks when one is missing.
order: 6
nav: Self-hosting
sources:
  - mcp-server/wrangler.jsonc
  - mcp-server/src/worker-env.d.ts
  - mcp-server/src/env.ts
  - mcp-server/src/config.ts
  - mcp-server/src/auth/seal.ts
  - mcp-server/src/metrics.ts
  - mcp-server/package.json
  - mcp-server/README.md
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

The hosted endpoint at `https://mcp.vulnetix.com/mcp` is the supported deployment. The source is a Cloudflare Worker in [Vulnetix/mcp-server](https://github.com/Vulnetix/mcp-server), and you can run your own copy. It still calls vdb-api with each caller's credential.

Workers Paid is required. The free tier's 10 ms CPU limit cannot parse and shape a 2.6 MB vdb-api response.

## Run locally

```bash
git clone https://github.com/Vulnetix/mcp-server.git
cd mcp-server
yarn install
yarn dev
```

`yarn dev` runs `wrangler dev` on port 8788. Point a client at `http://127.0.0.1:8788/mcp`.

| Script | Does |
|---|---|
| `yarn dev` | `wrangler dev` on `:8788` |
| `yarn typecheck`, `yarn lint` | Type and Biome checks |
| `yarn test` | Unit tests, jq parity tests and per-tool byte budgets |
| `yarn prompts:generate` | Regenerate prompts and skills from `../pix-ai-coding-assistant` |
| `yarn conformance http://127.0.0.1:8788` | Wire-level protocol checks with curl |
| `yarn smoke http://127.0.0.1:8788` | Every tool against live vdb-api |

## Variables

Set in `vars` in `wrangler.jsonc`.

| Name | Values | Default when unset | Hosted value |
|---|---|---|---|
| `INFERENCE_MODE` | `gateway`, `off` | `off` (any other value also reads as `off`) | `gateway` |
| `CF_AIG_ACCOUNT_ID` | Cloudflare account id | unset, which disables AI analysis | set |
| `CF_AIG_GATEWAY` | AI Gateway name | `default` | `default` |
| `CF_AIG_MODEL` | `{provider}/{model}` | `workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast` | same |
| `VULNETIX_API_URL` | vdb-api base URL | `https://api.vdb.vulnetix.com` | a CloudFront hostname (see below) |
| `VULNETIX_WEB_URL` | Vulnetix web app base URL for the device grant | `https://www.vulnetix.com` | unset |
| `ALLOWED_HOSTS` | comma-separated hostnames | none | unset |

Add your own hostname to `ALLOWED_HOSTS`, or every request is refused with 403 by the `Host` check.

## Secrets

Set with `wrangler secret put <NAME>`.

| Name | Needed for | When missing |
|---|---|---|
| `MCP_AEAD_KEY` | `vulnetix_auth_start` and `vulnetix_auth_poll`. Must be at least 32 characters. | Both tools return an error result telling the user to run `vulnetix auth login` |
| `CF_AIG_TOKEN` | AI analysis through Cloudflare AI Gateway, sent as `cf-aig-authorization` | AI tools return data with `analysisSkipped`, code `unconfigured` |
| `MCP_STATE_KEY` | Declared for request-state signing | Not read by any code today |

## Bindings

| Binding | Type | Purpose |
|---|---|---|
| `MCP_METRICS` | Analytics Engine dataset `vulnetix_mcp` | One write-only data point per tool call. A missing binding is a no-op. |

Analytics Engine must be enabled on the account before the binding is deployed, or `wrangler deploy` fails. Remove the binding from `wrangler.jsonc` if you do not want metrics.

Recorded per call: tool name, plan tier, credential scheme (`ApiKey`, `Bearer` or `none`), outcome (`ok`, `tool_error`, `exception`), AI status, handler milliseconds, upstream calls, raw and shaped bytes, retries, cache hit. Never recorded: the credential, the organisation id, or any tool argument.

## Why the hosted deployment points at CloudFront

When the Worker runs on `mcp.vulnetix.com`, a subrequest to `api.vdb.vulnetix.com` stays inside the same Cloudflare zone and lands on an S3-backed zone origin, which answers every tool with an HTTP 400 S3 error (`Unsupported Authorization Type`). The hosted `VULNETIX_API_URL` uses the CloudFront distribution hostname, which is outside the zone. A self-hosted Worker on a different zone can use the default.

## Deployment

The hosted Worker is deployed by Cloudflare Workers Builds on every push to `main`. `.github/workflows/verify-deployment.yml` polls `/health` until `commit` matches the pushed SHA, then runs conformance, the SDK client check and the tool smoke test against the live endpoint. `compatibility_date` must not be later than the pinned `workerd` supports.
