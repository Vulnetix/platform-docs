---
title: Recommended baseline
nav: Baseline
description: The 31 guardrails in the server-maintained baseline (version 2026.10.1), which ship disabled, and how apply, the console Blueprints panel and --catalog use them.
order: 12
sources:
  - vdb-api/internal/handler/v2_cli_ai_firewall_baseline.go
  - vdb-site/api/internal/handler/ai_firewall_baseline.go
  - vdb-site/api/internal/handler/data/ai-firewall-baseline.json
  - cli/cmd/ai_firewall_apply.go
  - cli/pkg/aifirewall/baseline.go
  - website/src/components/ai-firewall/GuardrailBlueprints.vue
checked: [vdb-api@4145f0a, vdb-site@1a06d67, cli@4c8c3b7, website@ad775f3]
updated: 02 Nov 2026
---

The baseline is a set of guardrails Vulnetix maintains: secret patterns, prompt-injection phrasing, PII redaction, a runaway-conversation cap and agent capability flags. It is served by the API rather than built into the CLI, so it changes without a CLI release. It contains guardrails only, never provider or model allow and deny entries.

```bash
vulnetix ai-firewall baseline
vulnetix ai-firewall baseline -o json
```

`-o json` prints every rule with its pattern, description, tags and severity.

| Served by | Ref | Version |
|---|---|---|
| `POST /v2/cli.ai-firewall-baseline` (CLI) | `default` or `recommended`; the CLI asks for `recommended`. Any other ref is `404`. | `2026.10.1` |
| `GET /v1/ai-firewall/baseline` (console Blueprints) | `default`, generated from the same list | `2026.10.1` |

## The rules

Priority bands: 10 to 25 secrets and sealed blocks, 30 to 36 injection, 50 to 53 PII, 90 conversation length, 100 to 110 agent capability.

| Id | Name | `ruleType` | `action` | Priority | Enabled |
|---|---|---|---|---|---|
| `secret-private-key` | Private key material | `blocked_pattern` | `block` | 10 | yes |
| `secret-aws-access-key-id` | AWS access key id | `blocked_pattern` | `block` | 11 | yes |
| `secret-aws-secret-access-key` | AWS secret access key | `blocked_pattern` | `block` | 12 | yes |
| `secret-github-token` | GitHub token | `blocked_pattern` | `block` | 13 | yes |
| `secret-github-fine-grained` | GitHub fine-grained token | `blocked_pattern` | `block` | 14 | yes |
| `secret-openai-key` | OpenAI API key | `blocked_pattern` | `block` | 15 | yes |
| `secret-anthropic-key` | Anthropic API key | `blocked_pattern` | `block` | 16 | yes |
| `secret-stripe-key` | Stripe key | `blocked_pattern` | `block` | 17 | yes |
| `secret-slack-token` | Slack token | `blocked_pattern` | `block` | 18 | yes |
| `secret-google-api-key` | Google API key | `blocked_pattern` | `block` | 19 | yes |
| `secret-dsn-with-password` | Connection string with password | `blocked_pattern` | `block` | 20 | yes |
| `injection-delimiter-tampered` | Sealed harness block tampered | `delimiter_integrity` | `block` | 25 | **no** |
| `injection-ignore-instructions` | Prompt injection: instruction override | `blocked_pattern` | `flag` | 30 | yes |
| `injection-system-prompt-exfil` | Prompt injection: system prompt exfiltration | `blocked_pattern` | `flag` | 31 | yes |
| `injection-exfil-to-url` | Prompt injection: exfiltration to a URL | `blocked_pattern` | `flag` | 32 | yes |
| `injection-role-override` | Prompt injection: role override | `blocked_pattern` | `flag` | 33 | yes |
| `injection-developer-mode` | Prompt injection: developer mode | `blocked_pattern` | `flag` | 34 | yes |
| `injection-encoded-payload` | Prompt injection: encoded payload | `blocked_pattern` | `flag` | 35 | yes |
| `injection-delimiter-spoof` | Prompt injection: delimiter spoofing | `blocked_pattern` | `flag` | 36 | **no** |
| `pii-email` | PII: email address | `pii_redact` | `redact` | 50 | yes |
| `pii-credit-card` | PII: payment card number | `pii_redact` | `redact` | 51 | yes |
| `pii-us-ssn` | PII: US social security number | `pii_redact` | `redact` | 52 | yes |
| `pii-phone` | PII: phone number | `pii_redact` | `redact` | 53 | **no** |
| `limit-max-turns` | Runaway conversation | `max_messages` (`200`) | `flag` | 90 | yes |
| `agent-shell-tool` | Shell tool offered to the model | `tool_deny` (`Bash`) | `flag` | 100 | yes |
| `agent-destructive-mcp-tool` | Destructive MCP tool | `tool_deny` (`mcp__*__delete_*`) | `flag` | 101 | yes |
| `agent-remote-mcp-server` | Remote MCP server | `mcp_deny` (`*`) | `flag` | 102 | yes |
| `agent-deploy-skill` | Deployment skill offered or invoked | `skill_deny` (`*deploy*`) | `flag` | 103 | yes |
| `agent-shell-skill` | Shell skill offered or invoked | `skill_deny` (`*shell*`) | `flag` | 104 | yes |
| `agent-curl-client` | curl calling the firewall directly | `client_deny` (`curl`) | `flag` | 105 | yes |
| `agent-known-clients` | Known clients only | `client_allow` (`claude-code`) | `flag` | 110 | **no** |

