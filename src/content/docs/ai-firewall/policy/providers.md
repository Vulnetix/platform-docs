---
title: Provider allow and deny
nav: Providers
description: Allow, deny or clear an upstream provider for the organisation, what each state does at request time, and how to add an organisation-owned compatible provider.
order: 2
sources:
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/db/policy.go
  - cli/cmd/config_ai_firewall.go
  - vdb-api/internal/handler/v2_cli_ai_firewall.go
  - vdb-site/api/internal/handler/ai_firewall.go
  - vdb-site/api/internal/handler/ai_firewall_providers.go
  - vdb-site/api/internal/handler/ai_firewall_provider_validate.go
checked: [ai-firewall@339de55, vdb-api@4145f0a, vdb-site@1a06d67, cli@4c8c3b7]
updated: 02 Nov 2026
---

Provider policy decides which upstream vendors the organisation may reach through the gateway. It is checked before the request body is read, so a denied provider never sees the request and costs nothing to enforce.

```bash
vulnetix ai-firewall policy provider deepseek --deny
vulnetix ai-firewall policy provider openai --allow
vulnetix ai-firewall policy provider deepseek --clear
```

Pass exactly one of `--allow`, `--deny` or `--clear`. The same command is available as `vulnetix config set ai-firewall provider`.

## States

| State | Stored as | At request time |
|---|---|---|
| No entry | no `OrgAiProvider.action` | Allowed. This is the default for every provider. |
| `allow` | `action = 'allow'` | Allowed. Records that someone approved the vendor. |
| `deny` | `action = 'deny'` | Every inference and model-list request returns `403 provider_denied`. |

`allow` and no entry behave identically at the gateway. There is no organisation-wide default-deny: to permit only approved vendors, deny every other provider in the [catalog](/ai-firewall/reference/provider-catalog/) explicitly, ideally in a [policy file](/ai-firewall/reference/policy-file/) so the full list is reviewed in one place.

Setting `allow` or `deny` needs the Pro plan. Clearing does not. On a community plan a stored `deny` is ignored by the gateway, which only applies provider policy at Pro and above.

## A denied request

```json
{
  "error": {
    "message": "provider deepseek is denied by organisation policy",
    "type": "policy_violation",
    "code": "provider_denied"
  }
}
```

The status is `403` and the envelope follows the dialect of the route: OpenAI shape on `/chat/completions` and `/responses`, Anthropic shape on `/messages`. With inference logging on, the refusal is logged with `blockedBy: provider_policy` and an empty model, because the body was never read.

## No stored key

A provider that is allowed but has no key in the vault is refused with the same status and a different code:

```json
{
  "error": {
    "message": "no OpenAI API key configured for your organisation: add one with 'vulnetix ai-firewall key set openai' or at https://www.vulnetix.com/vdb-ai-firewall#byok",
    "type": "policy_violation",
    "code": "provider_key_missing"
  }
}
```

This check runs at every plan. Store a key with `vulnetix ai-firewall key set <provider>`; see [Provider keys](/ai-firewall/get-started/provider-keys/). For `kiro` the message points at `vulnetix ai-firewall kiro login` instead.

## Routers

`openrouter` routes to models hosted by many vendors, and provider policy sees only the router's slug. Allowing a router therefore allows every vendor behind it. To hold a procurement or jurisdiction boundary, deny the router, or constrain it with [model policy](/ai-firewall/policy/models/), which sees the full model id such as `openai/gpt-4o-mini`.

## Custom compatible providers

An organisation on Pro can add up to 10 of its own upstreams (vLLM, LiteLLM, Ollama, llama.cpp, or a hosted OpenAI-compatible service) in the Resolve Platform's Connect tab. A custom provider gets the same provider and model policy, guardrails and logging as a built-in, and is reached at `https://guardrails.vulnetix.com/<slug>/<orgUuid>/v1`.

| Field | Accepted values |
|---|---|
| `slug` | `^[a-z][a-z0-9-]{1,31}$`. Not a built-in slug (`409`), not `kiro`, `v1`, `api`, `health`, `models` or a reserved Belai provider name (`422`). |
| `name` | Up to 64 characters, no control characters. Defaults to the slug. |
| `kind` | `openai-compatible` (default), `ollama`, `llama-server` |
| `protocol` | `openai-chat`, `openai-responses`, `anthropic-messages`. `ollama` and `llama-server` take `openai-chat` only. |
| base URL | `https` only, host only (no path or query), a public unicast address. Vulnetix's own hosts are refused. |
| `auth` | `bearer`, `x-api-key`, `cf-aig` |
| `models` | Up to 100, each an id without spaces. A `llama-server` serves exactly one. |

A custom provider is visible only to the tenant that owns it. A request for another tenant's slug gets the same `404 unknown_provider` as a slug that does not exist. When a custom slug and a built-in collide, the built-in always wins. Deleting a custom provider is not plan-gated. The key is stored through the [secrets vault](https://www.vulnetix.com/resolve/vault), not with `key set`.

## In a policy file

```yaml
apiVersion: vulnetix.com/v1
kind: AiFirewallPolicy
spec:
  providers:
    - slug: openai
      action: allow
    - slug: anthropic
      action: allow
    - slug: deepseek
      action: deny
    - slug: openrouter
      action: deny
```

`action: default` clears an entry. `apply --prune` never clears a provider, because removing a `deny` opens the provider. See [Policy file reference](/ai-firewall/reference/policy-file/#specproviders).

## Checking the current state

```bash
vulnetix ai-firewall get
vulnetix ai-firewall status
```

`get` lists every provider with its org policy (`default (allow)`, `allow` or `deny`) and model count. `status` adds whether a key is stored and which environment variables wire it locally.

## Related

- [Models](/ai-firewall/policy/models/)
- [Provider catalog](/ai-firewall/reference/provider-catalog/)
- [Jurisdictional control](/ai-firewall/security/jurisdictional-control/)
