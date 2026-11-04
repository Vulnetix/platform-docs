---
title: Notifications
description: Browser and phone push notifications, your preferences and quiet hours, organisation defaults, action buttons, and how they relate to messaging routes.
order: 4
sources: [vdb-site/api/internal/handler/notify_prefs.go, vdb-site/api/internal/handler/notify_actions.go, vdb-site/api/internal/handler/notify_core.go, vdb-site/api/internal/notify/prefs.go, vdb-site/api/main.go]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

Vulnetix tells people about events in two ways:

| Channel | Who decides | Set up in |
|---|---|---|
| **Messaging** (Slack, Teams, Discord, Google Chat, Jira, GitHub Issues, webhooks) | Owners, per route | [Messaging](/organization/integrations/messaging/) |
| **Push** to a browser or installed app | Each person, over the organisation's defaults | Settings › Notifications in the Resolve Platform |

A notice that can be pushed goes to the browsers of the people it is about, if their preferences let it through, and to any messaging route that takes it.

## Turning on push

Allow notifications when the Resolve Platform asks, or turn them on in Settings › Notifications. Each browser or installed app you turn on gets pushes. **Send test** checks it.

| Method | Path |
|---|---|
| POST, DELETE | `/v1/push/subscriptions` |
| GET | `/v1/push/vapid-public-key` |
| POST | `/v1/push/test` |

These routes are rate-limited to 30 requests a minute.

## Your preferences

| Preference | Values |
|---|---|
| `push` | A map of event type or family (`a.b.c`, `a.b.*`, `*`) to on or off. At most 500 keys. |
| `minSeverity` | `info` (default), `notice`, `warning`, `critical` |
| `quietHours` | `{start: "HH:MM", end: "HH:MM", tz: "<IANA zone>"}`. Nothing is pushed in that window. |

Your preferences override the organisation's defaults. `GET /v1/notifications/catalogue` lists every pushable type with its group, default severity, tier, the default, the organisation's answer (`tenant`), yours (`mine`) and the result (`effective`).

| Method | Path | Who |
|---|---|---|
| GET | `/v1/notifications/catalogue` | anyone |
| GET, PUT | `/v1/notifications/preferences` | yourself only |
| GET | `/v1/notifications/tenant-defaults` | anyone |
| PUT | `/v1/notifications/tenant-defaults` `{push}` | owners |

| Status | Error |
|---|---|
| 400 | `too many event types`, `an event type is not a type or family (a.b.c, a.b.*, or *)`, `minSeverity is info, notice, warning or critical`, `quiet hours are HH:MM to HH:MM in an IANA time zone` |
| 403 | `only an owner or an admin can do this` (tenant defaults) |

The notification routes take the Resolve Platform session only and are rate-limited to 60 requests a minute.

## Action buttons

Some notices carry buttons, such as **Approve** or **Answer**. A button carries a one-time token to `/resolve/notify-action?t=<token>`. Opening it shows what it will do, signs you in, and does it as you. It is refused if you are not allowed, if it was already decided, or if it has expired.

| Method | Path |
|---|---|
| GET | `/v1/notifications/actions/describe?t=` |
| POST | `/v1/notifications/actions/execute` |

## Related

- [Software Factory notifications](/software-factory/workforce/notifications/) for factory notices, workflow notify steps and Belai desktop notifications
- [Messaging](/organization/integrations/messaging/)
