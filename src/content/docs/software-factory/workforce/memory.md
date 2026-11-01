---
title: Agent and repository memory
nav: Memory
description: Notes agents keep about a repository and lessons each worker keeps, shared across every host of your organisation, and the Memory page where people read and edit them.
order: 12
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/belai_memory.go, belai/internal/repomemory]
checked: [vdb-site@284f1d6, belai@35506b9, website@a31d470]
updated: 28 Oct 2026
---

Agents keep notes so the next session does not have to relearn the same things: "tests run with `just check`", "the payments API needs a local Redis". There are two scopes:

| Scope | Holds |
|---|---|
| `repo` | Notes about a repository, readable and writable by every agent working on it |
| `profile` | A worker profile's lessons |

Every note a host keeps is replicated to Vulnetix, so every host of your organisation shares the same notes, and a Pix Sandbox that restarts gets its notes back.

A note is at most 4 KiB of text with up to 16 tags. A scope keeps up to 500 live notes; the oldest beyond that are removed. Deleting a note leaves a marker, so a host with an old copy cannot bring it back.

## The Memory page

The Memory page (`/resolve/factory-memory`) lists notes by scope, with search over text and tags and a filter by agent. Owners and admins can add, edit and delete a note, or clear a whole scope. Every change is audited as kind `memory`, with the note's id and scope but never its text, and emits a `memory` event.

![The Memory page listing repository notes](/img/sf-memory-dark.webp)

> [!CAREFUL] Memory is not covered by the A2A blackout
> The blackout stops messages between hosts. Memory is persistence, like session sync, so notes keep replicating during a blackout.

A worker's own lessons are also on the command line: `belai agent memory NAME`, and `-clear` deletes them.

## API

| Method | Path | Who |
|---|---|---|
| GET | `/v1/factory/memory?scope=&scopeKey=&q=&agent=&includeDeleted=` | member |
| GET | `/v1/factory/memory/scopes` | member |
| POST | `/v1/factory/memory` | owner, admin |
| PATCH, DELETE | `/v1/factory/memory/{noteId}` | owner, admin |
| POST | `/v1/factory/memory/clear` | owner, admin |
| GET | `/v1/belai/memory` (how a host loads every note) | host |
