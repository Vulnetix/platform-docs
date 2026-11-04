---
title: Hold for review
description: Hold any tool, MCP server, skill or client that no rule names and nobody has reviewed, until a person approves or denies it or the timeout you set decides.
order: 11
sources:
  - ai-firewall/internal/policy/hold.go
  - ai-firewall/internal/db/policy.go
  - ai-firewall/internal/db/hold.go
  - ai-firewall/internal/api/handlers.go
  - ai-firewall/cmd/ai-firewall/main.go
  - vdb-site/api/internal/handler/ai_firewall_hold.go
  - website/src/components/ai-firewall/AiHoldSettings.vue
checked: [ai-firewall@339de55, vdb-site@1a06d67, website@ad775f3]
updated: 02 Nov 2026
---

With hold for review on, a capability that no rule decides and no person has approved is held:

| Kind | While held |
|---|---|
| Tool | Removed from the request, which is forwarded without it. Counted in `X-Vulnetix-Firewall-Stripped`. |
| MCP server (remote) | Removed from the request, which is forwarded without it. |
| Skill | The request is refused: `403 held_for_review`. |
| Client | The request is refused: `403 held_for_review`. |

A skill is a value inside another tool's schema and a client is the caller itself, so neither can be removed; the request is refused instead. The refusal message reads `the <kind> <name> is held until someone in your organisation reviews it`.

Hold for review needs the Business plan. It is set on the console's Govern tab (`#govern`, or `?hold=1` to scroll to it) by an owner or admin. There is no CLI command or policy file field for it.

## What counts as undecided

The hold runs after explicit deny rules and allowlists, and leaves alone anything they already decide:

- A capability refused by a `*_deny` rule with action `block` never reaches the hold. One matched by a `flag` or `strip` deny rule is still held unless approved.
- A family with any enabled `*_allow` rule is in allowlist mode, and that allowlist decides every capability in it. The hold does not apply to that family at all.
- A capability someone approved on review is let through.
- An unrecognised client is named `unknown` and is held like any other client name.

Everything else in the four families is held.

> [!CAREFUL] Turning the hold on refuses every client and skill nobody has approved
> A held client or skill is refused, not stripped. A Claude Code request whose `Skill` tool lists ten skills is refused until all ten are approved or a `skill_allow` rule exists. The first request from each client name (`claude-code`, `openai-sdk`, `unknown` and so on) after the hold is switched on returns `403 held_for_review` until someone approves that client. Before switching it on, approve the clients you use with `POST /v1/ai-firewall/capabilities/review` (`kind: client`), or add `client_allow` and `skill_allow` rules, which take those families out of the hold.

## Settings

| Field | Resolve Platform label | Values | Default |
|---|---|---|---|
| `holdUnknown` | Hold a capability no rule names | `true`, `false` | `false` |
| `holdTimeoutMinutes` | Timeout in minutes | `0` to `10080` (7 days). `0` never times out. | `0` |
| `holdTimeoutAction` | At the timeout | `wait` (Keep waiting), `deny`, `allow` | `wait` |

```http
PUT /v1/ai-firewall/hold-policy
Content-Type: application/json

{"holdUnknown": true, "holdTimeoutMinutes": 1440, "holdTimeoutAction": "deny"}
```

A value outside the ranges returns `400 holdTimeoutAction is wait, deny or allow, and holdTimeoutMinutes is 0 to 10080`. A caller who is not an owner or admin gets `403`.

## Reviewing a hold

The first time a capability is held for a client, the gateway records it (`AiFirewallHold`, state `held`) and publishes a `capability.held` event to the Software Factory, which opens a review ticket. The ticket shows what is known about the capability. The Govern tab lists current holds as "Held, caller waiting" with the time left.

| Decision | Effect |
|---|---|
| Approve | Recorded as `allowed`. The capability passes from the next request. No `*_allow` rule is written, so approving one MCP server does not put the MCP family into allowlist mode. |
| Deny | Writes a `*_deny` guardrail named `Denied on review: <identity>` with action `block`, priority 100 and the identity as its pattern. A denied tool or MCP server is then refused, not stripped: every request that still offers it gets `403`. Change the rule to `strip` if sessions should carry on without it. |

The decision is made with `POST /v1/ai-firewall/capabilities/review` and the body `{"kind": "tool", "identity": "mcp__jira__create_issue", "client": "claude-code", "decision": "approve"}`. `kind` is `tool`, `mcp_server`, `skill` or `client`; `decision` is `approve` or `deny`; `identity` is at most 300 characters. An approval applies to that identity for every client.

`GET /v1/ai-firewall/holds?state=held` lists up to 500 holds, newest first; `state` is `held`, `allowed`, `denied` or `expired`.

## Timeout

The gateway settles holds whose timeout has passed once a minute:

| `holdTimeoutAction` | Hold becomes | Also |
|---|---|---|
| `deny` | `denied` | Writes a `*_deny` guardrail named `Hold timed out: <identity>`, action `block`, priority 100 |
| `allow` | `allowed` | The capability passes from then on |
| `wait` | `expired` | Nothing is approved, so the capability is still held on the next request |

Each settlement publishes `capability.hold_expired` to the Software Factory, so the ticket shows the timeout's decision. The expiry time is fixed when the capability is first held.

## Cost on the request path

The hold setting and approvals are loaded in the same query as the guardrails and share their 30-second cache. Holds are recorded after the decision, off the request path. Approvals and settings changes therefore take up to 30 seconds to reach the gateway.

## Related

- [Tools](/ai-firewall/policy/tools/)
- [MCP servers](/ai-firewall/policy/mcp-servers/)
- [Inventory](/ai-firewall/operations/inventory/)
- [Held requests](/ai-firewall/operations/held-requests/)
