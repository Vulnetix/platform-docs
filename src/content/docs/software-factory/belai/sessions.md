---
title: "Sessions: resume, export, compact and rename"
nav: Sessions
description: Manage Belai sessions in the TUI. Resume, branch from an earlier point, compact, export, rename, and keep tool output from filling the context window.
order: 5
sources: [belai/docs/session-controls.md, belai/docs/session-measures.md, belai/docs/session-assessment.md, belai/docs/context-offload.md, belai/internal/session]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

Every conversation with Belai is a session, kept on disk as a transcript and, while you are signed in, mirrored to the Resolve Platform. See [Session sync](/software-factory/workforce/session-sync/).

## Commands

| Command | Does |
|---|---|
| `/resume` | Resume a session by id, or browse sessions on disk |
| `/tree` | Browse this session as a tree: continue from an earlier point, or fork a branch |
| `/compact` | Summarise the session into a new one, to free context |
| `/export` | Write this session, or one by id, as Markdown |
| `/rename` | Rename the session |
| `/clear` | Start a new session |
| `/exit` | Quit, and print the card to resume it later |

From the command line, `belai -resume ID`, `belai -continue` and `belai -export ID` do the same.

## Keeping the context small

Most of what an agent sends a model is tool output: build logs, test runs, web pages. Belai keeps it from filling the context window:

- Oversized results are stored aside and replaced with a preview. The model can read the rest with `ReadResult` when it needs it.
- Long shell output keeps its head and tail.
- Web pages are read through a role that extracts what was asked for.

All of this keeps the start of the conversation unchanged, so the provider's prompt cache keeps working. The `offload` settings tune it.

## Plan progress

`/todos` shows the session's own plan: the steps the agent set out and which are done.

## Session intelligence

`f12` or `/intel` shows plan limits, pace, trend and runway for the model you are using. See [Token budgets](/software-factory/belai/token-budgets/).

## Related

- [Teleport](/software-factory/workforce/teleport/) to continue a session on another machine.
- [Sessions in the factory](/software-factory/runs/sessions/)
