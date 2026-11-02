---
title: Model allow and deny
nav: Models
description: Allow or deny individual models per provider or across every provider, how the first allow entry switches a provider into allowlist mode, and how model names are matched.
order: 3
sources:
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/db/policy.go
  - cli/cmd/config_ai_firewall.go
  - cli/pkg/aifirewall/checks.go
  - vdb-api/internal/handler/v2_cli_ai_firewall.go
  - vdb-site/api/internal/handler/ai_firewall_models.go
  - website/src/components/ai-firewall/govern-model.ts
checked: [ai-firewall@339de55, vdb-api@4145f0a, vdb-site@1a06d67, cli@4c8c3b7, website@ad775f3]
updated: 02 Nov 2026
---

Model policy is a list of `allow` and `deny` entries, each tied to one model at one provider. It runs after [provider policy](/ai-firewall/policy/providers/) and before any guardrail, and it needs the Pro plan.

```bash
# Deny one model wherever the catalog lists it
vulnetix ai-firewall policy model gpt-4o --deny --any-provider

# Allow one model at one provider
vulnetix ai-firewall policy model gpt-4o-mini --allow --provider openai

# Remove an entry
vulnetix ai-firewall policy model gpt-4o-mini --remove --provider openai
```

Pass exactly one of `--allow`, `--deny`, `--remove`, and exactly one of `--provider <slug>` or `--any-provider`. Removing an entry is not plan-gated.

## Allowlist mode

> [!CAREFUL] The first allow entry changes what every other model at that provider does
> With no entries, every model the provider offers passes. With only `deny` entries, everything passes except the denied models. As soon as one `allow` entry exists for a provider, that provider is in allowlist mode: only allowed models pass, and every other model returns `403 model_not_allowed`. There is no separate switch.

| Entries for the provider | Requested model has | Result |
|---|---|---|
| none | | passes |
| only `deny` | no entry | passes |
| any | `deny` | `403 model_denied` |
| at least one `allow` | `allow` | passes |
| at least one `allow` | no entry | `403 model_not_allowed` |

The console's Govern tab shows each model's state with the same rules: Open, Allowed, Denied, "Refused: not on allowlist" and "Refused: provider denied".

Deleted catalog rows still count: a `deny` stays in force for a model the provider has delisted, and an allowlist made only of delisted models still puts the provider in allowlist mode.

## Refusals

```json
{
  "error": {
    "message": "model gpt-4o is not in the organisation allowlist",
    "type": "policy_violation",
    "code": "model_not_allowed"
  }
}
```

```json
{
  "error": {
    "message": "model gpt-4o is denied by organisation policy",
    "type": "policy_violation",
    "code": "model_denied"
  }
}
```

A request with no `model` field returns `400 model is required` at every plan. With logging on, a model refusal is logged with `blockedBy: model_policy`.

## Model names

The gateway compares the `model` string from the request with the catalog slug exactly, case included. Use the provider's own name for the model:

| Provider | Model string |
|---|---|
| `openai` | `gpt-4o-mini` |
| `openrouter` | `openai/gpt-4o-mini` |
| `anthropic` | `claude-sonnet-4-5` |

An entry for `gpt-4o-mini` at `openrouter` matches nothing, because OpenRouter calls it `openai/gpt-4o-mini`.

## Entries need a catalog row

An entry points at a row in the model catalog, which vdb-manager syncs from each provider hourly. Adding an entry for a model the catalog does not list fails with `404 no matching model in the catalog; catalogs sync hourly`, in the CLI and the console alike.

At request time a model missing from the catalog passes, unless the provider is in allowlist mode. A model released this morning therefore works before the next sync, and a deny list cannot block a model that does not exist in the catalog yet. Only allowlist mode does.

## `--any-provider`

The same model is often reachable through several providers. `--any-provider` (or `anyProvider: true` in a policy file) writes one entry for every active catalog row with that slug, across every built-in provider and the tenant's own custom providers. It is resolved when you run it: a provider that starts listing the model later is not covered until you run it again.

Because the slug must match exactly, `--any-provider gpt-4o` does not cover OpenRouter's `openai/gpt-4o`. Deny that one separately.

## Checking a pinned model locally

`vulnetix ai-firewall install --model <m>` and `vulnetix ai-firewall snippet --model <m>` refuse a model the policy would reject, and `vulnetix ai-firewall status` reports `model_denied` or `model_not_allowed` for any client config that pins one. See [Status and checks](/ai-firewall/cli/status-and-checks/).

## In a policy file

```yaml
apiVersion: vulnetix.com/v1
kind: AiFirewallPolicy
spec:
  models:
    - slug: gpt-4o-mini
      provider: openai
      action: allow
    - slug: claude-sonnet-4-5
      provider: anthropic
      action: allow
    - slug: gpt-4o
      anyProvider: true
      action: deny
```

Removing a line from `spec.models` only removes the server entry when you apply with `--prune`. See [Policy file reference](/ai-firewall/reference/policy-file/#specmodels).

## Related

- [The models endpoint](/ai-firewall/policy/models-endpoint/)
- [Providers](/ai-firewall/policy/providers/)
- [Provider catalog](/ai-firewall/reference/provider-catalog/)
