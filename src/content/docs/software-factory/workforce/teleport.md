---
title: "Teleport: move a session between hosts"
nav: Teleport
description: Continue a session from another host, a Pix Sandbox or the web on the machine in front of you, with its conversation and its uncommitted changes.
order: 20
sources: [belai/docs/teleport.md, vdb-site/api/internal/handler/belai_teleport.go, vdb-site/api/internal/handler/belai_teleport_code.go]
checked: [belai@35506b9, vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

Teleport continues a session of your account on the machine you are at. The session may have run on another host, in a Pix Sandbox or on the web. **The original keeps running where it is.** The copy gets a new session id and opens in the terminal UI.

```sh
cd ~/src/api
belai -teleport 3f2a9c10-6b7e-4c1d-8a52-0d9e4f1b7a33
```

A session card on the website, and the session page, copy this command with one click.

## What moves

- The conversation, so the agent picks up where it was
- The agent profile and crew the session used, from your library
- Files the session attached
- **Code**: the session's uncommitted and unpushed changes

## How code moves

| Option | Moves the changes as |
|---|---|
| Default | A patch, replayed on this machine |
| `-teleport-push` | The origin host pushes them as one `belai/teleport/<id>` branch, which this machine fetches |

Whether the origin host pushes is its own `teleport.push` setting: `ask` (the default) pushes only when you passed `-teleport-push`, `allow` pushes whenever a teleport asks, and `never` always sends a patch. `-teleport-ref` checks out a ref or commit other than the one the session was at.

> [!CAREFUL] Teleport copies, it does not move
> Both sessions keep running. If you meant to hand the work over, stop the original once the copy is going, or the two will work over each other.

## API

| Method | Path |
|---|---|
| POST | `/v1/belai/hosts/{hostId}/teleports` |
| GET | `/v1/belai/hosts/{hostId}/teleports/{tid}`, `/entries`, `/files/{sha}` |
| POST | `/v1/belai/hosts/{hostId}/teleports/{tid}/ack`, `/replay` |
| PUT | `/v1/belai/hosts/{hostId}/teleports/{tid}/code` |
| GET | `/v1/belai/sandboxes/{id}/teleports` |
