---
title: Triggers and webhook conditions
nav: Triggers
description: Every GitHub event and action a workflow can start on, every condition you can narrow it with, how storms and forks are handled, and why a trigger did not fire.
order: 20
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_trigger_conditions.go, vdb-site/api/internal/handler/factory_trigger_validate.go, vdb-site/api/internal/handler/factory_engine_events.go, vdb-site/api/internal/handler/github_posture.go]
checked: [vdb-site@c33d5bb, website@3302530]
updated: 28 Oct 2026
---

A webhook trigger starts a run when a GitHub delivery matches its event and its conditions. The GitHub App already sends a delivery for every event on every installed repository, so you never add a repository webhook.

Every condition is checked against the delivery as GitHub sent it. No condition calls GitHub or spends quota. A condition the delivery has no value for **fails closed**: the trigger does not fire on a guess.

## Events and actions

Event names are GitHub's on every forge. A GHES, Gitea, Forgejo or GitLab delivery is translated into the same events first (a Gitea `pull_request_sync` is `pull_request.synchronize`, a GitLab `Merge Request Hook` update that brings new commits is `pull_request.synchronize`, a Gitea commit status is a `check_run`), so one trigger covers every forge in its scope. An event a forge cannot send, such as `dependabot_alert` on Gitea, never starts a run for that forge's repositories; the builder marks it "not on" that forge. [Forge capabilities](/software-factory/reference/forge-capabilities/#trigger-events) has the table.

`event` is a base event, which matches every action unless `conditions.actions` narrows it, or an exact `event.action` pair such as `pull_request.opened`. Using both an exact pair and `conditions.actions` is refused with `action_conflict`.

| Event | Actions | Run subject |
|---|---|---|
| `pull_request` | `opened`, `synchronize`, `reopened`, `closed`, `labeled`, `unlabeled`, `ready_for_review`, `converted_to_draft`, `edited`, `review_requested` | `pr:N` |
| `pull_request_review` | `submitted`, `edited`, `dismissed` | `pr:N` |
| `pull_request_review_comment` | `created`, `edited`, `deleted` | `pr:N` |
| `check_run` | `completed`, `created`, `rerequested` | `pr:N` when on a pull request |
| `check_suite` | `completed`, `requested`, `rerequested` | `pr:N` when on a pull request |
| `workflow_run` | `completed`, `requested`, `in_progress` | `pr:N` when on a pull request |
| `merge_group` | `checks_requested`, `destroyed` | none |
| `push` | none | none |
| `release` | `published`, `created`, `released`, `prereleased`, `edited` | `release:TAG` |
| `issues` | `opened`, `labeled`, `reopened`, `closed`, `unlabeled`, `edited`, `assigned`, `milestoned` | `issue:N` |
| `issue_comment` | `created`, `edited`, `deleted` | `issue:N`, also for a comment on a pull request |
| `installation_repositories` | `added`, `removed` | none |
| `repository` | `created`, `archived`, `unarchived`, `publicized`, `privatized`, `renamed`, `transferred`, `edited` | none |
| `dependabot_alert` | `created`, `dismissed`, `fixed`, `reintroduced`, `reopened`, `auto_dismissed`, `auto_reopened` | `dependabot:N` |
| `code_scanning_alert` | `created`, `appeared_in_branch`, `fixed`, `reopened`, `closed_by_user`, `reopened_by_user` | `code-scanning:N` |
| `secret_scanning_alert` | `created`, `resolved`, `reopened`, `validated`, `publicly_leaked` | `secret:N` |
| `secret_scanning_alert_location` | `created` | `secret:N` |
| `registry_package` | `published`, `updated` | `package:name@version` |
| `deployment_status` | `created` | `deploy:<id>` |
| `posture_finding` | `opened`, `resolved`, `regressed`, `introduced` | `finding:<uuid>`; `pr:N` for `introduced` |

`posture_finding` is not a GitHub delivery. Vulnetix raises it when one of its GitHub misconfiguration rules fails on a repository for the first time (`opened`), passes again after a fix (`resolved`), or fails again after passing (`regressed`). `introduced` is raised for a pull request that changes a workflow, an action or `CODEOWNERS` when its head would add a misconfiguration the default branch does not have: its subject is the pull request, its `severity` the worst new finding, and `origin` says whether it comes from a fork. The rules run on pushes that change workflows, actions, `CODEOWNERS`, `SECURITY.md` or the Dependabot configuration, on branch protection, ruleset, deploy key and security setting changes, and once a day. Its `severity` is the finding's after the repository's own settings rated it: a pull request target checkout in a private repository with forking disabled is rated lower than the same workflow in a public one, so a `critical` trigger does not fire for it.

Some events need App permissions or subscriptions your installation may not have yet. The Organisations panel on the Repos page shows each event's state. See [Managed scope](/software-factory/control/managed-scope/).

## Conditions

Every condition you set must match. Names may be written snake_case (`base_branch`); they are stored camelCase.

| Condition | Values | Matches |
|---|---|---|
| `actions` | from the table above | the delivery's action |
| `baseBranch` | globs, or `@default` | a pull request's base branch; a run's pull request base, else its head branch; a push's branch |
| `headBranch` | globs, or `@default` | a pull request's head branch; a run's head branch; a push's branch. A tag push never matches. |
| `paths`, `pathsIgnore` | globs, `push` only | the files added, changed or removed by the push's commits |
| `labels` | `{any: [...], all: [...]}` | the pull request's or issue's labels, without case |
| `authorType` | `any`, `user`, `bot` | whether the author is a bot (`type: Bot`, or a login ending `[bot]`). Default `any`. |
| `authors` | `{allow: [...], deny: [...]}` | the author, pusher, commenter, reviewer or run actor, as globs without case. `deny` also checks the sender and wins over `allow`. |
| `draft` | `include`, `exclude`, `only` | a pull request's draft state. Default `include`. |
| `origin` | `any`, `same_repo`, `fork` | whether the change comes from a fork. Default `any`. |
| `subject` | `any`, `pr`, `issue`, `none` | what the run is about. Default `any`. |
| `conclusion` | `success`, `failure`, `cancelled`, `timed_out`, `neutral`, `skipped`, `action_required`, `stale`, `startup_failure` | the conclusion of a `workflow_run`, `check_run` or `check_suite` |
| `conclusion` on `deployment_status` | `success`, `failure`, `error`, `inactive`, `in_progress`, `queued`, `pending` | the deployment status's state |
| `reviewState` | `approved`, `changes_requested`, `dismissed`, `commented` | a `pull_request_review`'s state |
| `severity` | `critical`, `high`, `medium`, `low`, `informational`, `error`, `warning`, `note` | a Dependabot alert's advisory severity, a code scanning rule's security severity, or a posture finding's severity |
| `environment` | globs, without case | a `deployment_status`'s environment |
| `packageType` | `container`, `docker`, `npm`, `maven`, `rubygems`, `nuget` | a `registry_package`'s type |
| `properties` | a map of property name to a list of values, without case | the repository's custom properties: every named property must hold one of its values, and a repository without the property does not match |

A `push` trigger can also set `ref` on the trigger itself: `tags` matches only tag pushes; `default` (or no `ref`) matches branch pushes and never a tag. A push that deletes its ref never matches.

Conditions that only make sense on some events are refused elsewhere: `conclusion_unsupported_event`, `review_state_unsupported_event`, `severity_unsupported_event`, `environment_unsupported_event` and `package_type_unsupported_event`. `paths` on anything but `push` is refused with `paths_need_push`, because a pull request delivery does not carry its file list and getting it would cost a GitHub call. An unknown condition name is refused with `unknown_condition`, and a blank glob with `invalid_glob`.

A push carries at most 20 commits. On a very large push, `paths` matches on the paths it can see.

### Globs

`*` matches any run of characters except `/`. `**` matches any run including `/`. `**/` matches zero or more directories. `?` matches one character except `/`. Everything else is literal. Branches and paths match with case, logins and labels without. A list holds at most 30 entries. A branch, path or environment glob is at most 200 characters; a label or login at most 100. `@default` is the repository's default branch.

## Rate and storm limits

| Key | Range | Default | Effect |
|---|---|---|---|
| `debounceSeconds` | 0 to 3,600 | 30 for a `push` or a `pull_request` `synchronize`, else 0 | Deliveries for the same trigger, repository and pull request or ref inside the window start one run. The first one wins. |
| `maxRunsPerHour` | 1 to 1,000 | 60 | At most this many runs per trigger in the last hour. |

## Safeguards

A delivery that matches can still be stopped. Each stop is recorded as a `trigger.skipped` event with a reason. A delivery that simply did not match a condition records nothing.

| Reason | Why |
|---|---|
| `own_branch` | The head branch starts with the factory's own branch prefix (`forge.branch_prefix`, `belai/K-` by default). |
| `own_identity` | The author or sender is the Vulnetix App's bot, `pix[bot]` or `pix-bot[bot]`, or the head commit is by `Pix [bot]` or `security@vulnetix.com`. |
| `coalesced` | Another delivery in the same debounce window already started the run. |
| `rate_limited` | The trigger hit `maxRunsPerHour`. |
| `fanout_cap` | The delivery already started the most runs one delivery may start. |
| `org_disabled` | The repository's organisation is not managed. |
| `label_untrusted_sender` | A bot added the label, or someone outside the team used a `/sf` command. |
| `fork_needs_human` | An untrusted event would reach a crew without a person approving first. |

The kill switch, the workflow's scope and unmanaged repositories also stop a fire. An empty scope uses the event's own repository, as long as it is managed.

> [!WHY] Why the factory ignores its own work
> A crew's pull request is itself a `pull_request` event. Without the own-work rule, a review workflow would review its own fixes, and a fix workflow would fix its own fixes, in a loop.

### Forks and outsiders

A pull request from a fork is **untrusted**. So is an issue opened or reopened by someone whose association with the repository is not owner, member or collaborator. At publish, a `pull_request` or `pull_request_review` trigger that accepts forks must have a [human step](/software-factory/workflows/nodes/human/) on every path to a crew or draft pull request, or publish fails with `fork_pr_needs_human`. At fire time the same check runs for every untrusted event. Setting `origin: same_repo` keeps outsiders out entirely.

## What the run keeps

A run started by a webhook keeps the event's facts: event and action, repository, number, head commit, branch, base branch, author and author type, labels, draft, origin and whether it is untrusted, and the delivery id. It keeps no title, body or comment text. The facts are written to `trigger/context.json`, shown on the run page, and quoted in the crew's card.

## Other trigger kinds

- **finding** fires when a scanner reports a finding of a listed severity: `critical`, `high`, `medium` or `low`.
- **kanban** fires when a card moves from `fromList` to `toList`.
- **manual** fires when a person starts a run.
- **cron**: see [Schedules](/software-factory/workflows/schedules/).
- **label**: see [Labels and commands](/software-factory/workflows/labels-and-commands/).
- **firewall**: see [Source events](/software-factory/workflows/source-events/).

## Finding out why a trigger did not fire

1. Open **Events** and filter on the workflow. A `trigger.skipped` event names the reason.
2. `GET /v1/factory/events/unanswered?days=7` lists deliveries that started no run at all.
3. If there is nothing, the delivery did not match. Check each condition against the event on GitHub.
