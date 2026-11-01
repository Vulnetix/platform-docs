---
title: Voice tools
description: Every tool Pix uses on a call, grouped by what it does, with whether it only reads or changes something and what confirmation it needs.
order: 2
sources: [website/src/worker/call/tools.ts, website/.repo/pix-call.md, website/src/shared/pix-pocket.ts]
checked: [website@a31d470]
updated: 28 Oct 2026
---

Pix answers and acts through tools. Each one calls the console's own API as you, so it can see and do only what you can. Reads run freely. Tools that start or stop work need your yes to a read-back first. See [Calling Pix](/software-factory/pix/calling-pix/).

## Factory figures

| Tool | Answers |
|---|---|
| `factory_stats` | Headline numbers: agents working, cards done, draft pull requests, gates holding, tokens and spend, what needs you |
| `needs_attention` | What is waiting on you: approvals, agents' questions, offline hosts |
| `oldest_checkpoints` | The oldest open checkpoints, how long each has waited, and the count by kind |
| `host_workload` | Online hosts, sessions against slots, full and offline hosts, budget used per host, and how often hosts went offline |
| `friction` | Where sessions hit trouble: tool errors, failed or interrupted turns and denied permissions, by tool, model and host, and hosts on an older Belai |
| `repo_activity` | Everything recent on one repository: sessions, runs, open findings, SLSA level |
| `queue_flow` | Whether a queue is growing: open now, the trend, work in against work done, typical wait and the oldest item |
| `lifecycle_coverage` | Whether the factory's figures can be trusted, stage by stage |

## Spend and value

| Tool | Answers |
|---|---|
| `factory_spend` | Spend and tokens for today, 7 days, 30 days or this month, the budget pace, and cost by model on screen |
| `delivery_value` | What the factory delivered and what a team would have needed; the hours and people for a month; the by-hand cost; the return on model use |
| `outcomes_trend` | Outcomes delivered and abandoned against the period before, and decisions made and escalated |
| `delivery_decisions` | Decisions made, how many went to a person and how fast people answered, how many a rule handled |
| `delivery_people` | Who took part: people, their actions and time, and contributors |

## Runs, sessions and hosts

| Tool | Answers |
|---|---|
| `list_runs` | Workflow runs, newest first |
| `run_facts` | One run: its steps and their status, and its pull request |
| `list_sessions` | Sessions, newest first, with filters |
| `session_facts` | One session: state, repository, branch, pull request, what it last said, any question it is waiting on |
| `sessions_aggregate` | Totals across recent sessions: how many, live, failed, stopped, tokens, typical length |
| `list_hosts` | Your Pix Sandboxes and own hosts, whether they are online, and their repositories |
| `find_repo` | Matches a repository you said aloud to one you can use, and the hosts that can take it |

## Starting, steering and stopping

| Tool | Does | Needs |
|---|---|---|
| `propose_session` | Prepares a session and the read-back. Up to 5 in one read-back. | |
| `start_session` | Starts every session in the read-back | your yes to the read-back, in your very next reply |
| `send_followup` | Sends a message to a running session's agent | read back in conversation |
| `answer_agent_question` | Answers the question a session is waiting on: a permission (allow once or deny) or a clarifying answer | |
| `propose_stop` | Prepares to stop a session and the read-back | |
| `stop_session` | Stops the session | your yes to the read-back |
| `propose_asks_off` | Prepares to turn permission asks off on a running session | |
| `turn_asks_off` | Turns asks off | your yes to the read-back |
| `turn_asks_on` | Turns asks back on | nothing: making a session safer needs no read-back |

## Memory and the call

| Tool | Does |
|---|---|
| `remember` | Keeps a note for future calls, only when you ask |
| `recall` | Searches notes from earlier calls |
| `forget` | Deletes a note when you ask, after saying which one |
| `hold_music` | Turns hold music on or off |

## Rules every tool keeps

- Arguments are checked. A stage or a checkpoint kind that is not valid makes Pix ask again; a range a tool does not know falls back to that tool's default.
- A route an older server lacks is said as "not available from this server yet".
- Spoken answers never name a model. Model names appear only in the tables on screen.
- Each tool shows its full table on screen and speaks a short summary.

The [voice tools reference](/software-factory/reference/voice-tools/) lists every tool with the description the model sees.
