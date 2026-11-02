---
title: AiFirewallPolicy
description: Summary of the AI firewall policy file, .vulnetix/ai-firewall.yaml, the one config document a tool applies today. The full reference is in the AI Firewall segment.
order: 20
sources: [cli/pkg/aifirewall/policy.go, cli/cmd/ai_firewall_apply.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

`AiFirewallPolicy` describes an organization's AI firewall policy: provider allow and deny, model allow and deny lists, guardrails, the recommended baseline and logging. It is the file `.vulnetix/ai-firewall.yaml`, which `vulnetix ai-firewall apply` reconciles. The full reference, with every field and rule type, is in the [AI Firewall](/ai-firewall/) segment.

```yaml
apiVersion: vulnetix.com/v1
kind: AiFirewallPolicy
metadata:
  org: 00000000-0000-0000-0000-000000000000
spec:
  baseline:
    enabled: true
  providers:
    - slug: openai
      action: allow
      key:
        fromEnv: OPENAI_API_KEY
  models:
    - slug: openai/gpt-4o
      provider: openai
      action: allow
  guardrails:
    - name: no-shell
      ruleType: tool_deny
      action: block
      pattern: Bash
```

| | |
|---|---|
| File | `.vulnetix/ai-firewall.yaml` |
| Apply | `vulnetix ai-firewall apply [-f <file>] [--dry-run] [--prune]` |
| Export | `vulnetix ai-firewall export [-f <file>] [--stdout] [--force]` |
| Schema | None in `config-schemas` yet. The CLI validates the file itself before applying it. |

## spec at a glance

| Key | Holds |
|---|---|
| `prune` | `true` lets apply delete server objects the file does not mention. Same as `--prune`. |
| `settings.logsEnabled` | Whether request logs are kept. |
| `baseline` | `enabled`, `ref` and `exclude`: the server's recommended guardrails, composed in unless you turn them off. |
| `providers[]` | `slug`, `action` (`allow`, `deny`, `default`) and `key.fromEnv` or `key.fromFile`. The key itself is never in the file. |
| `models[]` | `slug`, `provider` or `anyProvider: true`, and `action` (`allow`, `deny`). |
| `guardrails[]` | `name`, `ruleType`, `action` (`block`, `redact`, `strip`, `flag`), `pattern`, `priority`, `enabled`, `baselineId`. |

## How apply behaves

- **Order.** Guardrails, then models, then providers, then keys, then settings, so tightening a policy never passes through a moment where a provider is on and its guardrails are not.
- **Org guard.** If `metadata.org` is set and does not match the authenticated organization, apply refuses. `--force` overrides.
- **Drift.** Guardrails and model entries on the server that the file does not mention are reported and left alone, unless you prune.
- **Dry run.** `--dry-run` prints the plan and changes nothing.
- **Export.** `export` writes the live policy with the baseline pinned off, so applying an export is a no-op. Provider keys are never exported.

> [!WHY] The file works in both places
> A file is a Platform IaC document by its content, not its folder. `AiFirewallPolicy` is a `vulnetix.com/v1` kind the CLI has known since v3.157.0, so `vulnetix config validate` accepts `.vulnetix/ai-firewall.yaml` (since v3.164.0) and the same document under `.vulnetix/config`. Define it in one of them. `plan` and `apply` read `.vulnetix/config` only until v4, so name the well-known file with `-f` to plan it now. See [Which files are Platform IaC documents](/platform-iac/cli/validate/#which-files-are-platform-iac-documents).
