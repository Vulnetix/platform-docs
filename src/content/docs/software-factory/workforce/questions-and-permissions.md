---
title: Agent questions, answers and permission offers
nav: Questions and permissions
description: When an agent stops to ask, the four kinds of question, answering from the Resolve Platform, the TUI or a call, permission rules, and the AI Firewall rules Belai offers when you state a permission.
order: 16
sources: [belai/docs/fleet.md, belai/docs/firewall-permissions.md, vdb-site/api/internal/handler/belai_answers.go, vdb-site/api/internal/handler/belai_open_asks.go, vdb-site/api/internal/handler/belai_permission_offers.go]
checked: [belai@35506b9, vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

An agent stops to ask when it needs a person. Its session waits, the question shows as a `question` checkpoint on [Checkpoints](/software-factory/decisions/checkpoints/) and in Needs you, and you answer it from wherever you are.

## Kinds of question

| Kind | Asks |
|---|---|
| `permission` | May I run this tool call? Answer allow once, allow always, or deny. |
| `clarify` | A question about the task. Answer in words. |
| `plan_review` | Here is my plan. Approve, or say what to change. |
| `mode_choice` | Which mode should I work in? |

## Answering

- **The session page** shows the question beside the transcript, with the answers it accepts.
- **The TUI**: the question appears in the session, and `/inbox` lists every card waiting on you: held at a checkpoint, assigned to you, or blocked.
- **A Pix call**: Pix reads it to you and answers with `answer_agent_question`. By voice, a permission is allow once or deny, never allow always.
- **A notification** can carry buttons that answer it.

The first answer wins: once one is applied or in flight, a second is refused.

## When agents do not ask

Workers that a workflow or schedule starts, and sessions Pix starts on a call, run with permission asks off unless `belai.ask_permission` is on: a tool call the rules would ask about is allowed, and guardrails still apply. See [Autonomy](/software-factory/control/autonomy/).

## Permission rules

`/permissions` in the TUI edits the tool permission rules: allow, ask or deny per tool and pattern, in your global settings and the project's. See [Guardrails](/software-factory/belai/guardrails/).

## Permission offers

When a prompt states a permission the AI Firewall can enforce, for example "don't send anything to pastebin", Belai offers matching guardrail rules on a card. It writes the rule to your AI Firewall only when you apply it, or automatically with `firewall.permission_auto_apply` on. A project's settings can switch offers off, never on. A Pix Sandbox lists its offers on its page.

## API

| Method | Path |
|---|---|
| POST | `/v1/belai/sessions/{id}/answers` (answer an open ask) |
| DELETE | `/v1/belai/answers/{aid}` (withdraw an answer the host has not claimed) |
| POST | `/v1/belai/answers/{aid}/ack` (the host's outcome) |
| GET | `/v1/belai/sandboxes/{id}/permission-offers` |
| GET | `/v1/factory/events/unanswered` (GitHub deliveries that started no run, not agent questions) |
