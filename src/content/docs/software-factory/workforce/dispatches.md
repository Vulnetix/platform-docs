---
title: Dispatching work to hosts
nav: Dispatches
description: A dispatch is a request to a host to start a session or workers. What a dispatch carries, its modes, how a host takes it, and how to start sessions on a host from the Resolve Platform.
order: 17
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-engine.md, belai/docs/remote-control.md]
checked: [vdb-site@284f1d6, belai@35506b9, website@a31d470]
updated: 28 Oct 2026
---

A **dispatch** asks a host to start something: a session in a directory, a worker for an agent profile, or a whole crew. The factory's crew steps make dispatches, and so do the Resolve Platform's **Start on** buttons, the Pix buttons and Pix calls.

A host picks up dispatches over its open connection, acknowledges each, and starts the work. The acknowledgement carries the session id, which is how a crew step follows its session.

## What a dispatch carries

| Field | Meaning |
|---|---|
| What to start | A session, a worker of a profile, or a crew |
| Directory | Where to run. For a self-hosted machine that can clone, a repository to clone instead. |
| Mode | `agent`, `plan`, `goal` or `code` |
| Model | Provider and model, or a built-in label |
| Brief | The task |
| Budget | Per-card limits that override the profile's |
| `stay` | Workers wait for work instead of exiting when the board is empty. The factory always sets it. |
| `ask` | Whether the session stops for permission asks |
| Trigger | What started it: a workflow run, a Pix call, the Resolve Platform, a finding, a pull request or the fleet view |
| Replicas | How many workers to start for one profile |

A host that is full refuses with its worker cap, and the crew step waits for room instead of failing, asking again every 10 minutes. See [Waiting for a machine](/software-factory/runs/waiting-for-a-machine/).

## From the Resolve Platform

The Workforce page's **Start on** chooses a host and starts an agent there. A session's page can send prompts, answers and commands to a running session. Pausing and stopping go through dispatches too.

## API

| Method | Path |
|---|---|
| POST | `/v1/belai/hosts/{hostId}/dispatches` |
| GET, DELETE | `/v1/belai/dispatches/{did}` |
| GET | `/v1/belai/hosts/{hostId}/dispatch` (a host long-polling for work) |
