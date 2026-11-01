---
title: Modes, plan mode and goals
nav: Modes and plans
description: Belai's five modes and when to use each, how auto mode chooses, plan files and what you can do with one, and how goal mode keeps working until a goal is met.
order: 4
sources: [belai/docs/architecture.md, belai/docs/session-controls.md, belai/docs/plan-mode-tuning.md, belai/docs/code-mode.md, belai/docs/role-manager.md]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

A mode decides how Belai works on a prompt. `shift+tab` or `f5` cycles them, and `/mode` shows or sets one.

| Mode | Works by |
|---|---|
| `agent` | The default. Read, edit and run, a turn at a time, with an agent profile if you engage one. |
| `plan` | Read-only. Investigates and writes a plan file under `.vulnetix/plans/`, then offers it to you. |
| `goal` | Keeps working, pass after pass, until the goal is met or progress stalls |
| `code` | Agent mode with one extra tool: the model writes a short script that calls tools as functions, and only what the script prints comes back. Thirty tool calls become one. |
| `auto` | No mode is held. A classifier picks the mode for each prompt. |

## Plan mode

Plan mode never edits. Every plan turn ends the same way: a plan file under `.vulnetix/plans/`, offered for you to approve, refine or leave.

| Command | Does |
|---|---|
| `/execute` | Leave plan mode and carry out the plan |
| `/refine` | Ask for changes to the plan |
| `/handoff <plan file> [direction]` | Run a plan file directly, with optional extra direction |

With remote control, a plan from a web session is offered as a plan review on the session page.

## Goal mode

A goal prompt runs a **pass loop**. When a pass uses its iterations, an evaluator decides whether the work advanced, and the loop continues while it does. It is stopped by a stall, not a counter. `esc` returns the partial result.

When the classifier sends a prompt to goal mode, Belai drafts a **goal contract**: your prompt word for word as the objective, then how to verify it (only the test commands the repository really has), constraints, boundaries and when to stop. A goal you saved earlier is used as you wrote it.

A finished goal raises the `goal_done` notification; one that stalled, `goal_stalled`.

## Guardrails and ask, together

`/yolo` turns guardrails and ask off together, or back on. Do it only in a sandbox you are ready to lose. See [Guardrails](/software-factory/belai/guardrails/).

> [!WHY] Why plan mode is never told to start editing
> Agent and goal mode carry a short instruction to start editing as soon as the change is clear. Plan mode leaves it out on purpose: its promise is that it changes nothing.

## Related

- [How a turn runs](/software-factory/belai/how-a-turn-runs/)
- [Sessions](/software-factory/belai/sessions/)
