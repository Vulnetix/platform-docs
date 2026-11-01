---
title: "The messaging centre: connections, routes and templates"
nav: Messaging centre
description: How factory events reach Slack, Teams, Discord, Google Chat, Jira, GitHub Issues and signed webhooks. Connections, routes, tiers and digests, templates, delivery outcomes, and the factory's notification settings.
order: 26
sources: [vdb-site/docs/messaging.md, vdb-site/api/internal/handler/messaging_handlers.go, vdb-site/api/internal/handler/messaging_dispatcher.go, vdb-site/api/internal/handler/messaging_slack_thread.go]
checked: [vdb-site@284f1d6]
updated: 28 Oct 2026
---

The messaging centre sends Vulnetix events, including every factory notice, to your chat and ticket tools. A **connection** is one destination. A **route** says which events go to which connections, who is mentioned, and which template renders the message.

## Connections

| Provider | Credential | Sent as |
|---|---|---|
| Slack | A bot token from the Slack install | A message with blocks, to the target's channel |
| Microsoft Teams | A Workflows webhook URL | An Adaptive Card with mentions |
| Discord | A webhook URL | An embed. `@everyone` never fires. |
| Google Chat | A webhook URL | A card |
| Jira Cloud | An email and API token | An issue |
| GitHub Issues | None: the Vulnetix GitHub App | An issue, with labels and assignees |
| Signed webhook | A URL and signing secret | JSON, signed per Standard Webhooks |

Credentials live in the Secrets Vault. Every URL you type is fetched over https only, with no redirects, and only to public addresses. **Test** sends a test message. A connection that fails its credentials three times in a row is marked broken, and you are told on another connection.

### Signed webhooks

Each delivery carries `webhook-id`, `webhook-timestamp`, `webhook-signature` (an HMAC-SHA256 of id, timestamp and body) and `X-Vulnetix-Event`. Reject a timestamp more than five minutes old. **Rotate secret** signs with both secrets until the old one's grace ends.

## Routes

A route takes an event when its type matches one of the route's patterns (such as `factory.approval` or `belai.session.ended.*`), its severity is at least the route's minimum, and its scope matches. Each enabled target of the route gets one delivery. **Dry run** shows what a route would send, and **Test** sends one.

### Tiers and digests

Every event is in one tier: `needs_you` (an approval, a blocked card, a spent budget, a paused run, a session asking for a person), `error`, `warning` or `info`. A route sends each tier `instant`, to a `digest` (every 15 or 60 minutes, or daily), or `off`. A route over its `maxPerHour` folds the rest into a digest.

On Slack, a digest is grouped by cause, with what needs you first, and **one message per run**: the first event about a run posts a message, later events reply in its thread and update the message to the latest state.

## Templates

Each event type renders with a template. System templates cover factory notices, sessions, findings, Pix Sandbox events, agent activity and security alerts. You can write your own, **Preview** it against a sample, keep versions, and restore an old one.

A factory notice always carries a one-line headline and detail, links to the page it is about, and may carry buttons, such as Approve, that act straight away.

## Delivery

| Outcome | Means |
|---|---|
| `sent` | Delivered, with the provider's reference |
| `failed` | A network error, a 5xx or a rate limit. Retried with backoff, up to 8 attempts. |
| `dead` | A credential failure, a missing destination, or a template that does not render |
| `batched` | Folded into a digest |
| `suppressed` | The route does not send that tier, or the event is sensitive and the target is not private |
| `shadow` | The route is in shadow mode and sends nothing |

**Retry** resends a dead delivery. Deliveries are kept 90 days.

## People

**Identities** link each member to their handle on each provider, so a route can mention the right person. **Auto-link** matches them by email.

## The factory's settings

| Setting | Values | Default |
|---|---|---|
| `notify.events` | `escalations_holds_budget`, `everything`, `escalations_only` | `escalations_holds_budget` |
| `notify.connector` | `slack`, `teams`, `discord`, `google_chat`, `webhook`, `jira` | `slack` |

## API

| Method | Path |
|---|---|
| GET | `/v1/messaging/catalogue`, `/v1/messaging/events`, `/v1/messaging/deliveries` |
| GET, POST | `/v1/messaging/connections` |
| PATCH, DELETE | `/v1/messaging/connections/{id}` |
| POST | `/v1/messaging/connections/{id}/test`, `/rotate-secret` |
| GET, POST | `/v1/messaging/routes` |
| PATCH, DELETE | `/v1/messaging/routes/{id}` |
| POST | `/v1/messaging/routes/{id}/test`, `/dry-run` |
| GET, POST | `/v1/messaging/templates` |
| GET | `/v1/messaging/templates/{id}`, `/templates/{id}/versions/{v}` |
| POST | `/v1/messaging/templates/preview`, `/templates/{id}/restore/{v}` |
| PATCH, DELETE | `/v1/messaging/templates/{id}` |
| GET | `/v1/messaging/identities` |
| PUT, DELETE | `/v1/messaging/identities/{principalUuid}/{provider}` |
| POST | `/v1/messaging/identities/auto-link` |
| POST | `/v1/messaging/deliveries/{id}/retry` |
