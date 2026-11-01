---
title: The workflow builder
nav: Builder
description: The canvas you build workflows on. The node palette, which agents a step can dispatch, the decision inspector's statistics, and the handoff map.
order: 2
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_palette.go]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

The builder is the canvas on the Workflows page. You drag steps from the palette, connect them, and edit each one in the inspector on the right. Changes are saved to the draft. See [Workflow graphs](/software-factory/workflows/graphs/) for saving, publishing and dry runs.

![The workflow builder with a graph on the canvas and the step inspector open](/img/sf-workflow-builder-dark.webp)

## The palette

| Group | Holds |
|---|---|
| Triggers | Webhook events, label, finding, kanban, cron and manual |
| GitHub reads | Where a step reads GitHub from: posture (the default), raw files in storage, the webhook payload, or a live API read that costs 1 to 3 calls |
| System One | Classify, gate, route and score decisions |
| Crews | Your library's crews, and the built-in crews with their members |
| Agents | Every agent you can dispatch, workers first |
| Gates | Quality gate, release jail, tests, budget check, human approval |
| State | S3 object, Postgres table, kanban card |
| Outputs | Draft PR, issue comment, TEA publish, notify, VEX, PR review, approve when ready |

Your own crews and agents come from your library. Built-in agents are listed by their canonical names, such as `belai:scout`. A graph may also name a built-in by its bare name (`scout`), which the engine accepts.

## Which agents a step can dispatch

A crew step dispatches a **worker**, and hosts advertise only worker-mode agents. Of Belai's built-in agents, the workers include `belai:builder`, `belai:designer`, `belai:patcher`, `belai:planner`, `belai:repro`, `belai:reviewer`, `belai:scout`, `belai:verifier`, `belai:vuln-scout`, `belai:test-fixer`, `belai:lint-fixer`, `belai:pr-reviewer` and the event workflow agents. See [Agents](/software-factory/workforce/agents/) for the full list.

The others run as background agents (mode `single`), for example the `deps-*` agents, `triage`, `debug` and `vulnetix-scanner`. The palette shows them greyed out with the reason: "Runs as a background agent, not a worker, so a workflow cannot dispatch it." If a graph names one anyway, the validator warns with `agent_not_dispatchable`. It is a warning, not an error, but such a step would find no host.

## The decision inspector

Select a decision step of a published workflow to see what it decided over the last 30 days:

- how many decisions it made
- the share of each outcome
- how often confidence was under the threshold
- escalations, and how many a person overrode

The stats route also takes 7 or 90 days, and reports which models answered.

## Handoffs

The edges inside a crew come from your agents' handoff rules: which list and labels each agent claims, what it does on success and on failure, and who it hands to. The map of them appears in the agent builder as "Who hands work to whom". Labels that an agent adds but no agent claims are flagged, because work with those labels would sit unclaimed.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/workflows/palette` |
| GET | `/v1/factory/workflows/{id}/nodes/{nodeId}/stats?range=30d` |
| GET | `/v1/factory/handoffs` |
