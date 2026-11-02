---
title: Tool rules
nav: Tools
description: Flag, strip or block the tools an agent offers the model with tool_allow and tool_deny, how allowlist mode works for capability families, and when a strip becomes a block.
order: 13
sources:
  - ai-firewall/internal/policy/capability.go
  - ai-firewall/internal/policy/glob.go
  - ai-firewall/internal/anthropic/capabilities.go
  - ai-firewall/internal/openai/capabilities.go
  - ai-firewall/internal/kiro/capabilities.go
  - vdb-api/internal/handler/ai_firewall_rules.go
  - website/src/components/ai-firewall/capability-view.ts
  - website/src/components/ai-firewall/capability-model.ts
checked: [ai-firewall@339de55, vdb-api@4145f0a, website@ad775f3]
updated: 02 Nov 2026
---

Agent APIs are stateless, so a client sends its full tool list on every turn. The gateway reads that list, records it in the [inventory](/ai-firewall/operations/inventory/), and checks it against capability rules before any content rule runs. Capability rules need the Teams plan.

## The four families

| Family | Rule types | Matches | Actions | Block code |
|---|---|---|---|---|
| Tools | `tool_allow`, `tool_deny` | Every tool name the request declares or shows being called, including flattened local MCP tools and provider built-ins | `flag`, `strip`, `block` | `tool_denied` |
| MCP servers | `mcp_allow`, `mcp_deny` | Remote MCP servers by label. See [MCP servers](/ai-firewall/policy/mcp-servers/). | `flag`, `strip`, `block` | `mcp_denied` |
| Skills | `skill_allow`, `skill_deny` | Skill names from a dispatching `Skill` tool. See [Skills](/ai-firewall/policy/skills/). | `flag`, `block` | `skill_denied` |
| Clients | `client_allow`, `client_deny` | The calling client's canonical name. See [Client identity](/ai-firewall/policy/client-identity/). | `flag`, `block` | `client_denied` |

Patterns are globs: `*` matches any run of characters and everything else is literal, anchored at both ends and case-sensitive. `Bash` matches only `Bash`. See [Glob reference](/ai-firewall/reference/glob-reference/). `redact` is refused for every capability rule; `strip` is its counterpart on this plane.

## Where tool names come from

| Surface | Declared | Invoked |
|---|---|---|
| Anthropic Messages | `tools[].name` (or `type` for a built-in without a name) | `tool_use` blocks in `messages` |
| OpenAI Chat Completions | `tools[].function.name` | `tool_calls` in assistant messages |
| OpenAI Responses | `tools[]` entries; for a `type: mcp` entry, its `allowed_tools` | `function_call`, `mcp_call` and `mcp_list_tools` items |
| Kiro | the tool specifications in the request | tool uses in history |

Names are the client's to choose and change between releases. Read your inventory rather than relying on a list. As a guide:

| Client | Typical tool names |
|---|---|
| Claude Code | `Bash`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Task`, `WebFetch`, `WebSearch`, `Skill`; local MCP as `mcp__<server>__<tool>` |
| Codex CLI | `apply_patch`, `local_shell`, `web_search`; remote MCP as a `type: mcp` tool |
| Cursor | local MCP as `mcp_<server>_<tool>` |

## Deny rules

```bash
vulnetix ai-firewall policy guardrail no-shell \
  --rule-type tool_deny --action flag --pattern Bash --priority 100
```

| Action | Effect on a request that offers `Bash` |
|---|---|
| `flag` | Forwarded unchanged; the match is recorded. |
| `strip` | `Bash` is removed from the `tools` array and the request is forwarded. The model is never offered it. `X-Vulnetix-Firewall-Stripped` reports how many entries were removed. |
| `block` | `403 tool_denied`. |

Deny rules run in ascending priority, and the first `block` stops evaluation.

> [!CAREFUL] A strip on a tool already used in the conversation is a block
> If the conversation history already contains a call to the tool, removing its declaration would leave a `tool_use` with no matching tool, which the provider rejects with a `400` in the middle of the session. The gateway refuses the request with `403 tool_denied` instead. A strip rule therefore applies cleanly to new sessions and refuses sessions that already used the tool.

A tool rule cannot undo what a tool did. `Bash` runs on the developer's machine; the gateway first sees the request that carries its output back. A rule can stop the tool being offered on later turns, and refuse a request whose history shows it was called, so its output never reaches the model.

## Allowlist mode

Any enabled `*_allow` rule switches its family into allowlist mode: a capability in that family that no allow rule matches is treated as a violation. This is the same rule as [model allowlists](/ai-firewall/policy/models/#allowlist-mode).

```bash
vulnetix ai-firewall policy guardrail allow-read \
  --rule-type tool_allow --action block --pattern Read --priority 100
vulnetix ai-firewall policy guardrail allow-grep \
  --rule-type tool_allow --action block --pattern Grep --priority 100
```

With these two rules, a request offering any tool other than `Read` or `Grep` is refused with `403 tool_denied`.

- The action applied to an unlisted capability comes from the **strictest** allow rule in the family (`block`, then `strip`, then `flag`), not the first. Adding a more permissive allow rule never weakens an existing one.
- Explicit deny rules are evaluated before allowlist gaps, so a capability matched by both is reported against the deny rule.
- An allowlist in one family does not affect another. A `tool_allow` rule says nothing about MCP servers, skills or clients.

> [!CAREFUL] Allow rules made in the console only flag
> The console's Allow button stores an allow rule with action `flag`, because its purpose is to switch the family into allowlist mode. An allowlist built only from console rules therefore flags unlisted capabilities and never blocks or strips them. To enforce, add one allow rule in the family with `--action block` or `--action strip` from the CLI or a policy file.

Agent tool lists change between point releases. Run any allowlist at `flag` long enough to see every tool your agents carry before switching it to `block`.

## Governing a local MCP server through its tools

A local (stdio) MCP server never appears on the wire as a server. The client lists its tools and merges them into `tools`, so a local server is governed with a tool rule on its name prefix:

```bash
vulnetix ai-firewall policy guardrail no-jira \
  --rule-type tool_deny --action strip --pattern 'mcp__jira__*' --priority 100
```

Verbs are a useful middle ground: `mcp__*__delete_*` matches every MCP tool whose name starts with `delete_` on any server. It does not match `remove_issue` or `purge_cache`, which is why the baseline's `agent-destructive-mcp-tool` rule flags rather than blocks.

## In the console

The Tool calls tab (`#tools`) lists the tools in the inventory with Deny and Allow buttons, and a form for a pattern. A rule written there is named `Deny <pattern>` or `Allow <pattern>`, at priority 100, enabled. Deny rules can flag, strip or block.

## In a policy file

```yaml
apiVersion: vulnetix.com/v1
kind: AiFirewallPolicy
spec:
  guardrails:
    - name: no-jira
      ruleType: tool_deny
      action: strip
      pattern: mcp__jira__*
      priority: 100
```

## Related

- [MCP servers](/ai-firewall/policy/mcp-servers/)
- [Hold for review](/ai-firewall/policy/hold-for-review/)
- [Rollout and tuning](/ai-firewall/policy/rollout/)
