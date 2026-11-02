---
title: Custom filters
description: Match your own identifiers (employee ids, account numbers, ticket references, national ids) with a pii_redact or blocked_pattern rule and your own RE2 pattern.
order: 8
sources:
  - ai-firewall/internal/policy/engine.go
  - cli/pkg/aifirewall/policy.go
  - vdb-api/internal/handler/v2_cli_ai_firewall.go
checked: [ai-firewall@339de55, cli@4c8c3b7, vdb-api@4145f0a]
updated: 02 Nov 2026
---

The [built-in detectors](/ai-firewall/policy/redact-pii/#built-in-detectors) know four shapes. Anything specific to your organisation needs a pattern of your own.

A `pii_redact` rule with a pattern uses that pattern **instead of** the built-ins. To keep the built-ins and add your own, create two rules:

```bash
vulnetix ai-firewall policy guardrail redact-pii \
  --rule-type pii_redact --action redact --priority 50

vulnetix ai-firewall policy guardrail redact-employee-ids \
  --rule-type pii_redact --action redact \
  --pattern='\bEMP-[0-9]{6}\b' --priority 51
```

Both redact to `[REDACTED]`. A `blocked_pattern` rule with action `redact` does the same thing; the two types differ only in the empty-pattern default.

## Patterns

Each compiles under RE2.

| Identifier | Pattern | Suggested action |
|---|---|---|
| Employee id `EMP-123456` | `\bEMP-[0-9]{6}\b` | `redact` |
| Account number `ACCT-1234-5678-9012` | `\bACCT-[0-9]{4}-[0-9]{4}-[0-9]{4}\b` | `redact` |
| UK National Insurance number | `\b[A-CEGHJ-PR-TW-Z]{2}[0-9]{6}[A-D]\b` | `redact` |
| Canadian SIN, hyphenated | `\b[0-9]{3}-[0-9]{3}-[0-9]{3}\b` | `redact` |
| Australian TFN, spaced | `\b[0-9]{3} [0-9]{3} [0-9]{3}\b` | `flag` first |
| IBAN | `\b[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}\b` | `redact` |

ServiceNow-style ticket references (usually `flag`: the existence of an incident is less sensitive than its contents):

```text
\b(?:INC|CHG|PRB)[0-9]{7}\b
```

Internal URLs:

```text
(?i)https?://[a-z0-9.-]+\.(?:internal|corp)(?:/\S*)?
```

## Avoiding false positives

- **Anchor on structure, not length.** `\bEMP-[0-9]{6}\b` matches an employee id. `[0-9]{6}` also matches timestamps, port numbers and phone fragments.
- **Use `\b` on both ends.** Without it, `ACCT-[0-9]{4}` matches inside `MY-ACCT-12345678`, and redaction cuts the token in half.
- **Enumerate what you mean.** RE2 has no lookbehind, so "not preceded by `test-`" cannot be written. List the forms you do mean with alternation instead.
- **Use `(?i)` deliberately.** Identifiers with fixed case should not have it.

## Validation

`apply`, the CLI API behind `policy guardrail`, and the console API all compile the pattern when the rule is created and refuse one that fails. Pass `--rule-type` again when you change a pattern with `--uuid`, or the update is not checked. A lookbehind such as `(?<=EMP-)[0-9]{6}` fails with `error parsing regexp: invalid named capture`; a lookahead fails with `invalid or unsupported Perl syntax: (?=`. When `apply` refuses a pattern containing `(?=`, `(?!` or `(?<`, it adds a line saying RE2 has no lookarounds.

## Testing a pattern before it touches traffic

Create the rule at `flag`, then send a sample through the evaluate endpoint. It runs the organisation's full guardrail set against an OpenAI Chat body and returns the decision without calling any provider:

```bash
curl -s "https://guardrails.vulnetix.com/guardrails/$VULNETIX_ORG_ID/v1/evaluate" \
  -H "Authorization: Bearer $VULNETIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"test","messages":[{"role":"user","content":"Ticket for EMP-123456"}]}'
```

```json
{
  "decision": "flag",
  "violations": [
    {
      "policy_uuid": "6a1f0c3d-2e4b-4c7a-9f8e-1d5b3a7c2e90",
      "policy_name": "redact-employee-ids",
      "rule_type": "pii_redact",
      "action": "flag",
      "detail": "PII detected by policy \"redact-employee-ids\""
    }
  ],
  "inspected": 1,
  "body": {"model":"test","messages":[{"role":"user","content":"Ticket for EMP-123456"}]}
}
```

The endpoint always answers `200`; the decision is in the body, and `body` is omitted on a block. It needs the Teams plan to apply guardrails, and with inference logging on it writes a log row under the provider `workers-ai`. Allow up to 30 seconds after saving a rule for the gateway's policy cache to pick it up.

## Related

- [Redact PII](/ai-firewall/policy/redact-pii/)
- [Regex reference](/ai-firewall/reference/regex-reference/)
- [Rollout and tuning](/ai-firewall/policy/rollout/)
