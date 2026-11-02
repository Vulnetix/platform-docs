---
title: Content guardrails
nav: Guardrails
description: The four content rule types, the actions each accepts, what text the gateway inspects, how rules are ordered, and what a blocked request returns.
order: 5
sources:
  - ai-firewall/internal/policy/engine.go
  - ai-firewall/internal/wire/wire.go
  - ai-firewall/internal/api/codec.go
  - ai-firewall/internal/api/headers.go
  - ai-firewall/internal/db/policy.go
  - cli/cmd/config_ai_firewall.go
  - vdb-api/internal/handler/ai_firewall_rules.go
  - vdb-api/internal/handler/v2_cli_ai_firewall.go
  - vdb-site/api/internal/handler/ai_firewall_guardrails.go
  - website/src/components/ai-firewall/guardrails-model.ts
checked: [ai-firewall@339de55, vdb-api@4145f0a, vdb-site@1a06d67, cli@4c8c3b7, website@ad775f3]
updated: 02 Nov 2026
---

A content guardrail is a rule matched against the text of every request the gateway proxies, on every surface (Chat Completions, Responses, Messages, Kiro) and from every client. Guardrails need the Teams plan. Capability rules, which govern tools, MCP servers, skills and clients, live in the same table and are covered from [Tools](/ai-firewall/policy/tools/) onwards.

## Rule types

| `ruleType` | Console label | `pattern` | Matches when |
|---|---|---|---|
| `blocked_pattern` | Blocked pattern | Go RE2 regex, required | any inspected text unit matches |
| `pii_redact` | PII redaction | RE2 regex, or empty for the built-in detectors | the pattern, or any built-in detector, matches |
| `max_messages` | Max messages | positive integer | the conversation has more messages than the integer |
| `delimiter_integrity` | Delimiter integrity | must be empty | a sealed harness block fails its integrity check |

## Actions by rule type

| `ruleType` | `block` | `redact` | `flag` |
|---|---|---|---|
| `blocked_pattern` | `403 request_blocked` | each match becomes `[REDACTED]` | recorded |
| `pii_redact` | `403 request_blocked` | each match becomes `[REDACTED]` | recorded, text unchanged |
| `max_messages` | `403 request_blocked` | accepted, but nothing is rewritten; the request is still reported as `redact` | recorded |
| `delimiter_integrity` | `403 delimiter_tampered` | refused at write time | recorded |

`strip` is refused for every content rule (`action "strip" removes an entry from the request, so it cannot be used with blocked_pattern`). A guardrail created without an action is stored as `flag`.

## Evaluation

