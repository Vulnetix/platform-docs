---
title: Codex CLI
description: Codex speaks only the OpenAI Responses API, which the gateway serves for the `openai` provider. `install codex` adds a model provider to `~/.codex/config.toml`.
order: 4
sources: [cli/pkg/aifirewall/config.go, cli/pkg/aifirewall/clients.go, cli/pkg/aifirewall/detect.go, cli/cmd/ai_firewall.go, ai-firewall/internal/api/server.go, ai-firewall/internal/api/codec.go, ai-firewall/internal/client/client.go, saas/prisma/migrations/20260715000002_ai_firewall_wire_apis_enable/migration.sql, ai-firewall/website/content/docs/coding-agents/codex-cli.md]
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

Codex sends `POST /v1/responses`. Of the built-in providers only `openai` serves the `responses` surface, so Codex is always wired to `https://guardrails.vulnetix.com/openai/<uuid>/v1`. Pointing it at `groq`, `openrouter` or another `chat`-only provider returns `404 unsupported_api`.

## With the CLI

```bash
vulnetix ai-firewall key set openai --from-env OPENAI_KEY   # once per organisation
vulnetix ai-firewall install codex --model gpt-4o-mini
```

`install codex` always writes `~/.codex/config.toml` (user scope). It edits the file as text, keeps your comments and table order, and refuses to write a file that does not parse as TOML. It adds two root keys and one fenced table:

```toml
model = "gpt-4o-mini"
model_provider = "vulnetix-openai"

# Vulnetix AI Firewall
[model_providers.vulnetix-openai]
name = "Vulnetix AI Firewall (openai)"
base_url = "https://guardrails.vulnetix.com/openai/<uuid>/v1"
env_key = "VULNETIX_API_KEY"
wire_api = "responses"
# End Vulnetix AI Firewall
```

`model` is only written with `--model`, and the model is checked against your policy first. If the gateway does not advertise `responses` for `openai`, the CLI skips Codex with `wire_unsupported` rather than writing a config that would fail.

`env_key` names a variable: Codex reads the key from the environment, so export it where Codex runs.

```bash
export VULNETIX_API_KEY="<your Vulnetix API key>"
```

`uninstall codex` removes the table, and removes `model_provider` and `model` only while `model_provider` still names `vulnetix-openai`.

## By hand

Write the block above into `~/.codex/config.toml` yourself. The four values that matter:

1. `wire_api = "responses"`. Codex accepts no other value.
2. `base_url` ends in `/v1`.
3. The slug in `base_url` is `openai`.
4. `env_key` is the name of the variable holding your Vulnetix key, not the key.

## Verify

```bash
vulnetix ai-firewall status
```

`codex` should be `wired`, with the gateway URL as its base URL. `points elsewhere` means `config.toml` names another `base_url` and raises `bypasses_firewall`.

## What Codex declares

| In the request | What it is |
|---|---|
| `tools[]` with `"type": "function"` | Codex's own tools, such as `apply_patch` |
| `tools[]` with `"type": "local_shell"`, `"web_search"` | Provider built-ins. The type is the name a rule matches. |
| `tools[]` with `"type": "mcp"`, `server_label`, `server_url` | A remote MCP server, named and with its URL |
| `function_call`, `mcp_call` items in `input[]` | Tools called on earlier turns |
| `originator`, `User-Agent` | `codex_cli_rs` and `codex_cli_rs/<version>`; the gateway names the client `codex-cli` |

A local MCP server from `config.toml` arrives flattened into `tools[]` as `<server>__<tool>`, so it needs a [tool rule](/ai-firewall/policy/tools/). A remote one can be matched by an [MCP rule](/ai-firewall/policy/mcp-servers/).

## Errors

| Status | `code` | Cause |
|---|---|---|
| `401` | `invalid_api_key` | `VULNETIX_API_KEY` is unset, empty, or holds an OpenAI key |
| `403` | `provider_key_missing` | No OpenAI key in the vault |
| `403` | `model_not_allowed`, `model_denied` | The model is refused by policy |
| `404` | `unsupported_api` | The slug is not `openai`, or `wire_api` is not `responses` |

## Limits

- Codex has no second credential or background model, so every request uses the provider you selected.
- `model_provider` is one line in a file the developer owns. `status` finds a machine where it was changed back.
- Tool-call arguments (shell commands, patches) are not scanned. Tool results are.
