---
title: FAQ
description: Short answers to the questions asked before and after connecting, each linking to the page with the detail.
order: 9
sources:
  - mcp-server/src/mcp/server.ts
  - mcp-server/src/metrics.ts
  - mcp-server/src/prompts/generated.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

## Does my code get sent to Vulnetix?

No. No tool accepts file content. What crosses the wire is an advisory id, a package name, a version or a purl. The prompts that read your code tell your own agent to run the CLI locally.

## Do I need the CLI?

Not for the 31 tools. All 18 prompts run on your machine and expect the [Vulnetix CLI](/cli/). See [Local workflows](/mcp-server/prompts/local-workflows/).

## Is it free?

The Community plan works with every tool and prompt. Exploit, IOC, sighting and threat-actor records and the AI analysis need Pro or above. Counts are returned on every plan. See [Plans and limits](/mcp-server/get-started/plans-and-limits/).

## Can a team share one key?

Yes, but quota is per organisation credential, so everyone draws from one daily limit and usage cannot be told apart. Use a separate organisation for CI.

## What happens at the rate limit?

The tool returns an error result with the reset time and an instruction not to retry. It is not an HTTP 429. See [Errors](/mcp-server/reference/errors/).

## Why is the answer shorter than the API's?

A raw CVE record can be 2.6 MB. Every tool shapes the response first. See [Response shaping](/mcp-server/design/response-shaping/).

## How fresh is the data?

As fresh as the VDB, plus the edge-cache TTL of the tool, 5 minutes to 24 hours. `_meta["vulnetix/upstream"].cached` shows a cache hit.

## Can I self-host it?

Yes, on Cloudflare Workers Paid. See [Self-hosting](/mcp-server/reference/self-hosting/).

## Is there a stdio version?

No. A stdio-only client can use the `mcp-remote` bridge. See [Other clients](/mcp-server/clients/other-clients/).

## Does it use OAuth?

No. The RFC 9728 metadata is published with an empty `authorization_servers` list.

## Does it log my queries?

The Worker writes one metrics data point per tool call: the tool name, plan, credential scheme, outcome, timings and sizes. It does not record the credential, the organisation id or any argument. vdb-api records usage for quota and billing.

## How is this different from Pix?

[Pix](/pix/) is an AI coding assistant plugin with hooks and local skills. The MCP server needs no install and works in any MCP client. Its prompts and skills are generated from the Pix skill files. They share one database and one credential.

## Can I use it with a local model?

Yes, if the client supports remote MCP and the model supports tool calling. Small models choose better from fewer tools, so disable the ones you do not need.

## Where do I report a bug or a security issue?

Bugs: [GitHub issues](https://github.com/Vulnetix/mcp-server/issues). Security issues: follow `SECURITY.md` in the repository, not a public issue.
