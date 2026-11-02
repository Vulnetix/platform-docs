---
title: Skills
description: How the gateway reads skill names from a dispatching Skill tool, what skill_allow and skill_deny can and cannot do, and the deterministic alternative of governing the Skill tool itself.
order: 15
sources:
  - ai-firewall/internal/anthropic/capabilities.go
  - ai-firewall/internal/kiro/capabilities.go
  - ai-firewall/internal/policy/capability.go
  - vdb-api/internal/handler/ai_firewall_rules.go
checked: [ai-firewall@339de55, vdb-api@4145f0a]
updated: 02 Nov 2026
---

No request surface has a skills field. The gateway reads skills from a tool named exactly `Skill`, which is how Claude Code (and Kiro) offer them.

| Source | What is read | Inventory source |
|---|---|---|
| A declared tool named `Skill` | The `enum` of the first of the input schema properties `skill`, `name` or `command` that has one | `inferred` |
| A `tool_use` of `Skill` in the conversation | The `skill`, `name` or `command` value of its input | `invoked` |

Skills are read on the Anthropic Messages and Kiro surfaces. OpenAI Chat Completions and Responses requests yield no skills. A client that offers skills some other way produces nothing here.

```json
{ "type": "tool_use", "name": "Skill", "input": { "skill": "deploy" } }
```

## Skill rules

```bash
vulnetix ai-firewall policy guardrail no-deploy-skill \
  --rule-type skill_deny --action block --pattern 'deploy' --priority 103
```

| Action | Effect |
|---|---|
| `flag` | Recorded; forwarded. |
| `block` | `403 skill_denied`. |
| `strip` | Refused at write time. A skill is a value in another tool's schema, so there is nothing to remove. If a stored rule reaches the gateway with `strip`, it is applied as `block`. |

Patterns are globs. The baseline flags skills matching `*deploy*` (`agent-deploy-skill`) and `*shell*` (`agent-shell-skill`) at priorities 103 and 104.

A `skill_allow` rule puts the skill family into allowlist mode. Because declared names are inferred from a schema, an allowlist can refuse a session whose `Skill` tool simply lists one more skill than last week.

## The deterministic control

To guarantee no skill runs, govern the dispatcher, not the skills:

```bash
vulnetix ai-firewall policy guardrail no-skills \
  --rule-type tool_deny --action strip --pattern Skill --priority 100
```

Without the `Skill` tool the model has no route to any skill. A session that has already called `Skill` is refused rather than stripped; see [Tool rules](/ai-firewall/policy/tools/#deny-rules).

## Suggested approach

1. Run with no skill rules and read the skills in the [inventory](/ai-firewall/operations/inventory/).
2. Add `skill_deny` rules at `flag` for skills that should not run, then promote to `block`.
3. When you need a hard guarantee, strip the `Skill` tool and accept that the feature is gone.

## Related

- [Tool rules](/ai-firewall/policy/tools/)
- [Hold for review](/ai-firewall/policy/hold-for-review/)
- [Limitations](/ai-firewall/policy/limitations/)
