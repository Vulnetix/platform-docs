---
title: Package and AI firewalls on factory work
nav: Firewalls
description: How the Package Firewall and AI Firewall sit in front of every factory session, how Belai routes model traffic through the AI Firewall, and capability review.
order: 3
sources: [vdb-site/docs/factory.md, belai/docs/firewall.md, belai/docs/firewall-permissions.md, vdb-site/api/internal/handler/ai_firewall_hold.go]
checked: [vdb-site@284f1d6, belai@35506b9]
updated: 28 Oct 2026
---

Two firewalls stand in front of factory work:

- The **Package Firewall** decides which packages an agent may install. Every install in a Pix Sandbox goes through it. It can block malware, known exploited vulnerabilities, weaponised packages and packages younger than a cooldown, and warn or block on end of life. Its blocks show on the cockpit and on [Trust](/software-factory/evidence/trust-and-slsa/).
- The **AI Firewall** is a gateway between Belai and the model provider. It inspects each request and can refuse it, redact what it matched, or flag it. For factory sessions it cannot be switched off: `firewall_enabled` is locked on.

Both are configured on their own pages in the Resolve Platform. The factory reads them, and both can [trigger workflows](/software-factory/workflows/source-events/) when they see something new.

## How Belai routes through an AI Firewall

Belai supports several AI Firewalls through **adapters**. Exactly one configured firewall is **active** at a time.

| Adapter | What it is |
|---|---|
| `vulnetix` | The Vulnetix AI Firewall: guardrails, redaction and bring-your-own provider keys for your organisation |
| `fastly` | Fastly AI Runtime Control (beta) |
| `kong` | Your Kong AI Gateway route (beta) |
| `aisg` | The self-hosted AI Security Gateway (beta, OpenAI chat completions only) |
| `custom` | Any proxy |

Every adapter except Vulnetix takes a **mode**:

| Mode | Sends |
|---|---|
| transparent | The provider's own key in its own header. Only the base URL changes. |
| authorization | The firewall's key as a bearer token. The provider key is never sent; the firewall holds it. |
| header | The firewall's key in a header you name, such as Kong's `apikey`. The provider key is never sent. |

### Settings

In Belai's global settings file, under `firewall`:

```json
"firewall": {
  "enabled": true,
  "active": "corp-kong",
  "instances": {
    "corp-kong": { "adapter": "kong", "url": "https://kong.example/ai/{provider}", "mode": "header", "header": "apikey", "providers": ["openai", "anthropic"] }
  }
}
```

| Key | Meaning |
|---|---|
| `enabled` | Route traffic through the active firewall |
| `active` | The instance in use. Empty means `vulnetix`. |
| `instances` | Named firewalls, each with `adapter`, `url`, `mode`, `header` and `providers` |
| `providers` | Limit a firewall to these providers; the rest go direct |
| `permission_offers` | Offer guardrail rules when a prompt states a permission the gateway can enforce |
| `permission_auto_apply` | Apply those rules without asking |

`/firewall` in the TUI opens the configuration screen, and `F10` switches the firewall on or off for the current project. `belai -firewall` routes one run's traffic through the active firewall.

A firewall's own key is never written to settings. Belai keeps it in the keychain, or the user credentials file. A provider set kept in the library never holds a key either, and its headers may not set `accept`, `accept-encoding`, `connection`, `content-encoding`, `content-length`, `content-type`, `cookie`, `host`, `keep-alive`, `proxy-authorization`, `proxy-connection`, `te`, `trailer`, `transfer-encoding`, `traceparent`, `upgrade` or `user-agent`.

> [!CAREFUL] A repository cannot turn the firewall on for you
> A project's settings file may set `firewall.enabled` to `false`, and nothing else. It cannot add instances or pick the active one, so a cloned repository can never send your traffic through a firewall you did not choose.

Some traffic is never routed: sign-in providers such as Copilot and the Cloudflare AI Gateway provider, and decision models. Kiro is routed only through the Vulnetix AI Firewall.

## Holding unreviewed capabilities

With an organisation's **hold policy** on, the Vulnetix AI Firewall holds any client, MCP server, tool or skill that no rule names and nobody has reviewed. A held tool or MCP server is stripped from the request, and a held skill or client is refused with `held_for_review`. The hold is published as a source event, so a workflow can research it and file a review card.

| Policy field | Values |
|---|---|
| `holdUnknown` | Hold what nobody has reviewed |
| `holdTimeoutMinutes` | 0 to 10,080 |
| `holdTimeoutAction` | `wait` (keep holding), `deny` (write a deny rule), `allow` (approve) |

Approving a capability records it as reviewed; it never writes an allow rule, because one allow rule turns its whole family into an allowlist. Denying writes a deny rule. Either one closes the review card.

| Method | Path |
|---|---|
| GET, PUT | `/v1/ai-firewall/hold-policy` (owner or admin to change) |
| GET | `/v1/ai-firewall/holds?state=held` (`held`, `allowed`, `denied`, `expired`) |
| POST | `/v1/ai-firewall/capabilities/review` with `{kind, identity, client, decision: "approve" or "deny"}` |

## Related

- [Source events](/software-factory/workflows/source-events/)
- [Trust and SLSA](/software-factory/evidence/trust-and-slsa/)
- [Agent questions and permissions](/software-factory/workforce/questions-and-permissions/)
