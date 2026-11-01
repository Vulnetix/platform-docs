---
title: Sessions
description: A session is one Belai conversation on a host. How sessions are listed and classified, what started each one, their end states, the session page, and what you can do to a live session from the console.
order: 5
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_sessions_aggregate.go, vdb-site/api/internal/handler/belai_trigger.go, website/.repo/session-trigger.md]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

A **session** is one Belai conversation on one host. A crew step's workers are sessions, and so is anything you start by hand: in a terminal, in your editor, on a Pix Sandbox's web page, or on a Pix call. The **Sessions** tab on the Runs page lists them all, and opening one (`/resolve/factory-session`) shows its transcript.

## Where a session comes from

| Source | Started by |
|---|---|
| `worker` | A crew step's dispatch |
| `cloud` | A dispatch to a machine running `belai rc`, other than a crew worker |
| `sandbox` | A session on a Pix Sandbox |
| `tui` | Anything else, such as the Belai terminal UI |
| `acp` | An editor through ACP |

Each session also records **what started it**, its trigger:

| Trigger source | Meaning |
|---|---|
| `workflow` | A factory run's crew step. Also names the run, the workflow, how it was triggered (`cron`, `webhook` and so on) and the GitHub event and delivery. |
| `pix_call` | Pix started it on a call |
| `console` | Someone started it from the console |
| `finding` | Started from a finding |
| `pull_request` | Started from a pull request |
| `fleet` | Started from the fleet view |

Only the server sets the run and event fields. A browser may send only the source, the repository and a note. Every field is cleaned of control and direction-changing characters and cut to length.

## End states

| State | Means |
|---|---|
| `live` | Running and reporting in. |
| `stopped` | Someone stopped it, or it was interrupted, or it ended mid-turn. |
| `failed` | Its last turn ended in an error, or it went silent without ending. |
| `ended` | Finished normally. |

## The list

Filter by source, state (`live`, `ended`), crew, agent, host, run, card, repository or text. Sessions whose directory is under `/tmp` are hidden unless you ask for them, and the count of hidden ones is shown.

A session stores its directory and host, not a repository. The repository is worked out from the session's own git state, then from the directories its host offers.

## The session page

Beside the transcript, the page shows what Belai does not store itself:

- the run, step, card, crew, agent and replica that started it, when a run did
- the budgets it is spending against: the card's and the run's
- git: the branch, the pull request and its checks, whether it syncs with the default branch, and the GitHub token it was given
- its trigger

Sessions no run started show only the Belai panels.

From the page you can, using the existing session routes:

- read the transcript, live
- send a prompt, answer the agent's questions, and run session commands
- open a shell on the host, if the host allows it
- switch **sync with main** on or off
- stop the session, or delete it (which writes a tombstone to the audit ledger)
- share it, or [teleport](/software-factory/workforce/teleport/) it to another host
- **Re-check on GitHub** reads the pull request and its checks live, for 1 GitHub call

## Counting sessions

`GET /v1/factory/sessions/aggregate` counts sessions over `24h`, `7d` or `30d`, optionally for one repository and grouped by `repo`, `state`, `source` or `model`. It gives totals for live, ended, failed and stopped sessions, the tokens they used, and their median length. Pix uses it to answer "how did my sessions go this week?".

> [!PIX] Sessions by phone
> Pix lists sessions with `list_sessions`, sums them with `sessions_aggregate`, and reads one with `session_facts`. It can send a live session a message (`send_followup`), answer its question (`answer_agent_question`), and stop it after a read-back.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/sessions?source=&state=&crew=&agent=&host=&run=&card=&repo=&q=&tmp=` |
| GET | `/v1/factory/sessions/aggregate?range=&repo=&groupBy=` |
| GET | `/v1/factory/sessions/{id}/context` |
| GET | `/v1/factory/sessions/{id}/facts` |
| POST | `/v1/factory/sessions/{id}/git/recheck` |
| | Transcript, prompts, answers, commands, shell, stop, git sync, delete: `/v1/belai/sessions/{id}/...` |
