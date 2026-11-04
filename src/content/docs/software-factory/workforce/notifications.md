---
title: Notifications
description: How you hear about factory work. Browser and phone push, notification preferences and quiet hours, buttons that act from a notification, a workflow's notify step, and Belai's desktop notifications.
order: 25
sources: [vdb-site/docs/factory.md, belai/docs/notifications.md, vdb-site/api/internal/handler/notify_core.go, vdb-site/api/internal/handler/notify_prefs.go, vdb-site/api/internal/handler/notify_actions.go, vdb-site/api/internal/handler/factory_notify.go]
checked: [vdb-site@284f1d6, belai@35506b9]
updated: 28 Oct 2026
---

The factory tells you about what happens in it in three ways: chat and tickets through the [messaging centre](/software-factory/workforce/messaging-centre/), push to your browser and phone, and a desktop notification from Belai on your own machine.

## One way to tell people

Every notice the factory raises (how a session ended, what an agent is waiting on, an approval, a failed run, a budget) goes through one path. It goes to your messaging routes, or only to the connections a workflow step named, and, if the type can be pushed, to the browsers of the people it is about, if their preferences let it through.

Each notice names what happened in one line and links to the page it is about. Some carry buttons, such as **Approve** or **Answer**, that act straight away.

## Push

Turn on push in the Resolve Platform (Settings › Notifications, or when the Resolve Platform asks). Each browser or installed app you turn it on in gets pushes. **Send test** checks it.

### Preferences

| Preference | Effect |
|---|---|
| Per type or family | On or off for each notification type, a family such as `factory.*`, or `*` |
| Minimum severity | `info`, `notice`, `warning` or `critical` |
| Quiet hours | A start and end time in your timezone, when nothing is pushed |

Your organisation's owners and admins set the defaults (`notify.push.defaults`), and your own preferences override them. The catalogue lists every type that can be pushed, its default, the organisation's answer and yours.

### Buttons

A button in a notification carries a one-time token. Pressing it shows what it will do, then does it as you. It is refused if you are not allowed (not an approver, already decided, no longer live), and it expires.

## In a workflow

An [output step](/software-factory/workflows/nodes/output/) of kind `notify` sends a message: a text with `{workflow}`, `{run}`, `{repo}`, `{node}` and `{status}` filled in, a severity (`info`, `notice`, `warning`, `critical`), up to 10 connections, and a push to the run's `owner` or `none`. A [human step](/software-factory/workflows/nodes/human/) notifies its approvers through `notifyVia`: `slack`, `teams`, `google_chat`, `discord`, `webhook`, `email` or `push`.

## Desktop notifications from Belai

On your own machine, Belai can tell you when it needs you:

| Event | When |
|---|---|
| `permission` | A tool call is waiting on a permission ask |
| `clarify` | The agent asked a question or a mode choice |
| `plan_ready` | A plan waits for review |
| `turn_done` | A long turn finished |
| `goal_done`, `goal_stalled` | Goal mode completed, or stopped before completing |
| `agent_done` | A background agent finished |
| `worker_blocked`, `worker_failed` | A fleet worker blocked a card for you, or stopped with an error |
| `crew_fault`, `crew_sleeping`, `crew_stopped` | A crew worker faulted, the crew's whole pool failed, or the crew ended |

Every one also fires the `notification` [hook](/software-factory/belai/hooks/), so you can send the same moments anywhere.

## API

| Method | Path |
|---|---|
| POST, DELETE | `/v1/push/subscriptions` |
| GET | `/v1/push/vapid-public-key` |
| POST | `/v1/push/test` |
| GET | `/v1/notifications/catalogue` |
| GET, PUT | `/v1/notifications/preferences` |
| GET, PUT | `/v1/notifications/tenant-defaults` |
| GET | `/v1/notifications/actions/describe?t=` |
| POST | `/v1/notifications/actions/execute` |
