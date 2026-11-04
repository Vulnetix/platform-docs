---
title: The models endpoint
description: GET /v1/models returns the catalogue models your organisation's policy permits, in OpenAI or Anthropic shape, without calling the provider or a stored key.
order: 4
sources:
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/internal/api/server.go
  - ai-firewall/internal/db/policy.go
checked: [ai-firewall@339de55]
updated: 02 Nov 2026
---

```bash
curl -s "https://guardrails.vulnetix.com/openai/$VULNETIX_ORG_ID/v1/models" \
  -H "Authorization: Bearer $VULNETIX_API_KEY"
```

`GET /{provider}/{orgUuid}/v1/models` lists the active catalog models at a provider, filtered by the organisation's [model policy](/ai-firewall/policy/models/): denied models are left out, and in allowlist mode only allowed models are listed. Clients that build a model picker from this endpoint, Claude Desktop among them, therefore only offer models the gateway will accept.

The legacy route `GET /{provider}/v1/models` with an `X-Organisation-UUID` header also works.

## Behaviour

| Aspect | Behaviour |
|---|---|
| Upstream call | None. The list comes from the catalog, synced hourly. |
| Provider key | Not required. You can list models before storing a key. |
| Denied provider | `403 provider_denied`, on Pro and above. |
| Plan below Pro | The unfiltered active catalog is returned, because model policy is not enforced on that plan either. |
| Order | Model slug, ascending. |

## Response shapes

The shape follows the provider's surface. A provider that speaks the Anthropic Messages API is answered in the Anthropic shape, every other provider in the OpenAI shape.

OpenAI shape (`created` is Unix seconds):

```json
{
  "object": "list",
  "data": [
    { "id": "gpt-4o-mini", "object": "model", "created": 1721260800, "owned_by": "openai" }
  ]
}
```

Anthropic shape (`created_at` is RFC 3339; `first_id` and `last_id` are omitted when the list is empty):

```bash
curl -s "https://guardrails.vulnetix.com/anthropic/$VULNETIX_ORG_ID/v1/models" \
  -H "x-api-key: $VULNETIX_API_KEY"
```

```json
{
  "data": [
    { "type": "model", "id": "claude-sonnet-4-5", "display_name": "Claude Sonnet 4.5", "created_at": "2025-09-29T00:00:00Z" }
  ],
  "has_more": false,
  "first_id": "claude-sonnet-4-5",
  "last_id": "claude-sonnet-4-5"
}
```

## An empty or short list

| Cause | Check |
|---|---|
| Every model at the provider is denied | `vulnetix ai-firewall get` |
| Allowlist mode, and the allowed models are not active in the catalog | `vulnetix ai-firewall get` shows `Listed: false` for delisted entries |
| The catalog has no models for the provider yet | The provider's model count in `vulnetix ai-firewall get` |

An empty list does not stop inference: a model missing from the catalog still passes unless the provider is in allowlist mode.

## Related

- [Models](/ai-firewall/policy/models/)
- [Provider catalog](/ai-firewall/reference/provider-catalog/)
- [Claude Desktop](/ai-firewall/clients/claude-desktop/)
