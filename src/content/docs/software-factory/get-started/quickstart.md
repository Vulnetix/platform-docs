---
title: "Quickstart: manage an org and run a workflow"
nav: Quickstart
description: From an empty tenant to a first run. Install the GitHub App, make an organisation managed, give the factory a machine to work on, watch a default workflow run, then publish a workflow of your own.
order: 3
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_defaults.go, vdb-site/api/internal/handler/factory_orgs.go]
checked: [vdb-site@597344c, website@58b9ffa, belai@8aa7760]
updated: 05 Nov 2026
---

You need:

- A Vulnetix account with the owner or admin role in its organisation. Members can use the factory once it is set up, but only owners and admins can manage orgs, publish workflows and change settings. Any plan works, Community included.
- A machine for the agents to work on (step 4). On Community that is one machine of your own running `belai rc`, with no Vulnetix charge (the crews use your own model keys), or a Pix Sandbox bought per size from $85 a month. More than one self-hosted machine needs Pro.

## 1. Install the GitHub App

> [!CAREFUL] On GHES, Gitea, Forgejo or GitLab
> Connect the forge instead, from the Integrations page: see [Forge connections](/software-factory/control/forge-connections/). Its accounts then appear on the Repos page as below, and every later step is the same. [Supported forges](/software-factory/get-started/forges/) says what differs on each.

Install the Vulnetix GitHub App on the GitHub organisation whose repositories you want the factory to work on: `https://github.com/apps/vulnetix/installations/new`. You can give it all repositories or a selection.

The App asks for:

| Permission | Access | Used for |
|---|---|---|
| Issues | write | Mirroring cards to issues, comments |
| Pull requests | write | Draft pull requests, reviews |
| Contents | read | Reading code. There is no write access, so the factory cannot merge. |
| Metadata | read | Repository names and settings |

Some features need optional permissions. The Organisations panel shows which are missing and what each one unlocks:

| Optional permission | Unlocks |
|---|---|
| Checks: write | Gate results published as check runs |
| Checks: read | `check_run` and `check_suite` triggers |
| Actions: read | `workflow_run` and `workflow_job` triggers, so failed CI can start a fix |
| Security events: read | `code_scanning_alert` triggers |

## 2. Make the organisation managed

Open **Software Factory › Repos** in the Resolve Platform (`/resolve/factory-repos`). Every installation is listed under Organisations, and all of them are read-only until you switch **Managed** on for one.

Managing an organisation does two things:

- The factory may now act on its repositories. It starts nothing outside managed orgs.
- Seven [default workflows](/software-factory/workflows/default-workflows/) are created for it and start running. They cover pull request review, failing check fixes, test and lint sweeps, issue to pull request, approve when ready, and merge conflict fixes. Each one runs only on repositories whose autonomy is high enough for it.

> [!CAREFUL] Defaults start working straight away
> With the default autonomy of `draft_pr`, the review, CI fix, sweep, issue and conflict defaults can all act as soon as an event arrives. If you want to watch first, set `autonomy.default` to `observe` in Settings before you switch Managed on, or switch `defaults.enabled` off.

## 3. Check the autonomy

Open **Settings**. Two keys decide how far the factory goes:

- `autonomy.max` (Autonomy section) caps every repository. The default is `draft_pr`.
- `autonomy.default` (Defaults section) applies to repositories that have no settings of their own. The default is `draft_pr`.

To let one repository go further or less far, open it on the Repos page and set its own autonomy. See [Autonomy levels](/software-factory/control/autonomy/).

## 4. Give the factory a machine

Crew steps run on a host with the repository checked out. Choose one:

- **Your own machine, free.** Install [Belai](/software-factory/belai/install-and-sign-in/), sign in, and run `belai rc` in a directory that holds the repository. Add `--detach` to keep it running in the background. Community includes one self-hosted host; more need Pro. See [Remote control](/software-factory/workforce/remote-control/).
- **A Pix Sandbox, from $85 a month.** Buy one under **Pix Sandboxes** (`/resolve/belai-hosts`), choosing a size: Small, Medium or Large, each billed monthly per sandbox. Then on the Repos page, select repositories and choose **Add to Pix Sandbox**. Vulnetix runs the container and clones the repositories into it. See [Pix Sandboxes](/software-factory/workforce/pix-sandboxes/).

With no machine, a crew step waits up to `autonomy.no_host_ttl_hours` (6 hours by default), then the run ends with `no_host_timeout`. The card shows why it is waiting.

## 5. Watch a run

Open a pull request on a managed repository. Within a minute the `pr-review` default starts a run:

- **Cockpit** (`/resolve/factory`) shows it under Fleet with the agent working.
- **Events** (`/resolve/factory-events`) shows each step as it starts and finishes.
- **Runs** (`/resolve/factory-runs`) lists the run. Open it to see the trace of every step.

When the run finishes, the review is on the pull request in GitHub.

## 6. Publish a workflow of your own

1. Open **Templates** (`/resolve/factory-templates`) and pick one, for example **Security patch train**.
2. Choose **Use template**. This creates the workflow as draft version 1. Nothing runs yet.
3. In the builder, check the trigger, the scope (empty means the repository that triggered the run) and the limits.
4. Choose **Dry run** to validate the graph and see which path a sample event would take.
5. Choose **Publish**. From now on, matching events start runs.

If publishing fails, the builder lists each problem with its code, for example `no_trigger` or `outcome_without_route`. [Error codes](/software-factory/reference/validation-codes/) lists them all.

## 7. Set a budget

Open **Budgets** (`/resolve/factory-budgets`). The tenant has a monthly factory budget of 30,000,000 tokens by default (`budget.month`). Add a run or workflow budget to cap a single workflow. See [Budgets](/software-factory/cost/budgets/).

> [!PIX] Check on it from your phone
> Call Pix from the Resolve Platform header or the app and ask "how is the factory doing?". Pix reads the same figures as the cockpit with `factory_stats` and lists anything waiting on you with `needs_attention`.

## Next

- [Concepts](/software-factory/get-started/concepts/) names every part of the factory.
- [What the factory never does](/software-factory/get-started/what-the-factory-never-does/) lists the hard limits.
- [Pause, stop and resume](/software-factory/control/pause-and-stop/) explains the kill switch before you need it.
