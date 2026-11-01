---
title: The agent builder and drafts
nav: Agent builder
description: Build an agent in the console. Draft every field from a sentence, edit its handoffs, check it against your library and workflows, and give it an avatar.
order: 2
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/belai_ai.go, vdb-site/api/internal/handler/belai_ai_draft.go, vdb-site/api/internal/handler/belai_drafts.go, belai/internal/agentdraft]
checked: [vdb-site@284f1d6, belai@35506b9]
updated: 28 Oct 2026
---

The agent builder (`/resolve/factory-agent?new=1`, or `?edit=<name>` for an existing agent) builds an agent profile in the browser. It saves to your library, from where hosts running `belai rc` install it.

## Drafting from a sentence

Describe the agent in a sentence, for example "a worker that fixes failing Go tests and opens a draft pull request". The builder drafts every field: the name, the system prompt, the tools, the mode, the claim lists and labels, where cards go on success and on failure, the workspace and the budget. You keep, change or reject each suggestion.

Drafts are made by a model Vulnetix runs, through `/v1/belai/ai-drafts`. `/v1/belai/ai/status` says whether that model is available for you. The same drafting runs on the command line as `belai agent draft PREMISE`, which writes the profile as Markdown.

A draft can also be made by one of your live Belai sessions with its host's own model: the builder sends the premise, the session posts its suggestions back, and you review them as a draft.

## Checks

The side panel checks the profile as you edit, against your library and your published workflows:

| Check | Means |
|---|---|
| Name is free | No other agent in your library has the name |
| Labels have a producer | Something files cards with the labels this agent claims |
| Label unclaimed | A label this agent adds is claimed by nothing, so those cards would wait for a person |
| Tokens fit the node budget | The agent's per-card tokens fit the budget of each workflow step that names it |
| Guardrails for worker | A worker has guardrails on |

Each check is `ok`, `warn` or `error`. The panel also shows **Who hands work to whom**: the agents that hand cards to this one, and the ones it hands to. See [Handoffs](/software-factory/runs/handoffs/).

## Avatars

Each agent can have an avatar, drawn as a variant of Pix. See [Avatars](/software-factory/workforce/avatars/).

## API

| Method | Path |
|---|---|
| POST | `/v1/factory/agents/check` with `{profile, name}` |
| GET | `/v1/belai/ai/status` |
| POST, GET | `/v1/belai/ai-drafts` |
| GET, DELETE | `/v1/belai/agent-drafts/{did}` |
| POST, GET, DELETE | `/v1/belai/agent-creators`, `/v1/belai/agent-creators/{id}` |
| | Profiles and names: `/v1/belai/library/profiles`, `/v1/belai/library/names/check` |
