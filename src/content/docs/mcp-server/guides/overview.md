---
title: Guides
description: Worked sequences that chain the tools and prompts for common jobs, from triaging one CVE to auditing an inherited repository.
order: 1
nav: Overview
sources:
  - mcp-server/src/tools/
  - mcp-server/src/prompts/generated.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Each guide is a sequence: what to ask, which tool or prompt answers, what comes back, and what to do with it.

| Guide | Job |
|---|---|
| [Triage a CVE](/mcp-server/guides/triage-a-cve/) | From a bare identifier to a patch-or-defer decision you can defend |
| [Gate a new dependency](/mcp-server/guides/gate-a-dependency/) | Check a package before it enters the lockfile |
| [Meet a KEV deadline](/mcp-server/guides/kev-deadlines/) | Find binding due dates that apply to what you run |
| [Run an incident](/mcp-server/guides/incident-response/) | A CVE goes hot: urgency, exposure, indicators, detection, mitigation |
| [Review a pull request](/mcp-server/guides/review-a-pr/) | Dependencies first, then the changed code, then a verdict |
| [Audit an inherited repository](/mcp-server/guides/audit-a-repo/) | First contact with a codebase nobody has looked at |
| [Run it behind a Cloudflare Portal](/mcp-server/guides/portals-and-gateway/) | Administrator setup with Zero Trust |

## The pattern

1. **Establish the facts** with tools: KEV, EPSS, exploitation maturity and sightings, not what the model remembers.
2. **Establish the exposure** with a local prompt: does the advisory reach your code.
3. **Decide and record why**, so the decision survives the conversation.
4. **Act, then verify** with the CLI.

Tools cover step 1 completely. Steps 2 to 4 need your repository, which is where the [prompts](/mcp-server/prompts/overview/) and the [CLI](/cli/) come in.
