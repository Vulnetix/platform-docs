---
title: The cockpit
description: The Software Factory home page. The headline figures, Needs you, the live lanes of runs, recent decisions, the control plane, and the Fleet, Health and Delivery views.
order: 1
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_summary.go, website/.repo/software-factory.md]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

The cockpit (`/resolve/factory`) is the first page of Software Factory in the console. One request paints it, and the event stream keeps it live.

You choose the **scope**: your managed orgs (the default), every installation, or one org. And the **range**: the last 24 hours (the default), 7 days or 30 days. "Today" starts at midnight in your own timezone.

## Headline figures

| Figure | Shows |
|---|---|
| Tokens today | Tokens used, by source (sandbox fast, sandbox smart, your keys, runs), against the day's budget, with a projection to the end of the day |
| Spend today | US dollars, by source |
| System One calls | Decisions made today against the daily cap, by model and by source |
| Working | Crews and agents working now |
| Done today | Cards verified today |
| Free slots | Free worker slots across your hosts |
| Draft PRs | Open draft pull requests, and how many passed their gates |
| Gates holding | Gates waiting, and how many need a person |
| Firewall blocks | Package Firewall and AI Firewall blocks |
| GitHub quota | Calls left on the installation, the factory's use, and when it resets |
| Cache hit rate | The share of model input served from cache, against last week |

## Needs you

The head of the [Checkpoints](/software-factory/decisions/checkpoints/) queue: approvals, agents' questions, held and blocked cards, pull requests waiting for review, outside issues, lapsed claims, hosts offline, merge conflicts and signing keys that dropped off GitHub. Each links to what it is about.

The cockpit also holds **Pause all automations**. See [Pause, stop and resume](/software-factory/control/pause-and-stop/).

## Lanes and live sessions

Each active run is a lane: its workflow and repository, its steps with their status, its tokens against its budget, and the host it runs on. Live sessions are listed with their host, repository, agent and state.

## Decisions

The latest decisions, from runs and from sessions, with the model, outcome, confidence, threshold and action. Each links to its event.

## Control plane

What feeds the factory and where its work goes:

- **Inputs**: managed orgs, the webhook events arriving, schedules, finding triggers
- **Package Firewall**: ecosystems covered and blocks in the last 24 hours
- **Sandbox**: size, workers busy, live sessions, crews running, the queue, repositories ready, the image, and System One use
- **Hosts**: each host's kind, whether it is online, its workers and sessions, and its Belai version
- **AI Firewall**: allows, redactions, flags and blocks
- **Outputs**: draft pull requests, board sync, the evidence formats, TEA publishing
- **Providers**, **persistence** and egress denials in the last 24 hours

## Repository signals

Where the cockpit counts repositories, it counts them by signal: `app`, `scanned`, `pix`, `kanban`, `tea`, `watched` and `uploads`. See [Managed scope](/software-factory/control/managed-scope/) for what each means.

## Other views

| View | Shows |
|---|---|
| Fleet | Every host: slots, heartbeats, what it is running |
| Health | Host health over time |
| Delivery | What the factory delivered. See [Delivery](/software-factory/evidence/delivery/). |

> [!PIX] The cockpit by phone
> "How's the factory doing?" gets the same headline figures from `factory_stats`, and "what needs me?" reads Needs you with `needs_attention`.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/summary?scope=&range=&tz=` |
| GET | `/v1/factory/needs` |
| GET | `/v1/factory/fleet` |
| GET | `/v1/factory/state` |
