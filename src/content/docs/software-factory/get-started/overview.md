---
title: Software Factory
description: Software Factory runs workflows of agents against the GitHub repositories you mark as managed, and writes the results back to GitHub as draft pull requests, reviews, comments, issues and VEX.
order: 1
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-access.md, vdb-site/api/internal/handler/factory_access.go, website/.repo/software-factory.md]
checked: [vdb-site@fe1ff17, website@a31d470]
updated: 05 Nov 2026
---

Software Factory is for engineering and security teams that want routine work on their GitHub repositories, such as fixing a vulnerable package or answering a failed check, done by agents without anyone starting each job by hand. The factory starts work from repository events and keeps a person in the loop wherever a workflow asks for one. Use it for work that should happen on its own. Use [Pix](/pix/) when you are working with a coding agent yourself and want Vulnetix inside that session.

Software Factory turns events in your repositories into work done by agents. A pull request opens, a check fails, a scanner finds a vulnerable package, a label is added, a schedule fires: the factory matches the event to a **workflow**, starts a **run**, and walks the run through the workflow's graph. Some steps are decided by a fast classifier model, some are deterministic checks, some dispatch a **crew** of agents to a machine, and some wait for a person. The last step writes the result back to GitHub.

Everything the factory does is recorded. Every step lands in the [event stream](/software-factory/evidence/event-stream/), every change of state in the hash-chained [audit ledger](/software-factory/evidence/audit-ledger/), and every outcome in [Delivery](/software-factory/evidence/delivery/).

> [!CAREFUL] The factory never merges
> Its GitHub App has no `contents: write` permission on your repositories. The highest [autonomy level](/software-factory/control/autonomy/), `auto_merge_low_risk` (shown as "approve when ready"), waits until a pull request is ready, then submits an APPROVE review. A person, or your branch protection and merge queue, still merges it.

## Core objects

Most pages in these docs describe one of these. The Resolve Platform column is the page you see it on, under `https://www.vulnetix.com/resolve/`.

| Object | What it is | Resolve Platform |
|---|---|---|
| Managed org | A GitHub App installation the factory may act on. Nothing outside a managed org is touched. | `factory-repos` |
| Workflow | A versioned graph of nodes and edges with limits. Drafts are edited; a published version runs. | `factory-workflows` |
| Run | One execution of a published workflow version, made of steps. | `factory-runs` |
| Decision | A step where a System One model picks one of the outcomes you listed. | `factory-workflows` |
| Crew | Agents dispatched together to one machine for one step. | `factory-workforce` |
| Card | A unit of work on the board. A card and its GitHub issue are one record. | `factory-board` |
| Checkpoint | Anything waiting on a person: an approval, an agent's question, a held or blocked card. | `factory-checkpoints` |
| Budget | A token or call limit on the whole tenant, a workflow, a step or a repository, per run, day, week or month. USD budgets are refused as not supported yet. | `factory-budgets` |
| Audit entry | A hash-chained record written in the same transaction as the change it describes. | `factory-audit` |

## What happens in a run

1. **A trigger fires.** A webhook, a cron schedule, a scanner finding, a label, a card moving on the board, or a manual start. Debounce and the hourly run cap are checked first.
2. **The engine checks holds.** If the factory is paused or stopped, or a maintenance window or schedule blackout is in force, the run waits as `held`. It is not dropped.
3. **Nodes run in graph order.** A [decision](/software-factory/workflows/nodes/decision/) picks an edge, a [gate](/software-factory/workflows/nodes/gate/) passes or fails without a model, a [crew](/software-factory/workflows/nodes/crew/) leases a machine and dispatches agents, a [human](/software-factory/workflows/nodes/human/) node waits for a person.
4. **Anything that needs a person becomes a checkpoint.** The run waits as `waiting_approval` and shows on the [Checkpoints](/software-factory/decisions/checkpoints/) page and the cockpit's Needs you list.
5. **[Output](/software-factory/workflows/nodes/output/) nodes write to GitHub**: a draft pull request, a review, a comment, a VEX statement or a TEA release.

> [!WHY] Why runs are held, not dropped
> A dropped run means a fix you expected never arrives, and nothing says so. A held run shows up, waits, and starts when the hold lifts. `schedules.missed` is the policy for schedule fires that arrived while the factory was paused or stopped, though no held-fire count is stored yet.

## Where the work runs

Crews run on **hosts**: machines running the [Belai](/software-factory/belai/install-and-sign-in/) agent harness. A host is either a [Pix Sandbox](/software-factory/workforce/pix-sandboxes/), a container Vulnetix runs for you, or a machine of your own connected with `belai rc`. The factory picks the host for each step from the step's `runOn` setting and the [placement rules](/software-factory/workforce/hosts-and-placement/).

## Who can use it

The Software Factory (`/v1/factory/*`) and the Belai console (`/v1/belai/*`) are open on every plan:

| Plan | Self-hosted hosts | Pix Sandboxes |
|---|---|---|
| Community | One, free | Any number, each billed on its own subscription, from $85 a month |
| Pro, Business, Enterprise | Any number | Any number, each billed on its own subscription |

On Community the factory runs on one machine of your own with `belai rc`, with no Vulnetix charge. A second self-hosted host is refused while the first is active, with `403`, `"code": "host_limit"` and `"requiredPlan": "pro"`, and Belai prints "Community includes one self-hosted host; add more with Pro or a Pix Sandbox". A host counts as active while it has been seen in the last 45 seconds, so when the first machine stops, another can take its place. Your own Pix Sandboxes never count against the limit. A sandbox counts while its subscription is active or past due.

