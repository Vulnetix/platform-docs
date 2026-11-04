---
title: Redact PII
description: Rewrite personal data out of a prompt with a pii_redact rule, what the four built-in detectors match, and how redaction interacts with other rules and caching.
order: 7
sources:
  - ai-firewall/internal/policy/engine.go
  - ai-firewall/internal/api/headers.go
  - vdb-api/internal/handler/v2_cli_ai_firewall_baseline.go
checked: [ai-firewall@339de55, vdb-api@4145f0a]
updated: 02 Nov 2026
---

Redaction is for data the model does not need to do the job. A `pii_redact` rule with action `redact` replaces each match with the literal `[REDACTED]` and forwards the request.

```bash
vulnetix ai-firewall policy guardrail redact-pii \
  --rule-type pii_redact \
  --action redact \
  --priority 50
```

With no `--pattern`, the rule uses the built-in detectors. Sent:

```text
Draft a follow-up to jane.doe@example.com, card 4242 4242 4242 4242, SSN 123-45-6789.
```

Forwarded:

```text
Draft a follow-up to [REDACTED], card [REDACTED], SSN [REDACTED].
```

## Built-in detectors

An empty pattern runs these four, in this order, over every inspected text unit. Each detector sees the output of the one before.

| Detects | Pattern |
|---|---|
| Email address | `[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}` |
| Card-like number | `\b(?:\d[ -]*?){13,16}\b` |
| US Social Security number | `\b\d{3}-\d{2}-\d{4}\b` |
| Phone number | `\b(?:\+?\d{1,2}[ .\-]?)?\(?\d{3}\)?[ .\-]?\d{3}[ .\-]?\d{4}\b` |

These match shapes. The card detector has no Luhn check, so long order numbers and numeric ids match it. The phone detector is North American in shape: it misses most international formats and matches some version strings and issue numbers. Names and postal addresses are not detected at all. If a requirement says no personal data may reach the provider, these four patterns do not meet it alone.

> [!CAREFUL] The baseline's PII rules are not the built-in detectors
> The [recommended baseline](/ai-firewall/policy/recommended-baseline/) ships four separate `pii_redact` rules (`pii-email`, `pii-credit-card`, `pii-us-ssn`, `pii-phone`), each with its own pattern. Its card pattern accepts 13 to 19 digits, where the built-in accepts 13 to 16, and `pii-phone` ships disabled. A rule with an empty pattern runs all four built-ins, phone included.

## Actions

| Action | Effect |
|---|---|
| `redact` | Matches become `[REDACTED]`; the request is forwarded. |
| `flag` | The match is recorded; the text is forwarded unchanged. |
| `block` | `403 request_blocked`; nothing is forwarded. |

There is one placeholder, `[REDACTED]`, for every detector and custom pattern. The model cannot tell an email from a card number after redaction.

## The client sees a normal answer

A redacted request is forwarded and the client gets the provider's ordinary `200`. The gateway adds `X-Vulnetix-Firewall-Decision: redact`, `X-Vulnetix-Firewall-Redactions: <count>` and `X-Vulnetix-Firewall-Rules: <names>` to the response, but most chat and agent clients never show headers. Tell developers which rules redact, or they will read the result as the model being unhelpful.

## Ordering with block rules

A redaction rewrites the request in place, and rules at a higher priority number see the rewritten text. To let a redaction defuse a block, give it the lower number:

```bash
vulnetix ai-firewall policy guardrail redact-pii \
  --rule-type pii_redact --action redact --priority 50

vulnetix ai-firewall policy guardrail no-customer-domain \
  --rule-type blocked_pattern --action block \
  --pattern='(?i)@customer\.example\b' --priority 60
```

Here an address at `customer.example` is redacted at priority 50, so the block at 60 never sees it. Swap the numbers and the block wins.

## Prompt caching

Redaction changes the request text. When it fires inside a prefix the provider has cached, the prefix no longer matches and the turn is billed at the uncached rate. Coding agents such as Claude Code resend a long cached prefix every turn, so a broad redaction that matches inside it costs money on every turn. Keep redaction rules on agent traffic narrow.

## In a policy file

```yaml
apiVersion: vulnetix.com/v1
kind: AiFirewallPolicy
spec:
  guardrails:
    - name: redact-pii
      ruleType: pii_redact
      action: redact
      pattern: ""
      priority: 50
```

## Related

- [Custom filters](/ai-firewall/policy/custom-filters/)
- [Block secrets](/ai-firewall/policy/block-secrets/)
- [Response headers](/ai-firewall/reference/headers/)
