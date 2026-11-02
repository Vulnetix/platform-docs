---
title: Skills over MCP
description: The 18 Pix skills served verbatim through the io.modelcontextprotocol/skills extension, with skills/list, skills/get, the skill:// file template and digest verification.
order: 2
nav: Skills
sources:
  - mcp-server/src/skills/register.ts
  - mcp-server/src/skills/generated.ts
  - mcp-server/src/mcp/server.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

The server advertises the `io.modelcontextprotocol/skills` extension (SEP-2640) in its capabilities and serves the same 18 Pix skills as the [prompts](/mcp-server/prompts/overview/), in Agent Skills form. A client that reads skills natively uses these; every other client uses the prompts.

## How skills differ from the prompts

| | Prompt | Skill |
|---|---|---|
| Body | `SKILL.md` with a server notice prepended | `SKILL.md` byte for byte |
| Supporting files | Not reachable | Readable with `resources/read` |
| Integrity | None | Size and `sha256:<hex>` digest per file in the manifest |
| Frontmatter | Mapped to `_meta` keys | Published as typed YAML values (`user-invocable` is a boolean) |

Two skills' supporting files only exist in skill form: `fix` has `references/workflow.md` and `references/memory-yaml-schema.md`.

## Methods

| Method | Params | Returns |
|---|---|---|
| `skills/list` | `cursor`, optional | `skills`: every skill's entry, in one page. Any cursor is rejected with `-32602`. |
| `skills/get` | `uri`, the skill's `skill://<name>/SKILL.md` | `skill`: one entry. Unknown URI is `-32602`. |
| `resources/read` | `uri`, `skill://<name>/<path>` | The file, with its MIME type |

A skill entry:

```json
{
  "uri": "skill://fix/SKILL.md",
  "frontmatter": { "name": "fix", "license": "Apache-2.0", "argument-hint": "<vuln-id>", "user-invocable": true },
  "resources": [
    { "uri": "skill://fix/SKILL.md", "digest": "sha256:...", "size": 0 },
    { "uri": "skill://fix/references/workflow.md", "digest": "sha256:...", "size": 0 }
  ]
}
```

The frontmatter above is abbreviated; every field from the skill's YAML frontmatter is published.

## File template

One resource template, `skill://{name}/{+path}`, covers every file of every skill, including nested paths. It is listed by `resources/templates/list`. An unknown file is a resource-not-found error.

## Caching and auth

Nothing in a skill varies by caller. `skills/list`, `skills/get` and file reads carry `ttlMs: 300000`, `cacheScope: "public"`, and need no credential.

> [!CAREFUL] Client support is partial
> Few clients implement the skills extension yet, and Claude Code does not. Each skill says it follows `skills/_lib/contract.md`, the Pix shared conventions file. That file sits outside every skill directory, so it is not served.
