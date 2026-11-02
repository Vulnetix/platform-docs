---
title: Client identity
description: How the gateway names the calling client from request headers, the canonical client names client_allow and client_deny match, and why identity is attribution and not authentication.
order: 16
sources:
  - ai-firewall/internal/client/client.go
  - ai-firewall/internal/policy/capability.go
  - vdb-api/internal/handler/v2_cli_ai_firewall_baseline.go
checked: [ai-firewall@339de55, vdb-api@4145f0a]
updated: 02 Nov 2026
---

> [!CAREFUL] Client identity is self-reported
> Every signal below is a header the caller chooses to send. `curl -H 'User-Agent: claude-cli/2.1.0'` is Claude Code as far as the gateway can tell. Use client rules for attribution and inventory. The authentication boundary is the Vulnetix API key.

## How the name is chosen

The first matching rule wins, most specific first.

| Order | Header | Example | Name |
|---|---|---|---|
| 1 | `originator` containing `codex` | `codex_cli_rs` | `codex-cli` |
| 2 | `User-Agent` containing `claude-cli/` or `claude-code/` | `claude-cli/2.1.0 (external, cli)` | `claude-code` |
| 2 | `User-Agent` containing `claude-desktop/` | | `claude-desktop` |
| 2 | `User-Agent` containing `codex_cli_rs/` or `codex-cli/` | `codex_cli_rs/0.47.0` | `codex-cli` |
| 2 | `User-Agent` containing `cursor/` | `Cursor/1.7.3` | `cursor` |
| 2 | `User-Agent` containing `kiro/` | | `kiro` |
| 2 | `User-Agent` containing `aider/` | | `aider` |
| 2 | `User-Agent` containing `continue/` | | `continue` |
| 2 | `User-Agent` containing `langchain/` | | `langchain` |
| 2 | `User-Agent` containing `githubcopilot/` | | `copilot` |
| 2 | `User-Agent` containing `anthropic/` or `anthropic-sdk-` | | `anthropic-sdk` |
| 2 | `User-Agent` containing `openai/` or `openai-python/` | | `openai-sdk` |
| 2 | `User-Agent` containing `curl/` | `curl/8.9.1` | `curl` |
| 3 | `x-app: cli` | | `claude-code` |
| 4 | `anthropic-beta` containing `claude-code` | `claude-code-20250219` | `claude-code` |
| 5 | `x-stainless-lang` with `x-api-key` or `anthropic-version` | `python` | `anthropic-sdk` |
| 5 | `x-stainless-lang` without either | `js` | `openai-sdk` |
| 6 | `X-OpenAI-Client-User-Agent` JSON | `{"bindings_version":"1.0","lang":"python"}` | `openai-sdk` |
| 7 | `editor-version` | `vscode/1.95.0` | `copilot` |
| 8 | nothing recognised | `wget/1.21` | `unknown` |

`User-Agent` matching is case-insensitive and rows within order 2 are tried top to bottom. The version is read from the text after the matched prefix, up to the first space or `(`. Claude Code sends the Anthropic SDK's Stainless headers as well as its own agent string, which is why agent strings are checked before SDK headers.

## Canonical names

`claude-code`, `claude-desktop`, `codex-cli`, `cursor`, `kiro`, `copilot`, `continue`, `aider`, `anthropic-sdk`, `openai-sdk`, `langchain`, `curl`, `unknown`.

These are the strings `client_allow` and `client_deny` match, and they appear in the inventory and the inference log. `unknown` is a name, so an allowlist that does not list it refuses unrecognised clients.

## Client rules

```bash
vulnetix ai-firewall policy guardrail supported-agents \
  --rule-type client_allow --action flag --pattern claude-code --priority 110
vulnetix ai-firewall policy guardrail supported-agents-codex \
  --rule-type client_allow --action flag --pattern codex-cli --priority 110
```

| Action | Effect |
|---|---|
| `flag` | Recorded; forwarded. |
| `block` | `403 client_denied`. |
| `strip` | Refused at write time; applied as `block` if it reaches the gateway. |

Patterns are case-sensitive globs, and every canonical name is lowercase. `Claude-Code` matches nothing.

Organisations run more clients than they expect: CI scripts on an SDK, notebooks, `curl` in a runbook. Every one is flagged or refused the moment a `client_allow` rule is enabled. The baseline's `agent-known-clients` (`client_allow`, `claude-code`) ships disabled for that reason, and `agent-curl-client` (`client_deny`, `curl`) flags scripts calling the gateway directly.

## What identity is good for

- **Attribution.** Which agent sent the requests that were blocked.
- **Finding unmanaged agents.** A client name nobody recognises in the inventory.
- **Rollout.** Applying a strict rule to `claude-code` first.

It does not stop a determined caller. If only approved software may reach the provider, control who holds the Vulnetix API key.

## Related

- [Inventory](/ai-firewall/operations/inventory/)
- [Tool rules](/ai-firewall/policy/tools/)
- [Threat model](/ai-firewall/security/threat-model/)
