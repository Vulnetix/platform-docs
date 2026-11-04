---
title: Agents and agent profiles
nav: Agents
description: Agent profiles, the five modes, worker profiles, the built-in agents a workflow can dispatch, and managing agents from the Resolve Platform and command line.
order: 1
sources: [belai/docs/agent-profiles.md, belai/docs/guardian.md, vdb-site/api/internal/handler/factory_templates_guardian.go, belai/docs/fleet.md, belai/cmd/belai/agentcmd.go, vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_workforce.go]
checked: [belai@ea3372a, vdb-site@fe1ff17, website@a31d470]
updated: 03 Nov 2026
---

An **agent** is a Belai profile: a name, a system prompt, the tools it may use, a mode, and limits. The Workforce page (`/resolve/factory-workforce`) lists your agents and crews and the workers running now.

## A profile

```json
{
  "name": "review-bot",
  "description": "Reviews open PRs for style issues",
  "system_prompt": "You are a code-review bot...",
  "tools": ["Read", "Bash", "Grep"],
  "mode": "worker",
  "max_iterations": 5,
  "autonomy": "supervised",
  "provider": "anthropic",
  "model": "claude-sonnet-5",
  "effort": "low",
  "guardrails": true,
  "ask_permission": false
}
```

| Field | Meaning |
|---|---|
| `name`, `description` | Required. The name is how you start it. |
| `system_prompt` | Required. Sent on every turn. |
| `tools` | The tools it may use. Empty means all of the default set. |
| `mode` | `single`, `loop`, `scheduled`, `monitor` or `worker` |
| `max_iterations` | Rounds per run. Defaults to the global `resilience.max_iterations` (40). |
| `autonomy` | `supervised` (the default) or `autonomous`: what a loop does when it runs out of iterations |
| `provider`, `model`, `effort` | The model it runs on. Left out, it inherits the session's. A profile can only name a provider, never define one. |
| `guardrails` | Must be on for a worker |
| `schedule`, `monitor_condition`, `reflection` | For scheduled and monitor agents, and to make the model reason before acting |

Profiles are stored under `~/.vulnetix/belai/profiles/agents/` (or `$BELAI_HOME`), and synced to your library when the host runs `belai rc`.

### Modes

| Mode | Runs |
|---|---|
| `single` | Once, as a background agent |
| `loop` | Repeatedly until done or out of iterations |
| `scheduled` | On a schedule |
| `monitor` | When a condition holds |
| `worker` | Claims cards from the board and works each as a goal. **Only workers can be dispatched by the factory.** |

## Worker profiles

A worker claims cards that match its profile, works each in its own git worktree, and moves it on. Its `kanban` block decides what it claims and where cards go:

| Field | Meaning |
|---|---|
| `kanban.lists` | `backlog` and/or `review`. Default `backlog`. |
| `kanban.labels` | Labels a card must all carry |
| `kanban.assigned_only` | Claim only cards assigned to this profile |
| `kanban.on_success` | Required. Where a finished card goes, labels to add or drop, and an optional checkpoint for a person (`plan_approval`, `root_cause`, `visual`, `pre_pr`) |
| `kanban.on_failure` | Where a failed attempt goes. Default: back where it came from. |
| `kanban.handoff_to`, `kanban.handoff_labels` | Who it may hand new cards to |
| `kanban.max_attempts` | Failed attempts before the card is blocked. Default 3. |
| `kanban.max_continuations` | Times a card that ran out of budget with progress made may be resumed. Default 5. |
| `kanban.lease`, `kanban.poll` | The claim lease (default 20 minutes) and idle poll (default 30 seconds) |
| `kanban.survey` | What to file and work on when the board has nothing for it |
| `workspace.isolation` | `worktree`, `shared` or `none`. A worker that can write needs isolation. |
| `workspace.read_only` | Run checks but change nothing |
| `workspace.publish` | `none`, `agent` (it may push and open a draft pull request) or `draft_pr` |
| `budget.max_cost_usd_per_item` | The estimated cost at which a claim ends. An autonomous worker needs this or a pass limit. |
| `budget.finalize_at` | The share of any limit at which it is told to wrap up. Default 0.85. |
| `memory.enabled` | Its lessons file |

A factory dispatch can override every budget value and the attempt limits. See [Budgets](/software-factory/cost/budgets/).

Validation fails closed: a worker needs `on_success`, can only claim from backlog or review, cannot turn guardrails off, and needs isolation if it can write.

## Built-in agents

Belai ships these profiles. The **workers** can be dispatched by a workflow:

`belai:builder`, `belai:conflict-resolver`, `belai:designer`, `belai:patcher`, `belai:planner`, `belai:repro`, `belai:reviewer`, `belai:scout`, `belai:verifier`, `belai:vuln-scout`, `belai:test-fixer`, `belai:lint-fixer`, `belai:pr-reviewer`, and the event workflow agents `belai:ai-capability-reviewer`, `belai:alert-triager`, `belai:ci-explainer`, `belai:dep-scope`, `belai:dep-strategist`, `belai:egress-reviewer`, `belai:flaky-hunter`, `belai:github-investigator`, `belai:package-reviewer`, `belai:pr-steward`, `belai:release-steward`, `belai:repo-onboarder`, `belai:secret-triager`, `belai:tea-publisher`, `belai:ticket-writer`, `belai:workflow-fixer` and `belai:workflow-hardener`. `belai:workflow-fixer` fixes one GitHub Actions misconfiguration Vulnetix found and opens a draft pull request with the change; `belai:github-investigator` investigates a risky change on GitHub and says whether it was expected, needs its owner, or is an incident.

