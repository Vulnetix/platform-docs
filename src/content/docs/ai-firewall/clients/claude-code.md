---
title: Claude Code
description: Point Claude Code at the gateway's Anthropic Messages surface with `install claude-code` or two environment variables, and confirm it with `/status`.
order: 2
sources: [cli/pkg/aifirewall/config.go, cli/pkg/aifirewall/clients.go, cli/pkg/aifirewall/provider.go, cli/cmd/ai_firewall.go, ai-firewall/internal/api/handlers.go, ai-firewall/internal/api/codec.go, ai-firewall/internal/client/client.go, ai-firewall/website/content/docs/coding-agents/claude-code.md]
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

Claude Code speaks the Anthropic Messages API (`POST /v1/messages` and `POST /v1/messages/count_tokens`), so it uses the `anthropic` provider. Both routes run the full guardrail pipeline; `count_tokens` writes no inference log row.

| Setting | Value |
|---|---|
| `ANTHROPIC_BASE_URL` | `https://guardrails.vulnetix.com/anthropic/{uuid}`, no `/v1` |
| `ANTHROPIC_AUTH_TOKEN` | Your Vulnetix API key |
| `ANTHROPIC_API_KEY` | Empty, or unset |
| `ANTHROPIC_MODEL` | Optional. A model your policy allows. |

The gateway accepts the key as `Authorization: Bearer` (what `ANTHROPIC_AUTH_TOKEN` sends) or `x-api-key` (what `ANTHROPIC_API_KEY` sends). The CLI uses `ANTHROPIC_AUTH_TOKEN`. The failure to look for is `ANTHROPIC_API_KEY` still holding an Anthropic key (`sk-ant-...`): that is a provider key sent to the gateway, and the answer is `401 invalid_api_key`.

## With the CLI

```bash
vulnetix ai-firewall key set anthropic --from-env ANTHROPIC_KEY   # once per organisation
vulnetix ai-firewall install claude-code shell
```

`install claude-code` merges `ANTHROPIC_BASE_URL` (and `ANTHROPIC_MODEL` with `--model`) into the `env` object of `.claude/settings.json`, keeping every other key in the file. Its default scope is `project`: `<git root>/.claude/settings.json`, or `~/.claude/settings.json` outside a repository or with `--scope user`.

The token is not written to `settings.json`, because that file is often committed. `install shell` puts `export ANTHROPIC_AUTH_TOKEN="$VULNETIX_API_KEY"` in your shell rc. With `--embed-key` the literal key goes into `.claude/settings.local.json` instead, mode `600`, and the CLI refuses if that file is in a repository and not git-ignored.

```bash
vulnetix ai-firewall install claude-code --scope user --model claude-sonnet-4-5 --dry-run
```

A `--model` the policy would refuse is an error before anything is written. A provider with no stored key is skipped with the command to fix it.

## By hand

Shell profile:

```bash
export VULNETIX_API_KEY="<your Vulnetix API key>"
export ANTHROPIC_BASE_URL="https://guardrails.vulnetix.com/anthropic/<uuid>"
export ANTHROPIC_AUTH_TOKEN="$VULNETIX_API_KEY"
export ANTHROPIC_API_KEY=""
```

Or `.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://guardrails.vulnetix.com/anthropic/<uuid>",
    "ANTHROPIC_API_KEY": ""
  }
}
```

with `ANTHROPIC_AUTH_TOKEN` in the environment, or in `.claude/settings.local.json` if that file is git-ignored.

> [!CAREFUL] A cached Anthropic login wins
> If Claude Code was signed in to an Anthropic account, it keeps using that login and talks to Anthropic directly. Run `/logout` in Claude Code, then start a new session.

## Verify

In Claude Code, `/status` shows the auth token source and the base URL. You want `ANTHROPIC_AUTH_TOKEN` and `https://guardrails.vulnetix.com/anthropic/<uuid>`. An OAuth login or `https://api.anthropic.com` means the gateway is not in the path.

From a terminal, `vulnetix ai-firewall status` should show `claude-code` as `wired`. `points elsewhere` raises `bypasses_firewall`.

## What Claude Code declares

Claude Code resends its full tool list on every request, which is what the [capability inventory](/ai-firewall/operations/inventory/) records and [tool rules](/ai-firewall/policy/tools/) match.

| In the request | What it is |
|---|---|
| `tools[]` | Built-in tools such as `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Task`, `WebFetch`, `WebSearch`, `Skill` |
| `tools[]` named `mcp__<server>__<tool>` | Tools of local MCP servers, flattened into the same list |
| `mcp_servers[]` | Remote MCP servers, by URL |
| The `Skill` tool's input schema | The available skill names |
| `tool_use` blocks in `messages[]` | Tools called on earlier turns |
| `User-Agent`, `x-app` | `claude-cli/<version> (external, cli)` and `cli`; the gateway names the client `claude-code` |

```bash
vulnetix ai-firewall inventory --client claude-code
```

A local MCP server is only visible through the `mcp__` prefix, which is a Claude Code naming convention. See [MCP servers](/ai-firewall/policy/mcp-servers/).

## Errors

| Status | `code` | Cause | Fix |
|---|---|---|---|
| `401` | `invalid_api_key` | The token is a provider key, or empty | Set `ANTHROPIC_AUTH_TOKEN` to your Vulnetix key and empty `ANTHROPIC_API_KEY` |
| `403` | `provider_key_missing` | No Anthropic key in the vault | `vulnetix ai-firewall key set anthropic` |
| `403` | `model_not_allowed` | The provider is in allowlist mode and this model is not listed | Pick an allowed model with `/model`, or allow it |
| `403` | `model_denied` | The model is denied | Pick another model |
| `403` | `request_blocked`, `tool_denied`, `mcp_denied`, `skill_denied`, `client_denied` | A rule matched. `blocked_by` names it. | See [Errors](/ai-firewall/reference/errors/) |
| `404` | `unsupported_api` | The slug is not `anthropic`, or the base URL ends in `/v1` | Use `https://guardrails.vulnetix.com/anthropic/<uuid>` |

Errors arrive in the Anthropic envelope, so Claude Code prints the message:

```json
{
  "type": "error",
  "error": {
    "type": "permission_error",
    "message": "model claude-opus-4-1 is not in the organisation allowlist",
    "code": "model_not_allowed"
  }
}
```

## Limits

- Every model call Claude Code makes, including background small-model calls, uses the same base URL and token, so all of it goes through the gateway once wired.
- A developer who unsets `ANTHROPIC_BASE_URL` or runs `/login` is talking to Anthropic again. `status` finds that machine only if the setting is in a file it reads.
