---
title: Default workflows
description: The seven workflows every managed organisation gets. What each starts on and does, the autonomy each needs, how to switch them off for the tenant or one repository, and what happens when you edit one.
order: 25
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_defaults.go, vdb-site/api/internal/handler/factory_defaults_gate.go, vdb-site/api/internal/handler/factory_defaults_seed.go, website/src/shared/factory-settings.ts]
checked: [vdb-site@597344c, website@58b9ffa, saas@aa6c2b4]
updated: 28 Oct 2026
---

Every managed organisation gets seven workflows that run from the start. They are ordinary workflows, with slugs starting `sys-`, that cover every managed repository. None of them merges: a person merges.

| Default | Starts on | Does | Needs autonomy |
|---|---|---|---|
| `pr-review` | A pull request opened, synchronized, marked ready or reopened. Not a draft. | `belai:pr-reviewer` reads the change and posts a GitHub review: COMMENT or REQUEST_CHANGES, inline where it can. Never approves. A fork's pull request waits for a repository admin first. | `suggest` |
| `ci-fix` | A failed `workflow_run` on the default branch, or a failed `workflow_run` or `check_suite` on a pull request branch | `belai:bug` reproduces and fixes it. A draft pull request opens, stacked onto the pull request's branch when there is one. A fork waits for an admin. | `draft_pr` |
| `test-sweep` | A push to the default branch (a 15 minute window, 2 runs an hour) and a weekly schedule | `belai:delivery` runs the tests and `belai:test-fixer` fixes what fails. A draft pull request, or nothing when the tests pass. | `draft_pr` |
| `lint-sweep` | The same push and a weekly schedule | `belai:lint-fixer` runs the linter from your checked-in rule files with its autofix. It never edits a rule. | `draft_pr` |
| `issue-to-pr` | An issue opened. An issue from outside the team waits for an admin. | `belai:planner` plans, a person approves the plan (unless `autonomy.plan_approval` is off), `belai:builder` builds, `belai:reviewer` reviews, and a draft pull request opens. | `draft_pr` |
| `approve-ready` | A pull request, a review, or a green check suite on a pull request | Waits until the pull request is ready, then submits an APPROVE review. See [approve_ready](/software-factory/workflows/nodes/output/). | `auto_merge_low_risk` |
| `conflict-fix` | A push to the default branch (a 120 second window, 12 an hour), or a pull request opened, synchronized or reopened (60 seconds, 60 an hour) | Files a merge conflict card for each conflicting open pull request. `belai:conflict-resolver` claims it and pushes a passing fix as a fast-forward. A fork's card waits for a person. | `draft_pr` |

`approve-ready` is the only default that approves anything, and only on a repository set to **approve when ready**.

## When a default runs on a repository

A default starts a run on a repository only when all of these hold:

- `defaults.enabled` is on, and so is that default's own switch, such as `defaults.pr-review.enabled`
- the repository's organisation is managed
- the repository is not archived, unless `scope.archived` is on
- the default is not switched off for that repository
- the repository's effective autonomy is at least the level the default needs

A repository with no settings of its own runs at `autonomy.default`. Defaults are the only workflows that start work on such a repository. When a default skips a repository, a `trigger.skipped` event says why, at most once an hour per repository.

## Bounds

Every default has a debounce window and an hourly run cap on its event trigger, a dedupe key so one commit starts one run, `skip_if_running` on its sweeps, and a token budget per run on the defaults that run an agent (`approve-ready` and `conflict-fix` set none). They name no host, so a step for a repository no machine has is recorded and skipped.

`forge.quota.proactive_writes_per_hour` caps the GitHub calls the defaults make on their own, per installation per hour. The default is 60. A call over the cap waits for the next hour. A person's own actions are not counted.

## Switching defaults off

| To | Do |
|---|---|
| Stop all defaults for the tenant | Settings › Defaults › **Run the defaults** off (`defaults.enabled`) |
| Stop one default for the tenant | Its switch in Settings › Defaults (`defaults.<key>.enabled`) |
| Stop one default on one repository | The repository's settings on the Repos page |
| Remove a default | Archive it on the Workflows page. The background pass that finishes and upgrades defaults never brings it back, but making an organisation managed again seeds a new copy. |

## Editing a default

You can open a default in the builder and change it like any workflow. Once you edit it, it is marked **customised** and stops following the catalogue: later improvements to the default are not applied to it. A default you have not edited is upgraded to the catalogue's newest version automatically and stays enabled.

> [!WHY] Why defaults run from the start
> Most teams want reviews, CI fixes and conflict fixes the day they turn the factory on. Starting with them running, inside the autonomy you chose, means the factory is useful before anyone builds a workflow.

## Seeding

The defaults are created when a person makes an organisation managed, after that change is saved. Each default is created on its own, so one failing does not stop the others. Their owner, and the member whose hosts their runs use, is the person who made the organisation managed. If that member leaves your organisation, the organisation's defaults go with them; making the organisation managed again seeds them afresh.

## Settings

| Setting | Default |
|---|---|
| `defaults.enabled` | `true` |
| `defaults.pr-review.enabled` | `true` |
| `defaults.ci-fix.enabled` | `true` |
| `defaults.test-sweep.enabled` | `true` |
| `defaults.lint-sweep.enabled` | `true` |
| `defaults.issue-to-pr.enabled` | `true` |
| `defaults.approve-ready.enabled` | `true` |
| `defaults.conflict-fix.enabled` | `true` |
| `autonomy.default` | `draft_pr` |
| `forge.quota.proactive_writes_per_hour` | 60 |
| `approve.sensitive_paths` | none |

## API

`GET /v1/factory/defaults` lists the defaults and their state for the tenant.
