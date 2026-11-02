---
title: Block secrets
description: Refuse requests that carry credentials, keys or connection strings with blocked_pattern rules, starting from the baseline's secret patterns.
order: 6
sources:
  - ai-firewall/internal/policy/engine.go
  - vdb-api/internal/handler/v2_cli_ai_firewall_baseline.go
  - cli/cmd/config_ai_firewall.go
checked: [ai-firewall@339de55, vdb-api@4145f0a, cli@4c8c3b7]
updated: 02 Nov 2026
---

A secret in a prompt is a `blocked_pattern` rule with action `block`. The request is refused with `403 request_blocked`, the error names the rule, and nothing reaches the provider.

```bash
vulnetix ai-firewall policy guardrail "Private key material" \
  --rule-type blocked_pattern \
  --action block \
  --pattern='-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----' \
  --priority 10
```

Use `--pattern=VALUE` for patterns that start with `-`, so the value is never read as a flag.

## Block, not redact

For a credential, `block` is the right action. `redact` forwards the request with `[REDACTED]` in place of the key, so the developer gets a confusing answer and no signal that a rule fired. A block names the rule in the error, so the developer learns the policy exists at the moment it matters. Keep `redact` for data the model does not need, such as [personal data](/ai-firewall/policy/redact-pii/).

## The baseline already covers the common secrets

The [recommended baseline](/ai-firewall/policy/recommended-baseline/) ships eleven secret rules at priorities 10 to 20, all `block` and enabled. `vulnetix ai-firewall apply` composes them in by default; the console adds them from the Blueprints panel.

| Baseline id | Matches |
|---|---|
| `secret-private-key` | PEM private key headers |
| `secret-aws-access-key-id` | `AKIA`, `ASIA`, `ABIA`, `ACCA` and `A3T` key ids |
| `secret-aws-secret-access-key` | A 40-character secret next to an `aws_secret_access_key` name |
| `secret-github-token` | `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_` tokens |
| `secret-github-fine-grained` | `github_pat_` tokens |
| `secret-openai-key` | `sk-` and `sk-proj-` keys |
| `secret-anthropic-key` | `sk-ant-` keys |
| `secret-stripe-key` | `sk_live_`, `sk_test_`, `rk_live_`, `rk_test_` keys |
| `secret-slack-token` | `xoxa-`, `xoxb-`, `xoxp-`, `xoxo-`, `xoxs-`, `xoxr-` tokens |
| `secret-google-api-key` | `AIza` keys |
| `secret-dsn-with-password` | `postgres`, `postgresql`, `mysql`, `mongodb`, `mongodb+srv`, `redis`, `amqp` URLs with `user:password@` |

Add your own rules for anything the baseline does not cover. Give them priorities below 50 so they run before the baseline's PII redaction rules.

## More patterns

Each compiles under RE2. Test each one at `flag` against your own traffic before switching it to `block`.

GitLab personal access token, `block`:

```text
\bglpat-[A-Za-z0-9_-]{20,}\b
```

npm access token, `block`:

```text
\bnpm_[A-Za-z0-9]{36}\b
```

Azure storage account key, `block`:

```text
(?i)AccountKey=[A-Za-z0-9+/=]{60,}
```

JSON Web Token, `flag` (documentation and tests are full of example tokens):

```text
\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+
```

A secret-looking assignment, `flag`:

```text
(?i)\b(?:api[_-]?key|secret|password|token)\s*[:=]\s*["']?[A-Za-z0-9/+_-]{20,}
```

Internal hostnames, `flag` (change the suffixes to your own):

```text
(?i)\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:internal|corp|intranet)\b
```

## Ordering several rules

Rules run in ascending priority and a block stops evaluation, so put the highest-confidence rules first:

```bash
vulnetix ai-firewall policy guardrail no-gitlab-tokens \
  --rule-type blocked_pattern --action block \
  --pattern='\bglpat-[A-Za-z0-9_-]{20,}\b' --priority 21

vulnetix ai-firewall policy guardrail flag-internal-hosts \
  --rule-type blocked_pattern --action flag \
  --pattern='(?i)\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:internal|corp|intranet)\b' --priority 40
```

The same rules in a policy file:

```yaml
apiVersion: vulnetix.com/v1
kind: AiFirewallPolicy
spec:
  guardrails:
    - name: no-gitlab-tokens
      ruleType: blocked_pattern
      action: block
      pattern: '\bglpat-[A-Za-z0-9_-]{20,}\b'
      priority: 21
    - name: flag-internal-hosts
      ruleType: blocked_pattern
      action: flag
      pattern: '(?i)\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:internal|corp|intranet)\b'
      priority: 40
```

## Porting from a secret scanner

Scanner rules often use PCRE lookarounds, which RE2 does not support. The CLI and both APIs refuse such a pattern with `pattern does not compile`; drop the lookaround and match the surrounding text instead. See [Regex reference](/ai-firewall/reference/regex-reference/).

The gateway is the last control, not the first. Scan repositories with [`vulnetix scan`](/secrets/) so secrets are caught before anyone pastes them.

## Related

- [Content guardrails](/ai-firewall/policy/guardrails/)
- [Rollout and tuning](/ai-firewall/policy/rollout/)
- [Recommended baseline](/ai-firewall/policy/recommended-baseline/)
