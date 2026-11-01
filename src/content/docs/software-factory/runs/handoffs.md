---
title: Handoffs between agents
nav: Handoffs
description: How work passes from one agent to the next inside a crew. Claim lists and labels, success and failure moves, and the handoff map the builders draw.
order: 6
sources: [vdb-site/docs/factory.md, belai/docs/agent-profiles.md, belai/docs/kanban.md]
checked: [vdb-site@284f1d6, belai@35506b9, website@a31d470]
updated: 28 Oct 2026
---

Agents in a crew do not call each other. They hand work over through the [board](/software-factory/workforce/board/): each agent claims cards from a list with certain labels, works on them, and moves them on. The next agent claims what the first one moved.

Each agent profile says:

| Field | Meaning |
|---|---|
| `claims` | The lists it takes cards from (`kanban.lists`: `backlog` and/or `review`) |
| `labels` | The labels a card must all carry for it to claim it |
| `on_success` | Where it moves a card when it succeeds, and labels it adds, such as review with `needs-verify` |
| `on_failure` | Where it moves a card when an attempt fails; by default the list it was claimed from |
| `handoff_to` | The agents it may file new cards for |

For example, `vuln-scout` files a `vuln` card for each finding. `patcher` claims backlog cards labelled `vuln` and moves them to review labelled `needs-verify`, where `verifier` picks them up.

A crew step's card stays in progress until the last member moves it, and that move is what finishes the step. See [Crew node](/software-factory/workflows/nodes/crew/).

## The handoff map

`GET /v1/factory/handoffs` reads the agent profiles your hosts report and returns:

- each agent's claims, labels, success and failure moves, and who it hands to
- the edges between agents
- **unclaimed labels**: labels an agent adds that no agent claims. Work with such a label waits for a person.

The agent builder shows this map as "Who hands work to whom". The agent builder's checks also flag a label you add that nothing claims.

## Related

- [Agents and agent profiles](/software-factory/workforce/agents/)
- [Crews](/software-factory/workforce/crews/)
