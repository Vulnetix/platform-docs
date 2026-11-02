---
title: Hooks
nav: Overview
description: The three Pix hooks, the events they answer, the two response shapes they emit, and why they stay silent when they have no verdict.
order: 1
sources: [cli/cmd/agent.go, cli/internal/agent/hook.go, cli/internal/agent/run.go, cli/internal/agent/install.go, pix-ai-coding-assistant/vulnetix/hooks/hooks.json]
checked: [cli@4c8c3b7, pix-ai-coding-assistant@7aebf02]
updated: 02 Nov 2026
---

All three hooks are one command, `vulnetix agent hook`. The host sends its hook payload on stdin; the command writes the host's response on stdout, or nothing. One binary serves Claude Code and Codex alike and runs on Windows.

| Hook | Fires on | Question it answers | Default when it has something to say |
|---|---|---|---|
| [`dependency-guard`](/pix/hooks/dependency-guard/) | `PreToolUse` on a shell install command, or on a write to a dependency manifest | Is the package about to land acceptable under this repository's Safe Harbour policy? | Blocks known malware and a critical advisory being exploited; warns on the rest |
| [`change-guard`](/pix/hooks/change-guard/) | `PreToolUse` on `git commit` or `git push` | Does the change about to be recorded carry a credential? | Blocks |
| [`session-context`](/pix/hooks/session-context/) | `SessionStart` and `UserPromptSubmit` | What did the last scan of this repository find, and does a CVE or GHSA the prompt names reach it? | Informs |

A shell command is one question, never both: a `git commit` or `git push` goes to the change guard, anything else is parsed for install commands.

## Decisions

| Decision | Output | What the agent sees |
|---|---|---|
| Silent | Nothing on stdout | Nothing. The tool call proceeds. |
| Inform | `additionalContext` | The finding, in its own context, and the call proceeds |
| Block | `permissionDecision: "deny"` with a reason | The call is refused with a reason it can act on |

Exactly two JSON shapes are emitted, the two Claude Code and Codex both accept:

```json
{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"..."}}
```

```json
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"..."}}
```

`permissionDecision: "allow"` is never sent; Codex fails a hook that sends it, and the hook is adding information, not granting permission. `systemMessage` is not used, because it reaches the person and not the model.

> [!WHY] Silence is the default
> A guard that comments on every install is one people switch off. The dependency guard prints nothing when the package satisfies the policy, and nothing when it cannot get an answer: an unparseable payload, an unreachable API, a missing credential and a timeout are all "no opinion", not a refusal. The exit status is always `0`.

## Command reference

```bash
vulnetix agent hook [--event <name>] [--root <dir>]
```

| Flag | Default | Meaning |
|---|---|---|
| `--event` | the payload's `hook_event_name` | `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `SessionStart` or `Stop`, for a payload that carries none. Only the first, third and fourth produce output. |
| `--root` | the payload's `cwd`, then the working directory | Repository root: where `.vulnetix/agent.yaml` and `.vulnetix/memory.yaml` are read |

Payload fields read: `hook_event_name`, `cwd`, `tool_name`, `tool_input` (`command`; `file_path` or `path`; `old_string`, `new_string`, `content`), and the prompt as `prompt` or `user_input`. A shell tool is any tool named `bash`, `shell`, `run_terminal_cmd`, `terminal`, `execute_command` or `run_command`, or containing `shell`, `bash` or `terminal`. A write tool is `edit`, `write`, `multiedit`, `str_replace_editor`, `create_file`, `apply_patch` or `update_file`, or contains `edit`, `write` or `patch`.

While answering a hook the CLI prints no banner, sends no analytics and does not check for updates, because stdout belongs to the host.

## Policy

What blocks, what warns and what stays silent is set per repository in [`.vulnetix/agent.yaml`](/pix/hooks/policy-file/). Without the file the defaults apply.