## Why four ship disabled

| Id | Reason |
|---|---|
| `injection-delimiter-tampered` | It refuses requests, and only means something once your clients take their nonces from the gateway. See [Prompt injection](/ai-firewall/policy/prompt-injection/#sealed-harness-blocks). |
| `injection-delimiter-spoof` | Fires on ordinary source code that contains role tags. |
| `pii-phone` | Also matches version strings and issue ids. |
| `agent-known-clients` | A `client_allow` rule puts the whole client family into allowlist mode, so every client other than `claude-code` would be flagged. Read the [inventory](/ai-firewall/operations/inventory/) first. |

Every other rule flags or blocks from the moment it is applied. The agent capability rules all `flag`: a tool runs on the developer's machine before the gateway sees the request, so these record reach rather than prevent it.

## Taking the baseline

| Route | Behaviour |
|---|---|
| `vulnetix ai-firewall apply` | Composes the baseline into the file's guardrails unless `--no-baseline` or `spec.baseline.enabled: false` |
| Console, Guardrails tab and the capability tabs | Blueprints panel: Add one rule, or Add all the organisation does not already have |
| `vulnetix ai-firewall export` | Writes `spec.baseline.enabled: false`, so re-applying a snapshot adds nothing |

Composition rules in `apply`:

1. A file guardrail with the same **name** as a baseline rule replaces it. To change a baseline rule, redefine it in the file under its baseline name, for example `name: "PII: phone number"` with `enabled: true`.
2. `spec.baseline.exclude` drops rules by **id**, for example `pii-phone`.
3. Every pattern is validated first. One invalid rule rejects the whole baseline: `apply` continues with the file's own rules and says so in the plan, unless `--baseline-required` is set, in which case it fails.
4. Composed rules keep their baseline priority and `enabled` value.

```yaml
apiVersion: vulnetix.com/v1
kind: AiFirewallPolicy
spec:
  baseline:
    enabled: true
    ref: recommended
    exclude:
      - agent-curl-client
  guardrails:
    - name: "PII: phone number"
      ruleType: pii_redact
      action: redact
      pattern: '\b(?:\+?\d{1,2}[ .\-]?)?\(?\d{3}\)?[ .\-]?\d{3}[ .\-]?\d{4}\b'
      priority: 53
      enabled: true
```

When the server cannot serve a baseline, `apply` prints the reason in the plan's Baseline line and carries on with the file alone, exiting 0. Pass `--baseline-required` in CI so that case fails instead.

## Using your own set

`--catalog <file>` replaces the server's baseline with a local JSON or YAML file in the same shape, for both `baseline` and `apply`:

```yaml
version: "2026.11.1"
ref: acme
guardrails:
  - id: acme-employee-id
    name: "ACME: employee id"
    description: Redacts ACME employee ids.
    ruleType: pii_redact
    action: redact
    pattern: '\bEMP-[0-9]{6}\b'
    priority: 55
    enabled: true
    tags: [pii]
    severity: medium
```

`id` and `name` are required, ids must be unique, and every rule is validated like a policy file guardrail. A file whose name ends in `.json` is parsed as JSON, anything else as YAML. `ref` defaults to `local`.

## Related

- [Policy file reference](/ai-firewall/reference/policy-file/#specbaseline)
- [Policy as code with apply and export](/ai-firewall/cli/policy-file-workflow/)
- [Block secrets](/ai-firewall/policy/block-secrets/)
