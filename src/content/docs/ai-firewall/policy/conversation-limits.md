---
title: Conversation limits
description: Cap the number of messages a request may carry with a max_messages rule, to stop a runaway agent loop, and what is and is not counted.
order: 10
sources:
  - ai-firewall/internal/policy/engine.go
  - ai-firewall/internal/wire/wire.go
  - ai-firewall/internal/api/handlers.go
  - vdb-api/internal/handler/v2_cli_ai_firewall_baseline.go
checked: [ai-firewall@339de55, vdb-api@4145f0a]
updated: 02 Nov 2026
---

A `max_messages` rule matches a request whose conversation has more messages than its pattern. Each turn of an agent resends the whole conversation, so an agent stuck retrying a failing tool sends ever larger requests until something stops it. This rule is that stop.

```bash
vulnetix ai-firewall policy guardrail cap-conversation \
  --rule-type max_messages \
  --action block \
  --pattern 300 \
  --priority 90
```

A request with 301 messages is refused:

```json
{
  "error": {
    "message": "request blocked by AI firewall policy: message count 301 exceeds limit 300",
    "type": "policy_violation",
    "code": "request_blocked",
    "blocked_by": "cap-conversation"
  }
}
```

The pattern is an integer. `apply` refuses `0`, negatives and non-integers; the API refuses non-integers only, and a cap of `0` or below never matches.

## What is counted

| Surface | Counted |
|---|---|
| Chat Completions, Messages | entries in `messages` |
| Responses | entries in `input`, including function call and output items; a plain string `input` counts as 1 |
| Kiro | history entries plus the current message |

A Responses request that continues a stored conversation with `previous_response_id` carries only the new items, so only those are counted.

Not counted:

- The Anthropic top-level `system` prompt, which is a field rather than a message. The same cap means the same number on every surface.
- Size. One message of several megabytes counts as one. The only size limit is the gateway's 8 MiB request body ceiling, which returns `413 request_too_large`.

There are no token budgets, rate limits or spend caps in the gateway. `max_messages` bounds the shape of a request, not cost.

## Choosing a number

| Traffic | Starting cap | Reason |
|---|---|---|
| Interactive chat | 60 | Ordinary conversations rarely reach it |
| Coding agents | 300 to 400 | A real Claude Code or Codex session can run to hundreds of messages |
| CI and unattended agents | as low as the task allows | Nobody is watching the loop |

The [recommended baseline](/ai-firewall/policy/recommended-baseline/) ships `limit-max-turns` at 200 with action `flag`, priority 90. Flag first, look at the counts your traffic actually reaches, then add a `block` rule at a number above them.

## Priority

Give the cap a high priority number so content rules run first. A block stops evaluation, so a cap at priority 1 refuses a runaway conversation without scanning it, and you lose the record of what the content rules would have matched.

## In a policy file

```yaml
apiVersion: vulnetix.com/v1
kind: AiFirewallPolicy
spec:
  guardrails:
    - name: cap-conversation
      ruleType: max_messages
      action: block
      pattern: "300"
      priority: 90
```

The integer is a string in YAML. Quote it.

## Related

- [Content guardrails](/ai-firewall/policy/guardrails/)
- [Limitations](/ai-firewall/policy/limitations/)
