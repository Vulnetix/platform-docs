---
title: Jurisdictional control
description: "How to hold a vendor or data-residency boundary with provider and model policy, the policy file that writes it down, and the limits: no region pinning and no default-deny."
order: 3
sources:
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/plan/plan.go
  - ai-firewall/terraform/variables.tf
  - cli/pkg/aifirewall/policy.go
  - saas/prisma/migrations/20260713000001_ai_firewall/migration.sql
  - saas/prisma/migrations/20260713000002_ai_firewall_more_providers/migration.sql
checked: [ai-firewall@339de55, cli@4c8c3b7, saas@50cedf3]
updated: 02 Nov 2026
---

The gateway has no region setting. It cannot make inference happen inside a jurisdiction, and it cannot choose a provider's region for you. What it enforces is which vendors your organisation may reach at all, on every request, from every client. That is the lever that decides where your data is processed.

## The limits first

| Limit | Detail |
|---|---|
| No region pinning | No per-request region, no EU-only endpoint, no residency flag |
| The gateway's own location | AWS `ap-southeast-2` (Sydney). Every request passes through it. |
| Default allow | A provider with no policy entry is allowed. There is no switch that denies every provider not listed. |
| Organisation-wide only | One policy per organisation. There is no per-team or per-project policy; use separate organisations. |
| Plan | Provider and model policy are enforced only on Pro and above. On Community the entries are stored and not applied. |

## Deny every provider you have not approved

Because the default is allow, a boundary is a list of denials. Write it in [`.vulnetix/ai-firewall.yaml`](/ai-firewall/reference/policy-file/) so the whole list is reviewed in one diff:

```yaml
apiVersion: vulnetix.com/v1
kind: AiFirewallPolicy
spec:
  baseline:
    enabled: false
  providers:
    - slug: mistral
      action: allow
    - slug: openai
      action: deny
    - slug: anthropic
      action: deny
    - slug: openrouter
      action: deny
    - slug: groq
      action: deny
    - slug: deepseek
      action: deny
    - slug: xai
      action: deny
    - slug: together
      action: deny
    - slug: fireworks
      action: deny
    - slug: alibaba
      action: deny
    - slug: moonshot
      action: deny
    - slug: minimax
      action: deny
    - slug: kiro
      action: deny
```

```bash
vulnetix ai-firewall apply --dry-run
vulnetix ai-firewall apply
```

`baseline.enabled: false` keeps this file to the provider list. Without it, `apply` composes in the [recommended baseline](/ai-firewall/policy/recommended-baseline/), and because guardrails are applied first and need the Teams plan, a Pro organisation's `apply` would stop at the first baseline rule before reaching the providers.

A request to a denied provider is refused before its body is read:

```json
{"error": {"message": "provider openai is denied by organisation policy", "type": "policy_violation", "code": "provider_denied"}}
```

> [!CAREFUL] New providers arrive allowed
> When Vulnetix adds a provider to the catalog it has no entry in your policy, so it is allowed. Re-check the list against `vulnetix ai-firewall get` when the catalog changes. A custom provider your organisation adds is also allowed until denied.

## OpenRouter and other routers

`openrouter` is one provider to the policy, whichever vendor serves the model behind it. Allowing it opens every vendor it fronts. Deny it, or put it in allowlist mode with model policy:

```bash
vulnetix ai-firewall policy model mistralai/mistral-large --provider openrouter --allow
```

The first `allow` entry for a provider makes every other model on that provider `403 model_not_allowed`.

## Narrowing an approved provider

Model policy works the same way on any provider. Allowing one model switches the provider into allowlist mode:

```bash
vulnetix ai-firewall policy model mistral-large-latest --provider mistral --allow
```

See [Models](/ai-firewall/policy/models/).

## Showing that the control works

- `vulnetix ai-firewall status` lists each provider with its policy.
- With [inference logging](/ai-firewall/operations/logs/) on, every refused attempt is a row with `decision: block` and `blockedBy: provider_policy`, and the Govern tab charts them per week.

## What it does not give you

- Control over where an approved provider processes or stores the data. That is the provider's region and contract.
- Protection against an application that calls the provider directly instead of the gateway. `vulnetix ai-firewall status` reports clients whose base URL points elsewhere, on the machine it runs on.

## Related

- [Providers](/ai-firewall/policy/providers/)
- [Provider catalog](/ai-firewall/reference/provider-catalog/)
- [Data handling](/ai-firewall/security/data-handling/)