The Guardian workers take cards a [Guardian](/siem/) trigger fire files through the Guardian workflows (source `siem`):

| Worker | Claims | Does |
|---|---|---|
| `belai:guardian-aws-investigator` (built-in profile `guardian-aws-investigator`) | Backlog cards labelled `sf:guardian-aws` | Investigates an AWS fire (VPC flow, Route 53 Resolver query and CloudTrail rows) with read-only `AWS` commands, in a read-only worktree |
| `belai:guardian-cloudflare-investigator` (`guardian-cloudflare-investigator`) | Backlog cards labelled `sf:guardian-cloudflare` | Investigates a Cloudflare fire (firewall, HTTP, DNS, Gateway, network analytics and audit rows); its `CF` tool sends GET requests only |
| `belai:guardian-remediator` (`guardian-remediator`) | Backlog cards labelled `sf:guardian-remediate` | Makes the one change the investigation names in the repository's infrastructure as code and opens a draft pull request, or writes the commands into the ticket when the resource is not in code. It has no cloud tool and never merges. |

An investigator treats the rows and everything it reads as data, cites the documentation page for every claim about a service and the command for every claim about the account, says "not verified" for anything it did not check, and ends with one verdict: benign, needs an owner, or incident. The investigators are capped at 3 USD, 20 passes and 2 hours per item, the remediator at 5 USD.

These run as **background agents** and cannot be dispatched: `belai:debug`, `belai:fanout`, `belai:plan-handoff`, `belai:triage`, `belai:triage-vulns`, `belai:vulnetix-scanner`, and the dependency agents `belai:deps-apple`, `belai:deps-ci`, `belai:deps-containers`, `belai:deps-dotnet`, `belai:deps-go`, `belai:deps-javascript`, `belai:deps-jvm`, `belai:deps-other`, `belai:deps-php`, `belai:deps-python`, `belai:deps-ruby` and `belai:deps-rust`.

The workflow builder shows background agents greyed out with the reason. A graph may name a built-in bare (`scout`) or with its prefix (`belai:scout`).

## The Workforce page

- **Agents** and **Crews and control center** tabs list your library's agents and crews with the workers running for each.
- **Used by workflows** filters to the agents and crews your workflows use.
- From a row you can start an agent on a host, pause it, pause all, message a crew, download a crew's definition, or open the [agent builder](/software-factory/workforce/agent-builder/).

## In the terminal

`/agent` picks an agent profile or manages background agents. `/agents` shows live agents, workers, profiles and the audit trail. `/profile` switches the session's prompt profile.

## On the command line

| Command | Does |
|---|---|
| `belai agent list` | Agent profiles and their modes. `-json` for JSON. |
| `belai agent show NAME` | One profile as JSON |
| `belai agent validate FILE` | Check a `.json` or `.md` profile |
| `belai agent import FILE` | Validate and save a profile. `-force` replaces one of the same name. See [Importing agents](/software-factory/workforce/agent-import/). |
| `belai agent draft PREMISE` | Draft a profile from a sentence |
| `belai agent crews`, `belai agent crew` | Crews and their members; import, export or delete a crew |
| `belai agent files NAME` | The files an agent carries |
| `belai agent memory NAME` | A worker's lessons. `-clear` deletes them. |
| `belai agent knowledge` | The retrieval indexes. See [Knowledge](/software-factory/workforce/knowledge/). |
| `belai agent run NAME` | Run a worker in the foreground |
| `belai agent start NAME` | Start detached workers and print their ids. `-replicas N` for more than one. |
| `belai agent runs` | Crew runs. `-all` includes ended runs. |
| `belai agent control ID` | Change running workers from their next round |
| `belai agent supervise -run ID` | A crew run's supervisor, started for you by `start` |
| `belai agent ps` | Running workers |
| `belai agent logs ID` | A worker's log. `-f` follows, `-n` sets the lines (default 40). |
| `belai agent pause ID`, `resume ID` | Finish the card in hand and claim nothing more; claim again |
| `belai agent stop ID` | Stop workers or a crew run. `-all` stops every one. Their cards go back to the board. |
| `belai agent status` | Workers and this project's board |

Flags for `run` and `start`:

| Flag | Meaning |
|---|---|
| `-once` | Work one card (or find none) and exit |
| `-item K-xxxxxx` | Work this card |
| `-trust-dir` | Trust the repository first |
| `-provider`, `-model`, `-effort` | Override the model |
| `-stay` | Keep waiting for work instead of exiting once nothing is left |
| `-stay-idle-max` | With `-stay`, exit after this long with nothing to claim. Default 6 hours, at most 24. |
| `-drain` | Exit once nothing is left, even with a schedule |
| `-ask-off` | A tool call that would ask is allowed instead of blocking the card |
| `-web-controls` | Take session controls from the website. See [Remote control](/software-factory/workforce/remote-control/). |
| `-web-allow-guardrails-off` | With `-web-controls`, allow the website to turn guardrails off |
| `-replicas` | Workers of the profile (default 1) |
| `-crew`, `-dir`, `-pool`, `-switch-after`, `-final-retry`, `-fill` | Start a crew run. See [Crews](/software-factory/workforce/crews/). |
| `-max-workers` | The worker cap to reserve under |
| `-json` | Print JSON |

`-from`, `-name`, `-yes` and `-force` are for imports. `-all` lists ended crew runs, and `-clear` deletes a worker's lessons. `-id`, `-run`, `-crew` and `-detached` are set by `belai agent start` and the crew supervisor; you do not pass them yourself.

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/workforce/usage` |
| POST | `/v1/factory/agents/check` |
| | Profiles, crews and files: `/v1/belai/library/profiles`, `/library/crews`, `/library/files/{sha}` |