On Community, decision steps (the System One classifier calls a workflow makes) have a smaller daily allowance than on a paid plan or a Pix Sandbox. Crew steps on your own machine run on your own models and keys.

`GET /v1/factory/access` returns the answer the Resolve Platform uses:

```json
{ "access": "community", "plan": "community", "activeSandboxes": 0, "selfHostedLimit": 1, "selfHostedUsed": 1 }
```

`access` is `pro`, `sandbox` (below Pro with a live sandbox), `community` (below Pro with no sandbox) or `none`. `selfHostedLimit` is `null` on Pro and above. The cockpit's Fleet rail shows the same count as "1 of 1 free self-hosted host". The sandbox count is cached for 60 seconds per organisation. A caller with no plan gets `403` with `"code": "plan_locked"`.

## Find the page for your task

| I want to | Read |
|---|---|
| Go from an empty tenant to a first run | [Quickstart](/software-factory/get-started/quickstart/) |
| Look up a word these docs use | [Glossary](/software-factory/get-started/glossary/) |
| See where each part runs before connecting my own machines | [How the pieces fit](/software-factory/get-started/architecture/) |
| Let the factory draft pull requests on one repository only | [Autonomy](/software-factory/control/autonomy/) |
| Run a workflow when a label is added | [Labels and commands](/software-factory/workflows/labels-and-commands/) |
| Stop everything now | [Pause, stop and resume](/software-factory/control/pause-and-stop/) |
| Find out why a run is held | [Holds and blackouts](/software-factory/control/holds-and-blackouts/) |
| Cap what one run can spend | [Budgets](/software-factory/cost/budgets/) |
| Choose which machine a crew runs on | [Hosts and placement](/software-factory/workforce/hosts-and-placement/) |
| Build a workflow on the canvas | [The workflow builder](/software-factory/workflows/builder/) |
| Understand why a run is sitting still | [How the engine walks a graph](/software-factory/runs/how-the-engine-runs/) |
| Start, pause, cancel or retry a run | [Runs and steps](/software-factory/runs/runs-and-steps/) |
| See how agent commits and comments are marked | [Bot attribution](/software-factory/evidence/attribution/) |
| Find misconfigured GitHub workflows and settings | [GitHub misconfigurations](/software-factory/evidence/github-misconfigurations/) |
| Run Belai from a script or CI | [Headless and one-shot runs](/software-factory/belai/headless/) |
| Send Belai traces to my own collector | [Telemetry and tracing](/software-factory/belai/telemetry/) |
| Build Belai from source | [Developing Belai](/software-factory/belai/contributing/) |
| Fix a publish error like `no_trigger` | [Error codes](/software-factory/reference/validation-codes/) |
| Find the Resolve Platform page for a task | [Console pages](/software-factory/reference/console-routes/) |
| Look up an API route or an allowed value | [HTTP API](/software-factory/reference/http-api/), [Enumerations](/software-factory/reference/enums/) |
| Fix a run, host or session that is not working | [Troubleshooting](/software-factory/reference/troubleshooting/) |
| Check on the factory from my phone | [Calling Pix](/software-factory/pix/calling-pix/) |

## Elsewhere

- The [Software Factory product page](https://www.vulnetix.com/features/software-factory) explains what it is for and how it is priced.
- [Pix Sandbox](https://www.vulnetix.com/features/pix-sandbox) describes the machines crews run on.
- [Belai](https://belai.vulnetix.com/) is the agent harness inside every session.
- [Announcing Software Factory](https://www.vulnetix.com/articles/announcing-software-factory) gives the reasoning behind the design.

## Platform IaC

The Factory's settings and workflow definitions are kinds: [`FactorySettings`](/platform-iac/kinds/factory-settings/), [`ScannerProfile`](/platform-iac/kinds/scanner-profile/), [`FactoryManagedOrg`](/platform-iac/kinds/factory-managed-org/) and [`RepositorySettings`](/platform-iac/kinds/repository-settings/) for settings and scope; [`FactoryWorkflow`](/platform-iac/kinds/factory-workflow/), [`FactoryTrigger`](/platform-iac/kinds/factory-trigger/), [`FactorySchedule`](/platform-iac/kinds/factory-schedule/) and [`FactoryBudget`](/platform-iac/kinds/factory-budget/) for workflows, triggers, schedules and budgets; [`AgentProfile`](/platform-iac/kinds/agent-profile/), [`Crew`](/platform-iac/kinds/crew/) and [`LibraryItem`](/platform-iac/kinds/library-item/) for the Belai library. **Export as YAML** on the Settings page, or `GET /v1/factory/settings?format=yaml`, now writes these documents (see [The settings document](/software-factory/control/settings-document/)), and `PUT` of the same YAML applies them. A workflow node, `config-apply`, plans and applies a config repository on a push to its default branch; see [GitOps from a repository](/platform-iac/kinds/factory-workflow/#gitops-from-a-repository).

When [Drift protection](/platform-iac/guides/drift-protection/) is on, a change made in the Resolve Platform or through a legacy API to Software Factory workflows, triggers, schedules, budgets or settings that is managed as code (by Terraform or a repository) is refused with HTTP 409 `managed_by_platform_iac`. Change it where it is declared, or ask an owner to turn Drift protection off.
