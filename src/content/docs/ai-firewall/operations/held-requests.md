---
title: Reviewing held capabilities
nav: Held requests
description: What the hold for review does to a request, where held tools, MCP servers, skills and clients are listed, how an approval or a denial is recorded, and what the timeout does.
order: 3
sources:
  - ai-firewall/internal/policy/hold.go
  - ai-firewall/internal/db/hold.go
  - ai-firewall/internal/db/policy.go
  - ai-firewall/cmd/ai-firewall/main.go
  - vdb-site/api/internal/handler/ai_firewall_hold.go
  - website/src/components/ai-firewall/AiHoldSettings.vue
  - website/src/pages/resolve/ai-firewall.vue
checked: [ai-firewall@339de55, vdb-site@1a06d67, website@ad775f3]
updated: 02 Nov 2026
---

With the hold for review on, a capability that no rule names and nobody has reviewed is held until a person decides. Turning it on and choosing the timeout is covered on [Hold for review](/ai-firewall/policy/hold-for-review/). This page is about the queue.

## What a hold does to the request

| Kind | Effect while held | Client sees |
|---|---|---|
| `tool` | Removed from the request before it is forwarded | The request succeeds without the tool; `X-Vulnetix-Firewall-Stripped` counts it |
| `mcp_server` | Removed from the request before it is forwarded | As for a tool |
| `skill` | The request is refused | `403` with code `held_for_review` |
| `client` | The request is refused | `403` with code `held_for_review` |

A family (tools, MCP servers, skills or clients) that has any `*_allow` rule is in allowlist mode and the hold does not apply to it; the allowlist decides. A capability matched by a `*_deny` rule is decided by that rule. The hold needs the Teams plan.

## Where held capabilities are listed

| Where | What |
|---|---|
| Resolve Platform | Govern tab of the [AI Firewall page](https://www.vulnetix.com/resolve/ai-firewall#govern), **Held now** list. Each entry shows the identity, its kind, the client it came from, the time left before the timeout, and a **Review** link. |
| Software Factory | Each new hold publishes a `capability.held` source event; a workflow can turn it into a review card. The console links to workflow templates matching "ai capability" and to [Checkpoints](/software-factory/decisions/checkpoints/). |
| Guardian | Each hold is forwarded to the SIEM as a product event |
| API | `GET /ai-firewall/holds?state=held` |

A capability is recorded once per kind, identity and client. Seeing it again while it is held writes nothing new.

## Deciding

An owner or admin approves or denies. Other members get `403 only an owner or admin can review a capability`.

| Decision | What is written | Effect at the gateway |
|---|---|---|
| Approve | The hold row becomes `allowed` | The capability passes from then on. No `*_allow` rule is written, so approving one MCP server does not put the MCP family into allowlist mode. |
| Deny | The hold row becomes `denied`, and a guardrail named `Denied on review: <identity>` is created: rule type `tool_deny`, `mcp_deny`, `skill_deny` or `client_deny`, action `block`, pattern the identity, priority 100 | Requests carrying it are refused with `tool_denied`, `mcp_denied`, `skill_denied` or `client_denied` |

The decision applies to the capability for every client, not only the one it was first seen from. It also closes the capability's Software Factory sighting and review card. The gateway's policy cache is 30 seconds, so a decision can take that long to take effect.

To undo a denial, delete the `Denied on review: …` guardrail on the Guardrails tab, or with `vulnetix ai-firewall policy guardrail "<name>" --uuid <uuid> --delete`.

## The timeout

The hold policy sets `holdTimeoutMinutes` (0 to 10080, that is up to 7 days; 0 means no timeout) and `holdTimeoutAction`. Once a minute each gateway instance settles holds past their expiry, up to 200 at a time:

| `holdTimeoutAction` | Hold becomes | Also |
|---|---|---|
| `wait` (console label "Keep waiting") | `expired` | Nothing is approved, so the gateway keeps holding the capability. The row stays `expired` and drops off the **Held now** list; find it with `state=expired`. |
| `deny` | `denied` | A guardrail named `Hold timed out: <identity>` with the matching `*_deny` rule type, action `block`, priority 100 |
| `allow` | `allowed` | The capability passes from then on |

Each settled hold publishes `capability.hold_expired`. The expiry is fixed when the capability is first held, so changing the timeout later does not move holds already in the queue.

## API

Session-authenticated, under `https://www.vulnetix.com/api/site/v1`:

| Request | Body or parameters | Notes |
|---|---|---|
| `GET /ai-firewall/hold-policy` | | `{"holdUnknown", "holdTimeoutMinutes", "holdTimeoutAction", "updatedAt"}` |
| `PUT /ai-firewall/hold-policy` | Same fields | Owner or admin. `400` unless the action is `wait`, `deny` or `allow` and minutes are 0 to 10080. |
| `GET /ai-firewall/holds` | `state`: `held`, `allowed`, `denied`, `expired`, or empty for all | Newest first, at most 500. Each entry: `kind`, `identity`, `client`, `state`, `heldAt`, `expiresAt`, `decidedAt`. |
| `POST /ai-firewall/capabilities/review` | `{"kind", "identity", "client", "decision"}` | Owner or admin. `kind` is `tool`, `mcp_server`, `skill` or `client`; `decision` is `approve` or `deny`; `identity` at most 300 characters; `client` defaults to `unknown`. |

```bash
curl -s -X POST https://www.vulnetix.com/api/site/v1/ai-firewall/capabilities/review \
  -H "Content-Type: application/json" \
  -b "$VULNETIX_SESSION_COOKIE" \
  -d '{"kind":"mcp_server","identity":"github","client":"claude-code","decision":"approve"}'
```

`$VULNETIX_SESSION_COOKIE` is the signed-in browser session; the console API has no token authentication.

## Related

- [Hold for review](/ai-firewall/policy/hold-for-review/)
- [Capability inventory](/ai-firewall/operations/inventory/)
- [Error reference](/ai-firewall/reference/errors/)
