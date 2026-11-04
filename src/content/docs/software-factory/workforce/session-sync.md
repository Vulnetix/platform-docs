---
title: Session sync and object storage
nav: Session sync
description: How each Belai session is mirrored to the Resolve Platform, why the host stays the source of truth, prompting a session from the web, and the opt-out settings.
order: 23
sources: [belai/docs/session-sync.md, vdb-site/api/internal/handler/belai_sync.go, vdb-site/api/internal/handler/belai_objectstore.go]
checked: [belai@35506b9, vdb-site@284f1d6]
updated: 28 Oct 2026
---

While Belai is signed in with the Vulnetix CLI, each session is mirrored to the Resolve Platform:

- **Sessions running now** can be followed live, prompted, and answered, exactly as if you were at the host.
- **History** lists every synced session no longer attached to a running host, and the hosts' and agents' [audit logs](/software-factory/evidence/audit-ledger/).

## The host is the source of truth

The mirror is the session's own file. The host writes each transcript line to disk first, then sends it, keyed by its position. Nothing on the website composes a transcript entry. If the website is unreachable, the host keeps working and catches up later. Large content is kept in object storage and referenced from the transcript.

## Prompting from the web

A prompt typed on the session page runs on the host as if it were typed there. When the host stops to ask something (a permission, a question, a mode choice, a plan review), the page shows it and can answer it. See [Questions and permissions](/software-factory/workforce/questions-and-permissions/).

## Settings

| Setting | Default | Effect |
|---|---|---|
| `sync.enabled` | on | Mirror sessions at all. Off turns every sync off, including the library. |
| `sync.remote_prompts` | on | Let the website prompt a running session. Off, sessions still start from the website but take no follow-up prompts. |

The library's own switches (`sync.skills` and the rest) are on [Library](/software-factory/workforce/library/).

`/sync` in the TUI shows or changes session sync.

## API

| Method | Path |
|---|---|
| | Sessions: `/v1/belai/sessions`, `/v1/belai/sessions/{id}`, `/entries`, `/stream`, `/timeline` |
