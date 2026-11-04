---
title: "sf: labels and /sf commands"
nav: Labels and commands
description: Start factory work from GitHub with the 22 sf labels or an /sf comment, who may use them, how to stop runs, and how to create the labels in your repositories.
order: 22
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_labels.go, vdb-site/api/internal/handler/factory_label_dispatch.go]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

You can ask the factory for work without leaving GitHub. Add a label such as `sf:fix-tests` to an issue or pull request, or comment `/sf fix-tests` as the first line of a comment, and any workflow with a matching label trigger runs.

## The label trigger

```json
{ "kind": "label", "label": "sf:fix-tests" }
```

It fires when the label is added to an issue or a pull request, matched without case. A comment whose first line is `/sf <name>` asks for the label `sf:<name>` and fires the same trigger. Only the derived label is kept, never the comment.

## Who can use them

- GitHub only lets people with triage access add labels, so a person's label counts.
- A label a bot adds is skipped as `label_untrusted_sender`, unless the trigger sets `allowBots: true`.
- A `/sf` command from anyone who is not an owner, member or collaborator of the repository is skipped with the same reason.

## Stopping

- **Removing the label** cancels that label's queued runs on the same issue or pull request. A run already going is left to finish.
- **`sf:stop`**, added by anyone, or `/sf stop` from a team member, cancels every unfinished run on that issue or pull request. Each cancel is audited.

## The sf labels

A label runs nothing until a workflow has a label trigger for it. The `label-*` [templates](/software-factory/workflows/templates/) are the first. Every label, `sf:stop` included, also works as a `/sf` command.

| Label | On | Agent | Does |
|---|---|---|---|
| `sf:triage` | issue | `belai:ticket-writer` | Labels type, area and severity, finds duplicates, asks for missing details |
| `sf:ticket` | issue | `belai:ticket-writer` | Writes the board card in the [ticket standard](/software-factory/workforce/ticket-standard/) |
| `sf:repro` | issue | `belai:repro` | Reproduces the bug in a sandbox and attaches the failing test |
| `sf:fix` | issue | `belai:bug` | Reproduces and fixes, then opens a draft pull request |
| `sf:plan` | issue | `belai:planner` | Plans only. A person signs off before any build. |
| `sf:build` | issue | `belai:feature` | Plans, gets sign-off, builds and opens a draft pull request |
| `sf:split` | issue | `belai:planner` | Splits the issue into sub-issues with estimates |
| `sf:rotate-secret` | issue | `belai:secret-triager` | Writes rotation steps for the secret named in the issue |
| `sf:fix-tests` | pull request | `belai:test-fixer` | Runs the failing checks and pushes fixes as a stacked draft pull request |
| `sf:write-tests` | pull request | `belai:builder` | Adds tests for the changed source |
| `sf:review` | pull request | `belai:reviewer` | Reviews now, even a draft. Never approves. |
| `sf:security-review` | pull request | `belai:security` | Security review with a threat note |
| `sf:explain` | pull request | `belai:reviewer` | A reviewer's brief: what changed, the risk and how to test |
| `sf:rebase` | pull request | `belai:conflict-resolver` | Rebases on the base branch and resolves conflicts, never with a force push |
| `sf:split-pr` | pull request | `belai:planner` | Proposes how to split a large pull request |
| `sf:describe` | pull request | `belai:pr-steward` | Writes the pull request description from the diff |
| `sf:backport` | pull request | `belai:builder` | Cherry-picks to the release branches |
| `sf:dep-check` | pull request | `belai:dep-strategist` | Checks a dependency pull request's resolution strategy and scope |
| `sf:quarantine` | pull request | `belai:flaky-hunter` | Quarantines the flaky tests named in the pull request |
| `sf:docs` | both | `belai:builder` | Writes or updates docs for the change |
| `sf:sbom` | both | `belai:tea-publisher` | Builds the SBOM at HEAD and publishes it to TEA |
| `sf:stop` | both | | Cancels every unfinished run on the issue or pull request |

## Creating the labels in your repositories

The labels share one colour (`00e0c9`) and a description that says what will run. To create them in your repositories:

```http
POST /v1/factory/labels/sync
{ "repos": ["acme/api", "acme/web"] }
```

Owners and admins can sync 1 to 20 managed repositories at a time. It costs one GitHub call per label per repository. A label that already exists is left as your team has it. The answer lists, for each repository, the labels created, those that already existed, and any error. `GET /v1/factory/labels` returns the set.

## Fan-out

One delivery can match several triggers, for example a label that two workflows listen for. They fire in `priority` order (1 first to 5, default 3), and at most 6 runs start per delivery. The limit is `factory.fanoutCap`, from 1 to 50. The rest are recorded as `trigger.skipped` with reason `fanout_cap`.

Every run and event records the GitHub delivery id that caused it, so `GET /v1/factory/events/unanswered` can list deliveries that started nothing.

> [!PIX] Labels by phone
> You do not need a label to start work from your phone. On a call, ask Pix to start a session on a repository. Pix proposes it with `propose_session`, reads it back, and starts it with `start_session` when you say yes.
