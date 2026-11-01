---
title: Built-in tools
description: The tools a Belai agent works with, how code mode batches them into one script, how the workspace is bounded, attachments, diffs and the Bash rewrite table.
order: 8
sources: [belai/docs/agent-profiles.md, belai/docs/code-mode.md, belai/docs/web-fetch.md, belai/docs/diff.md, belai/docs/image-attachments.md, belai/docs/bash-rewrite.md, belai/internal/tools]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

## The tools

| Tool | Does |
|---|---|
| `Read`, `Glob`, `Grep` | Read files, find them by pattern, search them. With [knowledge](/software-factory/workforce/knowledge/), they also return related passages. |
| `Edit`, `Write` | Change files. [Language-server diagnostics](/software-factory/belai/lsp/) come back on the same result. |
| `Bash` | Run a command, in the [sandbox](/software-factory/belai/guardrails/) |
| `Cd` | Change directory, inside the workspace |
| `WebFetch` | Fetch a page. With a `prompt`, only the part relevant to it comes back. |
| `AskUserQuestion` | Ask you something |
| `ExitPlanMode` | Offer the plan, in plan mode |
| `ReadSession`, `SearchMemory` | Read a turn range of another agent's session; search memory and rules files (`AGENTS.md`, `CLAUDE.md` and the like) |
| `ReadResult` | Read the rest of a large result that was stored aside |
| `Code` | Code mode's script tool |
| Kanban tools | Workers claim, update, hand off and record verdicts on cards |
| MCP tools | `mcp__<server>__<tool>`, from [MCP servers](/software-factory/belai/mcp/) |

An agent profile can limit the tools it uses.

## Code mode

In code mode the model writes a short JavaScript script that calls tools as functions, and only what the script prints comes back. A job that would take thirty tool calls (read forty files, count matches, edit five places) becomes one call, and the intermediate results never enter the context. A script has no more authority than the same calls made one by one: every call inside it goes through the same permission rules and sandbox.

## The workspace

Belai's file tools are confined to the workspace: the directory you started in, plus any you add with `/add-dir`. Commands run in the sandbox, which bounds what they can write.

`/locate` lists the files the explore subagent may look at and where it would send its questions.

## Attachments

- `@path` attaches a file to your prompt.
- `/paste-image` attaches the image on the clipboard. Images are checked before a model sees them.

## Diffs

`/diff` opens a read-only pane of the working tree's changes: staged, unstaged and untracked, per file.

## The Bash rewrite table

The rewrite table changes commands before they run, for example to add a flag your project always needs, or to replace one tool with another. It is a [library item](/software-factory/workforce/library/) (`bash_rewrite` in settings), so it can travel between your machines.

## Related

- [How a turn runs](/software-factory/belai/how-a-turn-runs/)
- [Guardrails](/software-factory/belai/guardrails/)
