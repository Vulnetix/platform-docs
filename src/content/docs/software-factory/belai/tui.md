---
title: The terminal UI
description: Find your way around Belai's terminal UI. The composer, the footer and its safety switches, slash commands, the keys, the screen switcher, settings and help.
order: 2
sources: [belai/README.md, belai/docs/tui-design.md, belai/docs/session-controls.md, belai/docs/settings.md, belai/internal/tui]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

Run `belai` in a project directory to open the TUI:

```sh
cd ~/code/my-project
belai
```

The first launch opens **Getting started**: three ideas with the commands and keys for each, and an offer to install the Vulnetix CLI and sign in. `/welcome` reopens it.

## The screen

- **The conversation**: your prompts, the agent's replies, tool calls and their results.
- **The composer**: where you type. `ctrl+left` and `ctrl+right` move by word; `home` and `end` jump to the ends of the line. `@` attaches a file. `!cmd` runs a shell line.
- **The agent strip**, in agent mode: the agents that can carry your turn. `tab` moves the highlight.
- **The footer**: the mode, the model, the safety switches, budgets and session intelligence, cycling every few seconds.

## Safety switches

The footer shows `guardrails: on|off` and `ask: on|off`.

| Key | Switch |
|---|---|
| `f3` | Guardrails: the posture gates on prompts and tool results |
| `f4` | Ask: stop and ask before a tool call the rules would ask about |
| `f10` | The AI Firewall, for this project |

`/yolo` turns guardrails and ask off together, and on again. See [Guardrails](/software-factory/belai/guardrails/).

## Keys

Shortcuts use `ctrl`, `shift` and the function keys, never `alt`, because `alt` chords are unreliable across terminals.

| Key | Does |
|---|---|
| `shift+tab`, `f5` | Cycle the mode: agent, plan, goal, code, auto |
| `ctrl+q` | Swap between the main model and the fast tier |
| `f6` | Reasoning effort |
| `f2` | Caveman: terser replies |
| `ctrl+r`, `ctrl+t` | Show or hide reasoning and tool calls |
| `f1` | The screen switcher. `f1` then a letter opens a screen, such as `b` for budgets or `i` for intel. |
| `f12` | Session intelligence |
| `esc` | Stop the running turn |

[TUI commands](/software-factory/belai/tui-commands/) lists every key binding the TUI handles.

## Slash commands

`/` opens autocomplete. `/help` lists every command and key in a scrollable screen. [TUI commands](/software-factory/belai/tui-commands/) is the full list; the main ones are on the pages for what they do. `/settings` views and edits settings. Your own custom commands run as `/<name>`.

## Settings

Belai reads a global settings file under `~/.vulnetix/belai/` and a project file at `.vulnetix/settings.json`. A project file cannot add MCP servers or firewalls, or switch sync on: a repository you clone can only make Belai more careful, never less. [Settings file](/software-factory/belai/settings-file/) lists every key.

## Related

- [Sessions](/software-factory/belai/sessions/)
- [Modes and plans](/software-factory/belai/modes-and-plans/)
