---
title: "How the pieces fit: console, API, hosts and Belai"
nav: How the pieces fit
description: Where each part of Software Factory runs and how they talk to each other. Read this before you connect your own machines or debug a run that does not start.
order: 5
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-engine.md, vdb-site/docs/factory-operations.md, belai/docs/architecture.md, website/.repo/pix-call.md]
checked: [vdb-site@597344c, belai@8aa7760, website@58b9ffa]
updated: 28 Oct 2026
---

Software Factory has five parts. You use two of them directly: the Resolve Platform in your browser and, if you connect machines of your own, the Belai CLI.

| Part | Where it runs | What it does |
|---|---|---|
| Resolve Platform | Your browser, served from `www.vulnetix.com` | The Software Factory pages under `/resolve/factory*` |
| Factory API and engine | Vulnetix cloud | Stores workflows, runs, settings, budgets, events and the audit ledger. Advances runs. |
| Schedulers | AWS EventBridge Scheduler, Cloudflare, or a host | Fire cron triggers at the factory API |
| Hosts | A Pix Sandbox, or your own machine running `belai rc` | Run agent sessions with the repository checked out |
| Pix call worker | Cloudflare | Voice calls with Pix |

## The Resolve Platform and the API

Every console page reads the API under `/v1/factory` and `/v1/belai`, proxied as `/api/site/v1/...`. Every route needs a signed-in console session and acts on your tenant. A record that belongs to another tenant reads as not found, never as forbidden.

Reads never call GitHub. They come from the factory's own tables and from mirror tables that GitHub webhooks keep current. Every response carries `source` and `asOf`, so a page can show how old its data is. Only an action marked with a GitHub price, or a gate or output step, calls GitHub live.

> [!WHY] Why reads never call GitHub
> Your GitHub App installation has one rate limit, shared with your own CI and tools. If every page load spent calls, an open console tab could starve a release. Mirrors cost nothing to read, and the factory takes only its share of the limit, 10% by default.

## The engine

The engine has no timer that scans for work. A run moves only when something tells it to: a trigger fires, a step's session reports progress, a card changes list, a webhook arrives, a person decides an approval, the kill switch lifts, or a one-shot wake falls due (an approval deadline, a quota reset, a retry backoff, the end of a window). Each step is leased while it starts. A crew step parks with a 45 minute lease, which a live session keeps extending. If an engine task dies, a recovery pass releases expired leases and wakes the runs that were waiting.

## Triggers

- **GitHub events** arrive as webhooks at `POST /v1/webhooks/github`, signed by GitHub. The factory updates its mirror, then wakes matching triggers and waiting steps.
- **Other forges' events** (GHES, Gitea, Forgejo, GitLab) arrive at `POST /v1/webhooks/{kind}/{connection}`, checked against the [forge connection's](/software-factory/control/forge-connections/) secret, and are translated into GitHub's events before the same path runs.
- **Schedules** are fired by AWS EventBridge Scheduler (`runsOn: aws`), Cloudflare (`cloudflare`) or a host (`host`). A fire is a signed request to the factory's internal trigger endpoint. A fire that arrives while the factory is paused or stopped is answered `held` and starts no run; one during a maintenance window or blackout starts a run that waits as `held`.
- **Scanner results** uploaded by the Vulnetix CLI wake scan steps.
- **Labels and comments** (`sf:<name>`, `/sf <name>`) on issues and pull requests start a run of the named workflow.
- **The board**: a card moving list can start a run.
- **People** start runs by hand in the Resolve Platform or on a Pix call.

## Hosts

A host is any machine running Belai in remote control mode. It keeps a long-poll open to the API, advertises the repositories and directories it has, and takes **dispatches**: requests to start a session with a given agent, brief and limits. The host acknowledges the dispatch, runs the session, streams its transcript back and reports when it ends.

- A **Pix Sandbox** is a container Vulnetix runs for you, with Belai, the repositories you added, an egress policy and its own budget. A sandbox that is asleep is woken for factory work, with at most 6 wake requests an hour per sandbox.
- **Your own machine** joins with `belai rc`. It runs only what its operator allows. See [Remote control](/software-factory/workforce/remote-control/).

Hosts on one tenant can message each other through the [A2A relay](/software-factory/workforce/a2a-messaging/) and share [agent memory](/software-factory/workforce/memory/).

## Models

Agents call models through the provider routes on the [Budgets](/software-factory/cost/model-routing/) page: the Pix allocation that comes with your plan, or keys you hold in the Secrets Vault. Decision nodes call the System One classifiers (Clef, Clef Flash and Jev) through their own adapters and caps. The AI Firewall sits between Belai and every provider on a factory host.

## Pix calls

A call is handled by a Durable Object on Cloudflare. Your speech is transcribed, the Pix coordinator chooses tools, and the answer is spoken back. The tools read the same API the Resolve Platform does. Starting or stopping work needs a read-back and your yes. Call history keeps the words and the cards shown on screen, with no audio. See [Calling Pix](/software-factory/pix/calling-pix/).

## Belai

Belai is the agent harness inside every session, whether the factory dispatched it or you started it in a terminal. The same binary is the [CLI and TUI](/software-factory/belai/install-and-sign-in/) you use by hand, the remote control daemon (`belai rc`), and the editor bridge (`belai acp`).
