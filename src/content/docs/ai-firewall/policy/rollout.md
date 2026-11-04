---
title: Rollout and tuning
description: Move content and capability rules from flag to redact, strip or block without breaking developers, and narrow a rule that fires on legitimate work.
order: 17
sources:
  - ai-firewall/internal/policy/engine.go
  - ai-firewall/internal/policy/capability.go
  - ai-firewall/internal/api/headers.go
  - ai-firewall/internal/api/evaluate.go
  - cli/cmd/config_ai_firewall.go
  - cli/pkg/aifirewall/checks.go
checked: [ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

A rule that blocks legitimate work gets the firewall switched off. Every new rule starts at `flag`.

| Rung | Content rules | Capability rules | What happens |
|---|---|---|---|
| 0 | | read the [inventory](/ai-firewall/operations/inventory/) | Learn which tools, MCP servers, skills and clients your agents carry. Nothing is enforced. |
| 1 | `flag` | `flag` | Matches are recorded; nothing changes. |
| 2 | `redact` | `strip` | The match is rewritten or removed; the request is forwarded. |
| 3 | `block` | `block` | The request is refused with `403`. |

`flag` is also a valid place to stop. Use it for behaviour you want to see but cannot yet describe precisely enough to enforce.

## Rung 0: the inventory

For capability rules, wait a week or two before writing anything:

```bash
vulnetix ai-firewall inventory
vulnetix ai-firewall inventory --kind mcp_server
```

A tool rule written from a guess removes a capability from someone in the middle of a task. One written from the list of what is actually carried does not.

## Rung 1: flag

```bash
vulnetix ai-firewall policy guardrail no-connection-strings \
  --rule-type blocked_pattern --action flag \
  --pattern='(?i)\b(?:postgres|mysql)://[^\s:@/]+:[^\s@/]+@' --priority 20
```

A flag records **that** a rule matched and which rule. It never records **what** matched. Where to see the matches:

| Where | Needs | Shows |
|---|---|---|
| Inference logs and the Guardrails tab's activity chart | [Inference logging](/ai-firewall/operations/logs/) on (Pro) | Each request's decision, `blockedBy` and the `violations` list |
| Response headers | nothing | `X-Vulnetix-Firewall-Decision: flag` and `X-Vulnetix-Firewall-Rules` on that response |
| The evaluate endpoint | nothing beyond Business | The decision and violations for a sample request you send |

Test a rule against a sample without calling a provider:

```bash
curl -s "https://guardrails.vulnetix.com/guardrails/$VULNETIX_ORG_ID/v1/evaluate" \
  -H "Authorization: Bearer $VULNETIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"test","messages":[{"role":"user","content":"why does postgres://svc:hunter2@db.internal:5432/prod time out?"}]}'
```

The answer is always `200`, with `decision`, `violations` and, unless blocked, the rewritten `body`. Allow 30 seconds after a rule change before testing, for the gateway's policy cache.

## Rung 2 and 3: promote

Look at the volume after a week:

| Fires | Meaning | Next step |
|---|---|---|
| never | Nothing does this, or the pattern is wrong | Test it with the evaluate endpoint |
| occasionally | The expected shape | Promote |
| constantly | False positives, or a bigger real problem | Find out which before promoting; see [Tuning](#tuning) |

Promote by changing the action on the existing rule. Take the UUID from `vulnetix ai-firewall get -o json`:

```bash
vulnetix ai-firewall policy guardrail no-connection-strings \
  --uuid 0f8c2a6e-4b1d-4f7e-9a3c-5d2e1b7c9f40 --action block
```

In a policy file, the promotion is a one-line diff reviewed like any other change:

```yaml
    - name: no-connection-strings
      ruleType: blocked_pattern
      action: block
      pattern: '(?i)\b(?:postgres|mysql)://[^\s:@/]+:[^\s@/]+@'
      priority: 20
```

```bash
vulnetix ai-firewall apply --dry-run
vulnetix ai-firewall apply
```

For capability rules, prefer `strip` to `block`. The model is never offered the tool and the developer keeps working with one capability fewer, where `block` makes every request from that configuration fail until the tool is removed locally. A strip on a tool the conversation has already called is applied as a block; see [Tool rules](/ai-firewall/policy/tools/#deny-rules).

An allowlist (`*_allow`) is a bigger step than a deny rule, because one allow rule puts the whole family into allowlist mode. Run any allowlist at `flag` for longer than seems necessary: agent tool lists change between point releases.

## Tell developers

A block names the rule in its error, so the developer learns the policy exists when it matters. A redaction or strip is silent in most clients: the developer sees an answer about `[REDACTED]` text, or an agent apologising that it cannot do something. Announce which rules redact and strip.

## Tuning

There is no exception list. A rule cannot exempt a phrase, user, repository, model or client. These are the tools you have:

### Narrow the pattern

| Instead of | Write | Why |
|---|---|---|
| `[0-9]{9}` | `\bEMP-[0-9]{6}\b` | Anchor on structure, not length |
| `(?i)postgres://\S+` | `(?i)\bpostgres://[^\s:@/]+:[^\s@/]+@` | Require the part that makes it dangerous, here a password |
| `ACCT-[0-9]{4}` | `\bACCT-[0-9]{4}\b` | Word boundaries stop matches inside longer tokens |
| a lookbehind such as `(?<!test-)key` | an alternation of the forms you mean | RE2 has no lookarounds |

### Reorder with priority

A `redact` rewrites the request before later rules see it. If a block fires on text a redaction would make harmless, give the redaction the lower priority number. See [Redact PII](/ai-firewall/policy/redact-pii/#ordering-with-block-rules).

### Step down

Demote a noisy rule to `flag` rather than deleting it. You keep the signal and stop the disruption.

### Where false positives come from

| Rules | Why they are noisy |
|---|---|
| Prompt-injection phrases | Security teams discuss injection every day. Consider leaving these at `flag` permanently. |
| JWT and token shapes | Documentation, tests and tutorials are full of example tokens. |
| The built-in card detector | Any 13 to 16 digit run matches; there is no Luhn check. |
| `pii-phone` | Version strings and issue ids match. It ships disabled for this reason. |

When the string you must not leak is genuinely indistinguishable from one people use legitimately, the choice is between accepting the false positives, running the rule at `flag` as a detection, and fixing the upstream reason the identifier keeps appearing in prompts.

## Related

- [Content guardrails](/ai-firewall/policy/guardrails/)
- [Tool rules](/ai-firewall/policy/tools/)
- [Regex reference](/ai-firewall/reference/regex-reference/)
- [Logs](/ai-firewall/operations/logs/)
