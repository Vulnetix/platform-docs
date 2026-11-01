---
title: Hooks
description: Run your own command at fixed points in a Belai session to log, lint, veto a tool call, or hand the model a note. Events, hook files and bundles, and what a hook may return.
order: 11
sources: [belai/docs/hooks.md]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

A hook runs a command of yours at a fixed point in a session. It can log, lint, veto a tool call, or hand the model a short note.

## Events

| Event | Fires | Can block |
|---|---|---|
| `session_start` | The TUI starts | no |
| `session_end` | The TUI exits | no |
| `user_prompt_submit` | A prompt is submitted, before any model call | yes |
| `pre_tool` | Before a tool call runs, after the permission rules | yes |
| `post_tool` | After a tool call returns | no |
| `pre_edit` | Before a `Write` or `Edit` | yes |
| `post_edit` | After a `Write` or `Edit` succeeds | no |
| `stop` | A turn ends | no |
| `pre_compact` | Before compaction | no |
| `subagent_stop` | An explore subagent finishes | no |
| `notification` | Belai is waiting on you | no |

Hook files written for Claude Code's names (`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SubagentStop`, `SessionStart`, `SessionEnd`, `PreCompact`, `Notification`) are read too.

## How a hook talks to Belai

A hook gets a JSON description of the event on standard input. Its exit code and standard output decide what happens: a blocking hook can deny the action with a reason, and any hook can return a short note that is shown to the model as untrusted text.

## Hook bundles

A hook bundle is a directory, `~/.vulnetix/belai/hooks/<name>/`, with a `hooks.json` and its scripts. Bundles can be kept in your [library](/software-factory/workforce/library/) and installed on another host, but only on request: a hook is never synced automatically, because it is code that runs.

`-allow-invalid-hooks` runs hooks that failed validation.

## Related

- [Notifications](/software-factory/workforce/notifications/), whose events also fire the `notification` hook.
