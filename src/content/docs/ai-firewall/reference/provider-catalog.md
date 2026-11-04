---
title: Provider catalog
description: Every built-in provider slug with its upstream, request surfaces and credential header, how custom providers are added, and which CLI commands know each provider.
order: 6
sources:
  - saas/prisma/migrations/20260713000001_ai_firewall/migration.sql
  - saas/prisma/migrations/20260713000002_ai_firewall_more_providers/migration.sql
  - saas/prisma/migrations/20260715000001_ai_firewall_wire_apis/migration.sql
  - saas/prisma/migrations/20260715000002_ai_firewall_wire_apis_enable/migration.sql
  - saas/prisma/migrations/20261029000001_ai_firewall_kiro/migration.sql
  - saas/prisma/migrations/20261031000001_ai_firewall_custom_providers/migration.sql
  - vdb-site/api/internal/handler/ai_firewall_provider_validate.go
  - vdb-site/api/internal/handler/entitlements.go
  - ai-firewall/internal/api/proxy.go
  - ai-firewall/internal/api/handlers.go
  - cli/pkg/aifirewall/provider.go
checked: [saas@50cedf3, vdb-site@1a06d67, ai-firewall@339de55, cli@4c8c3b7]
updated: 02 Nov 2026
---

The provider is the first path segment of the base URL: `https://guardrails.vulnetix.com/{slug}/{org}/v1`. The catalog is a database table; the live list for your organisation, with your policy and key state, is printed by `vulnetix ai-firewall get`.

## Built-in providers

| Slug | Provider | Upstream base | Surfaces | Credential sent upstream |
|---|---|---|---|---|
| `openai` | OpenAI | `https://api.openai.com` | `chat`, `responses` | `Authorization: Bearer {key}` |
| `anthropic` | Anthropic | `https://api.anthropic.com` | `messages` | `x-api-key: {key}`, `anthropic-version: 2023-06-01` |
| `openrouter` | OpenRouter | `https://openrouter.ai/api` | `chat` | `Authorization: Bearer {key}` |
| `groq` | Groq | `https://api.groq.com/openai` | `chat` | `Authorization: Bearer {key}` |
| `mistral` | Mistral | `https://api.mistral.ai` | `chat` | `Authorization: Bearer {key}` |
| `deepseek` | DeepSeek | `https://api.deepseek.com` | `chat` | `Authorization: Bearer {key}` |
| `xai` | xAI | `https://api.x.ai` | `chat` | `Authorization: Bearer {key}` |
| `together` | Together AI | `https://api.together.xyz` | `chat` | `Authorization: Bearer {key}` |
| `fireworks` | Fireworks AI | `https://api.fireworks.ai/inference` | `chat` | `Authorization: Bearer {key}` |
| `alibaba` | Alibaba Cloud | `https://llm-h3tttdfc5ndvt4v4.ap-southeast-1.maas.aliyuncs.com/compatible-mode` | `chat` | `Authorization: Bearer {key}` |
| `moonshot` | Moonshot AI | `https://api.moonshot.ai` | `chat` | `Authorization: Bearer {key}` |
| `minimax` | MiniMax | `https://api.minimax.io` | `chat` | `Authorization: Bearer {key}` |
| `kiro` | Kiro | `https://q.us-east-1.amazonaws.com` | `kiro` | A Bearer access token minted per request from a stored AWS sign-in |

The upstream path is the base plus `/v1/chat/completions`, `/v1/responses`, `/v1/messages`, `/v1/messages/count_tokens` or, for Kiro, `/generateAssistantResponse`.

Every provider needs a stored key before it proxies anything (`403 provider_key_missing`). A provider Vulnetix has switched off for everyone answers `403 provider_disabled`.

> [!CAREFUL] Only openai serves the Responses API
> Codex CLI accepts no wire format but Responses, so it can only be pointed at `openai` (or a custom provider registered with the Responses protocol). Claude Code and Claude Desktop speak only Messages, so they need `anthropic`. Calling a surface a provider does not serve is `404 unsupported_api`.

## What the CLI knows about each provider

`vulnetix ai-firewall install` and `key set` use a list built into the CLI, which records the environment variables SDKs really read. It covers nine of the thirteen built-ins.

