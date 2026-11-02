---
title: Resources
description: The four VDB record templates and the skill file template, how to address and percent-encode them, caching, and the errors a read returns.
order: 2
sources:
  - mcp-server/src/resources/register.ts
  - mcp-server/src/upstream/packages.ts
  - mcp-server/src/tools/vuln.ts
  - mcp-server/src/skills/register.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Tools answer a question. Resources are the records the answers are about, read by URI. A `vulnetix_vuln` summary is about 10 KB, and its result carries a `resource_link` to the full record, so the several-hundred-KB view is fetched only when it is needed.

## Templates

Records are URI templates, so a client finds them with `resources/templates/list`. `resources/list` returns only the three [app views](/mcp-server/protocol/apps/).

| Name | Template | Returns | vdb-api route |
|---|---|---|---|
| `vulnerability` | `vulnetix://vuln/{id}` | The `vulnetix_vuln` summary | `GET /vuln/{id}` |
| `vulnerability-full` | `vulnetix://vuln/{id}/full` | The complete shaped record | `GET /vuln/{id}` |
| `kev-status` | `vulnetix://kev/{id}` | KEV membership, due date, required action, ransomware flag | `GET /vuln/{id}/kev` |
| `package-advisories` | `vulnetix://package/{ecosystem}/{name}` | The `vulnetix_package_vulns` view: versions and their advisory ids | `GET /{name}/vulns?ecosystem=` |
| `skill-file` | `skill://{name}/{+path}` | A skill file, verbatim | none; see [Skills](/mcp-server/prompts/skills/) |

All VDB reads return `application/json`.

## Addressing

Percent-encode a name that contains a slash. `@types/node` on npm is:

```text
vulnetix://package/npm/%40types%2Fnode
```

`{ecosystem}` supports completion: completing `m` offers `maven`. The completion values are `cargo`, `go`, `maven`, `npm`, `nuget`, `packagist`, `pypi`, `rubygems`.

## Credentials and caching

Every VDB read uses your credential, exactly as a tool call does, and the same plan gating applies. Because content differs by plan, every VDB read carries `ttlMs: 300000`, `cacheScope: "private"`. A shared cache must not hold one plan's view for another. Skill files are the same for everyone and are `public`.

## Errors

| Situation | JSON-RPC error |
|---|---|
| The advisory or package is not in the VDB | `-32602`, resource not found |
| Missing or badly percent-encoded variable | `-32602` |
| No credential, rate limit, 401, 5xx | `-32603`, with the same text a tool error result would carry |

## Resource or tool

Use a tool to ask: it takes arguments and composes lookups. Use a resource to fetch a record you already have the address of, usually because a tool result linked to it.