- Only enabled rules run. A disabled rule stays stored.
- Content rules run after every capability rule and after hold for review.
- Within the content plane, rules run in ascending `priority`, ties broken by name.
- A `block` stops evaluation. No later rule runs and nothing is forwarded.
- A `redact` rewrites the request in place. Later rules see `[REDACTED]`, not the original text, so a redaction at a lower priority number can defuse a block that would otherwise have matched the same text.
- A rule whose pattern does not compile is skipped. `apply` and both APIs refuse such a pattern when the rule is created; an update that sends a pattern without its rule type is not checked. See [Regex reference](/ai-firewall/reference/regex-reference/#validation).

Priority defaults to `100` when a rule is created in the console or with `vulnetix ai-firewall policy guardrail` without `--priority`. A rule in a policy file without `priority` is stored at `0`. Priority must be 0 or more.

## What is inspected

The gateway splits the request into text units: the Anthropic top-level system prompt, and each message. A unit's text is every textual span inside it, joined by newlines.

| Inspected | Not inspected |
|---|---|
| System prompts and developer messages | The model's response, streamed or not |
| User and assistant message text | Arguments the model generates for a tool call |
| Multi-part text content | Images, documents and other non-text parts |
| Tool results: file contents, command output and fetched pages an agent sends back | Request headers |
| `POST /v1/messages/count_tokens` bodies, screened like an inference | |

Each request's inference log row records `inspected`, the number of text units read. A request that parses but exposes nothing to inspect shows `0`.

`max_messages` counts messages, not text units, so the Anthropic system prompt is not counted. See [Conversation limits](/ai-firewall/policy/conversation-limits/).

## A blocked request

`403`, in the dialect of the route. OpenAI shape:

```json
{
  "error": {
    "message": "request blocked by AI firewall policy: content matched pattern for policy \"no-connection-strings\"",
    "type": "policy_violation",
    "code": "request_blocked",
    "blocked_by": "no-connection-strings",
    "violations": [
      {
        "policy_uuid": "0f8c2a6e-4b1d-4f7e-9a3c-5d2e1b7c9f40",
        "policy_name": "no-connection-strings",
        "rule_type": "blocked_pattern",
        "action": "block",
        "detail": "content matched pattern for policy \"no-connection-strings\""
      }
    ]
  }
}
```

The Anthropic shape wraps the same fields as `{"type": "error", "error": {"type": "permission_error", ...}}`. `violations` lists every rule that matched before the block, including flags and redactions. It never contains the matched text.

## A request that passes

A flagged or redacted request is forwarded and answered normally. The response headers say what happened:

| Header | Value |
|---|---|
| `X-Vulnetix-Firewall-Decision` | `allow`, `flag` or `redact` |
| `X-Vulnetix-Firewall-Rules` | Names of the matched rules, percent-encoded and comma-separated, at most 8 names and 512 bytes |
| `X-Vulnetix-Firewall-Redactions` | Number of redacting matches, when above 0 |

Most clients do not show response headers, so a developer whose prompt was redacted sees only an answer about `[REDACTED]` text. Tell people which rules redact.

## Creating a rule

```bash
vulnetix ai-firewall policy guardrail no-connection-strings \
  --rule-type blocked_pattern \
  --action flag \
  --pattern='(?i)\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp)://[^\s:@/]+:[^\s@/]+@' \
  --priority 20
```

The positional argument is the rule's name. Without `--uuid` the command always creates a new rule; it does not look the name up, so running it twice creates two rules. To change an existing rule, pass its UUID from `vulnetix ai-firewall get -o json`:

```bash
vulnetix ai-firewall policy guardrail no-connection-strings \
  --uuid 0f8c2a6e-4b1d-4f7e-9a3c-5d2e1b7c9f40 --action block

vulnetix ai-firewall policy guardrail no-connection-strings \
  --uuid 0f8c2a6e-4b1d-4f7e-9a3c-5d2e1b7c9f40 --delete
```

An update sends only the flags you pass, plus the name. Every flag is listed on [Commands](/ai-firewall/cli/commands/). In a policy file, rules are matched by name instead; see [Policy file reference](/ai-firewall/reference/policy-file/#specguardrails).

The console's Guardrails tab (`#guardrails`) creates and edits the four content rule types, and its Blueprints panel adds rules from the [recommended baseline](/ai-firewall/policy/recommended-baseline/) one at a time or all at once.

## Pages in this section

| Task | Page |
|---|---|
| Stop credentials leaving in a prompt | [Block secrets](/ai-firewall/policy/block-secrets/) |
| Rewrite personal data out of a prompt | [Redact PII](/ai-firewall/policy/redact-pii/) |
| Match your own identifiers | [Custom filters](/ai-firewall/policy/custom-filters/) |
| Flag injection attempts and verify sealed blocks | [Prompt injection](/ai-firewall/policy/prompt-injection/) |
| Stop runaway agent loops | [Conversation limits](/ai-firewall/policy/conversation-limits/) |
| Write RE2 patterns | [Regex reference](/ai-firewall/reference/regex-reference/) |
| Move a rule from flag to block safely | [Rollout and tuning](/ai-firewall/policy/rollout/) |
| Know what guardrails cannot do | [Limitations](/ai-firewall/policy/limitations/) |
