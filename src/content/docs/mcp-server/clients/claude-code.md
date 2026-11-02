---
title: Claude Code
description: Add the server to Claude Code with claude mcp add or a config file, choose a scope, keep the key out of .mcp.json, and run the prompts as slash commands.
order: 2
sources:
  - mcp-server/src/prompts/generated.ts
  - mcp-server/src/apps/register.ts
  - mcp-server/src/skills/register.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Claude Code supports remote HTTP MCP servers with custom headers.

## Add it

```bash
export VULNETIX_ORG='<orgId>'
export VULNETIX_KEY='<hex>'
claude mcp add --scope user --transport http vulnetix https://mcp.vulnetix.com/mcp \
  --header "Authorization: ApiKey ${VULNETIX_ORG}:${VULNETIX_KEY}"
claude mcp list
```

The shell expands the variables before Claude Code stores the header, so the stored value is the literal key in `~/.claude.json`, outside any repository.

Or edit `~/.claude.json` directly:

```json
{
  "mcpServers": {
    "vulnetix": {
      "type": "http",
      "url": "https://mcp.vulnetix.com/mcp",
      "headers": {
        "Authorization": "ApiKey <orgId>:<hex>"
      }
    }
  }
}
```

## Scopes

| `--scope` | Written to | Available in | Key in git |
|---|---|---|---|
| `local` (default) | Project entry in `~/.claude.json` | This project, you only | No |
| `user` | `~/.claude.json` | Every project | No |
| `project` | `.mcp.json` in the repo | Everyone who clones | Yes, unless you use variables |

### Sharing with a team

Commit `.mcp.json` with variable references. Claude Code expands `${VAR}` in `.mcp.json` when it loads the file:

```json
{
  "mcpServers": {
    "vulnetix": {
      "type": "http",
      "url": "https://mcp.vulnetix.com/mcp",
      "headers": {
        "Authorization": "ApiKey ${VULNETIX_ORG}:${VULNETIX_KEY}"
      }
    }
  }
}
```

Each developer exports `VULNETIX_ORG` and `VULNETIX_KEY` in the shell that starts Claude Code. Claude Code asks for approval the first time it loads a project-scoped server; `claude mcp reset-project-choices` clears that decision.

## Check it

In a session, `/mcp` shows `vulnetix` as connected. Then:

```text
Is CVE-2021-44228 still being exploited, and is there a CISA deadline?
```

## Prompts as slash commands

The 18 prompts appear as `/mcp__vulnetix__<prompt>`:

```text
/mcp__vulnetix__vulnetix_repo_impact CVE-2021-44228
/mcp__vulnetix__vulnetix_fix CVE-2021-44228
/mcp__vulnetix__vulnetix_verify_fix CVE-2021-44228
```

Each prompt takes one optional string argument, named `arguments`.

Each one runs shell commands with the Vulnetix CLI, which Claude Code can do through its Bash tool. See [Prompts](/mcp-server/prompts/overview/).

Claude Code does not render [MCP Apps](/mcp-server/protocol/apps/); the tool results are unchanged. The [skills extension](/mcp-server/prompts/skills/) is not used by Claude Code, so use the prompts.

## Pix and the MCP server together

[Pix](/pix/) installs the same skills locally with hooks. Running both works; you will see each workflow twice, once as a Pix skill and once as an MCP prompt.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Tools missing | Restart Claude Code; check `/mcp` |
| 401 or "No Vulnetix credential was supplied" | Header needs `ApiKey <orgId>:<hex>` |
| `${VULNETIX_KEY}` sent literally | Not exported in the shell that started Claude Code |
| Project server never loads | You declined the approval prompt. Run `claude mcp reset-project-choices`. |