| Slug | `install` sets | Reached by environment variable |
|---|---|---|
| `openai` | `OPENAI_BASE_URL`, `OPENAI_API_BASE`, `OPENAI_API_KEY` | yes |
| `anthropic` | `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN` | yes |
| `groq` | `GROQ_BASE_URL`, `GROQ_API_KEY` | yes (not verified against SDK source) |
| `mistral`, `deepseek`, `xai`, `openrouter`, `together`, `fireworks` | an informational `VULNETIX_AIFW_<SLUG>_BASE_URL` | no: set `base_url` in code, see [Snippets](/ai-firewall/cli/snippets/) |
| `alibaba`, `moonshot`, `minimax`, `kiro`, custom providers | nothing | no |

`ANTHROPIC_AUTH_TOKEN` is used rather than `ANTHROPIC_API_KEY` because it makes the SDK send `Authorization: Bearer`. Both header forms are accepted by the gateway.

`vulnetix ai-firewall key set <slug>` refuses a slug outside the nine with `unknown provider`, and refuses `kiro` with a pointer to `kiro login`. Store keys for `alibaba`, `moonshot`, `minimax` and custom providers on the Resolve Platform's Connect tab, or with `providers[].key` in a [policy file](/ai-firewall/reference/policy-file/), which goes straight to the API. `policy provider <slug>` and `policy model` accept any slug.

## Kiro

Kiro has no API key. `vulnetix ai-firewall kiro login` signs in with an AWS Builder ID (default) or an IAM Identity Center start URL and stores the sign-in in the [secrets vault](https://www.vulnetix.com/resolve/vault) as the `kiro` key. The gateway mints a short-lived access token from it on every request.

| Item | Value |
|---|---|
| Base URL | `https://guardrails.vulnetix.com/kiro/{org}/v1` |
| Inference | `POST …/generateAssistantResponse` |
| Models | `GET …/ListAvailableModels` |
| Seeded models | `auto`, `claude-opus-4.5`, `claude-sonnet-4.5`, `claude-sonnet-4`, `claude-haiku-4.5` |
| Sign-ins accepted | AWS Builder ID, IAM Identity Center. GitHub and Google Kiro sign-ins have no refresh path and cannot be used. |
| Expired sign-in | `403 vault_kiro_relogin`; run `kiro login` again |

See [Kiro](/ai-firewall/clients/kiro/) for client setup.

## Custom providers

An organisation on Pro or above can register its own endpoint on the Connect tab of the [AI Firewall page](https://www.vulnetix.com/resolve/ai-firewall). It is addressed by its slug like a built-in and gets the same authentication, provider policy, model policy and guardrails.

| Setting | Allowed values |
|---|---|
| Protocol | `openai-chat`, `openai-responses`, `anthropic-messages`. Kiro is not available. |
| Key header | `bearer` (`Authorization: Bearer {key}`), `x-api-key` (with `anthropic-version` for Messages), `cf-aig` (`cf-aig-authorization: Bearer {key}`) |
| Base URL | `https` only, with a host that resolves to a public unicast address |
| Slug | Unique within the organisation, and not any built-in slug (`409`) or reserved path word (`422`) |
| Providers per organisation | 10 |
| Declared models per provider | 100 |

| Behaviour | Detail |
|---|---|
| Visibility | Only the owning organisation. Another organisation using the slug gets `404 unknown_provider`, the same answer as a slug that does not exist. |
| Address check | Repeated on every connection, on the address the name resolves to then, so DNS rebinding cannot reach a private, loopback, link-local, CGNAT or metadata address. A refused connection is `502 upstream_blocked`. |
| Redirects | Never followed and never relayed: `502 upstream_redirect` |
| Deleting | Not plan-gated. The provider's vault keys are revoked first; if that fails nothing is deleted (`502`). |

The key is stored afterwards through the vault, never in the provider definition.

## Model names

The gateway forwards `model` unchanged. Use the provider's own id: `gpt-4o-mini` on `openai`, `openai/gpt-4o-mini` on `openrouter`, `llama-3.3-70b-versatile` on `groq`. A wrong id gets the provider's own error, relayed as is.

> [!CAREFUL] OpenRouter is a router
> Provider policy sees one provider, `openrouter`, whichever vendor serves the model behind it. Allowing it opens every vendor OpenRouter fronts. To hold a vendor or jurisdiction boundary, deny `openrouter` or put it in allowlist mode with [model policy](/ai-firewall/policy/models/).

## Related

- [Providers](/ai-firewall/policy/providers/)
- [Provider keys](/ai-firewall/get-started/provider-keys/)
- [Jurisdictional control](/ai-firewall/security/jurisdictional-control/)
