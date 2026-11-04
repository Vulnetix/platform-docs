---
title: Voice calls
description: How a Pix call connects, its time limits and settings, one call per person across devices, what is kept and who can read it, Pix's notes between calls, feedback, and the call API.
order: 1
sources: [website/src/worker/call/routes.ts, website/src/worker/call/ticket.ts, website/src/worker/call/call-agent.ts, website/src/worker/call/history.ts, website/src/worker/call/prompt.ts, website/src/shared/call/protocol.ts, vdb-site/api/internal/handler/pix_call_history.go, vdb-site/api/internal/handler/pix_call_memory.go, vdb-site/api/internal/handler/pix_call_review.go, vdb-site/api/main.go]
checked: [website@ad775f3, vdb-site@1a06d67]
updated: 02 Nov 2026
---

A Pix call is a voice conversation with **PixCommander**, the Software Factory's coordinator, from the Resolve Platform's `/call` page. You ask how runs and sessions are going, start or stop sessions on a Pix Sandbox or your own `belai rc` host, answer an agent's question, or check spend.

What to say and what Pix does with it is documented with the factory:

| Topic | Page |
|---|---|
| Placing a call, what you can ask, the read-back before anything starts or stops, following sessions | [Calling Pix](/software-factory/pix/calling-pix/) |
| Every tool Pix uses, and which need your yes | [Voice tools](/software-factory/pix/voice-tools/) and the [voice tools reference](/software-factory/reference/voice-tools/) |
| Stopping a session, and the wider stops | [Stopping work](/software-factory/pix/stopping-work/) |
| The archive, rating a call, calling about a past call | [Call history and memory](/software-factory/pix/call-history/) |
| Pix buttons beside runs and findings | [Pix buttons](/software-factory/pix/pix-buttons/) |

This page is the product reference: limits, settings, storage, access and API.

## Before you call

- Sign in to the Resolve Platform. The phone icon in the header opens `/call` once you have somewhere to run sessions: a Pix Sandbox, or a host that has run `belai rc`.
- Allow the microphone. Audio plays where the browser allows it unasked, and always in the installed app (its **Call Pix** shortcut).
- `/call` is its own page; moving into or out of it is a full page load.

## How a call connects

1. The page posts your session token to `POST /api/call/ticket` on `www.vulnetix.com`. The Worker checks it against your account and returns a ticket valid for **60 seconds**, bound to your own call agent (one per signed-in person).
2. The page opens the voice WebSocket, `GET /agents/call-agent/<name>?ticket=<ticket>`. A missing, expired or mismatched ticket gets `401 The call ticket is missing or expired.`
3. Speech is transcribed, PixCommander picks tools and a reply, and the reply is spoken back. Canned phrases and hold music are served from `/api/call/audio/`.

| Ticket answer | Message | Cause |
|---|---|---|
| `401` | `Sign in first.` | No `Authorization` header |
| `401` | `Your sign-in has expired.` | The account API refused the token |
| `502` | `Your account could not be checked.` / `The account API did not answer.` | The account lookup failed |
| `503` | `Pix Call is not set up on this deployment.` | The deployment has no ticket secret or AI binding |

## Limits

| Limit | Value | What happens |
|---|---|---|
| One call | 60 minutes | The call ends |
| Calls per person per day | 180 minutes, per UTC day | A new call is refused with the reason; a live call ends at the limit |
| Silence | 8 minutes with nobody talking | Pix hangs up, unless it is on hold waiting for a session |
| Following a session | Checked every 12 seconds | Pix speaks up when a followed session asks a question or finishes |
| Sessions in one read-back | 5 | One yes starts them all |
| Answer to a read-back | Your very next reply, within 2 minutes | Otherwise Pix proposes again |

## One call per person

A person has one live call. Opening `/call` on a second device while a call is live asks before taking it over; if you take over, the first device is told its call moved and ends.

## Settings

Set on the call page and sent with the call:

| Setting | Values | Effect |
|---|---|---|
| Patience | `0` (snappy) to `1` (patient) | How long a pause must last before Pix treats your turn as finished |
| Hold music | on, off | Music while Pix waits on a session and is silent. Pix can also turn it on or off when asked (`hold_music`). |

Pix uses your device's timezone for "today" and "this month". Everything stored is in UTC.

## What is kept

| Kept | Never kept |
|---|---|
| What you and Pix said | Audio |
| The cards the page showed: actions, tables, read-backs and how each was settled | Your IP address and location |
| A title for the call, made from what you asked for | The names of the models involved |

| Storage limit | Value |
|---|---|
| Events per call | 1,500 |
| Text per line or table value | 8,000 characters |
| Tables per call, rows per table | 50 and 50 |
| One table cell, column name or summary | 500 characters |

The call's own Durable Object buffers events and sends them to the history in batches of 10 (at most 100 events and about 200 KB per request). A call where you never spoke, only Pix's greeting, is not listed.

### Who can read a call

A call is readable by the person who made it, and by the organisation's owners and admins. Deleting a call hides it from the archive; the rows stay for audit and review. Older chats from the retired Pix chat drawer appear in the same archive, readable by every member of the organisation and hidden only by the person who started them or an owner or admin.

## Notes between calls

Pix keeps a note only when you ask it to remember something or state a lasting preference ("always use plan mode on the payments repository").

| Rule | Value |
|---|---|
| Scope | Your own sign-in: notes are stored under the session principal, not shared with other members |
| Length | 500 characters |
| Optional repository | `owner/name` |
| Kept | The newest 200; saving another removes the oldest |
| Loaded into each call | The 15 newest |

Asked to forget one, Pix reads it back before deleting it.

## Feedback

Each Pix reply has a thumbs up and down. One rating per person per reply; pressing again replaces it. A thumbs down offers a note of up to 2,000 characters.

## API

The call history routes are on the Resolve Platform API (`https://www.vulnetix.com/api/site`), with your session token.

| Method | Path | Parameters or body | Answer |
|---|---|---|---|
| GET | `/v1/pix-call/history` | `kind` = `call`, `chat` or `all` (default); `q` (up to 200 characters, matched in the title and every turn); `range` = `7d`, `30d`, `90d` or `all`; `before` (cursor); `per_page` (default 25, at most 100) | `{items, next}` |
| GET | `/v1/pix-call/history/{id}` | | One conversation and its events |
| DELETE | `/v1/pix-call/history/{id}` | | `204`; `404` if not visible or already hidden |
| POST | `/v1/pix-call/feedback` | `{"pixLogUuid", "rating": "up"\|"down", "comment"?}` | `{ok: true}` |
| GET | `/v1/pix-call/memories` | `q`, `repo` (`owner/name`), `limit` | Notes, newest first |
| POST | `/v1/pix-call/memories` | `{"text", "repo"?}` | The note |
| DELETE | `/v1/pix-call/memories/{id}` | | |

`POST /v1/pix-call/history` is the call Worker's own write, idempotent on call and sequence number; it is not for clients.

```bash
curl "https://www.vulnetix.com/api/site/v1/pix-call/history?kind=call&range=7d&per_page=10" \
  -H "Authorization: Bearer $VULNETIX_SESSION_JWT"
```

> [!PIX] Asking about a past call
> Open the call in **Logs › Pix calls** and press **Call Pix**. Then say "Pick up where we left off on the payments-api session."
