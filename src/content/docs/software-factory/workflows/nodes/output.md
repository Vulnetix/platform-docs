---
title: Output node
description: The step that writes a run's result back as draft pull requests, comments, reviews, merge conflict cards, TEA releases, VEX and notifications, with every key.
order: 16
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-engine.md, vdb-site/api/internal/handler/factory_engine_node_output.go, vdb-site/api/internal/handler/factory_engine_review.go, vdb-site/api/internal/handler/factory_engine_approve.go, vdb-site/api/internal/handler/factory_engine_conflicts.go]
checked: [vdb-site@597344c]
updated: 28 Oct 2026
---

An output step writes the run's result somewhere you will see it. A skipped output ends its branch of the graph.

| `kind` | Writes | Needs autonomy |
|---|---|---|
| `draft_pr` | A pull request from the crew's branch | `draft_pr` |
| `issue_comment` | A comment on the run's issue or pull request | `suggest` |
| `pr_review` | A GitHub review from the reviewer agent's verdict | `suggest` |
| `approve_ready` | An APPROVE review once the pull request is ready | `auto_merge_low_risk` |
| `conflict_cards` | Merge conflict cards for conflicting pull requests | `draft_pr` |
| `tea_publish` | A release in the Transparency Exchange | |
| `vex` | A VEX statement in the run's evidence | |
| `notify` | A message to your channels | |

## draft_pr

Opens a pull request from the card's branch. It costs 1 to 3 GitHub calls. If a pull request already exists, it is recorded and not opened again.

| Key | Values | Default |
|---|---|---|
| `prState` | `draft`, `ready` | `forge.pr_state`, then `draft` |
| `base` | `default`, `pr_head`, or a branch name | `default` |
| `ifNoBranch` | `fail`, `skip` | `fail` |
| `reviewers` | `codeowners`, `none` | |
| `attach` | `cdx_slsa`, `sbom_only` | |

- `base: pr_head` stacks the fix onto the branch of the pull request the run is about, so a fix for a failing pull request lands as a draft into that pull request's branch. With no open pull request from the same repository it uses the default branch. Any other value that is not a branch name is refused with `invalid_base`.
- `ifNoBranch: skip` ends the step quietly when the crew pushed nothing, for example a sweep that found nothing to fix.
- `attach` names a CycloneDX SBOM with SLSA provenance, or the SBOM alone. It is validated and stored, but the `draft_pr` step does not read it yet, so nothing is attached.

A pull request GitHub refuses fails the step with GitHub's reason. A 4xx other than 429 is not retried.

## issue_comment

Comments on the issue or pull request the run is about. It posts once per run and step: a loop that comes back to the step skips with `already_commented`. The comment carries a hidden marker naming the run and step.

## pr_review

Posts one GitHub review from the verdict the `belai:pr-reviewer` agent wrote on its card. The verdict is `approve`, `comment` or `request_changes`, followed by up to 20 findings as `FILE:LINE: text`.

- `request_changes` becomes a REQUEST_CHANGES review. `comment` and `approve` become COMMENT reviews. **This output never approves.** Approval is its own step, `approve_ready`.
- A finding on a line in the diff becomes an inline comment. Every other finding goes in the review body.
- It posts once per run, step and head commit.
- Finding text is cut to 500 characters, and `@mentions` are broken so a model cannot ping people.

## approve_ready

Submits an APPROVE review when a pull request is ready, and never merges. The step reads only the mirror and waits until a webhook changes the answer. The pull request is ready when all of these hold:

| Rule | If not |
|---|---|
| Open, not a draft, from the same repository | A draft waits. Closed or from a fork ends the step. |
| The run's commit is still the head | Ends the step. A push starts a new run. |
| The factory's own review of that commit said approve | Waits. A comment or request-changes verdict ends the step. |
| Nobody's latest review requests changes | Waits. |
| Every check run on the head is complete and green, and there is at least one | Waits. |
| GitHub says it can merge cleanly | Waits on `DIRTY` or `BEHIND`. |
| No changed file is a sensitive path | Ends the step. |

**Sensitive paths** are GitHub workflows and actions, Dependabot config, CODEOWNERS, CI files, Dockerfiles and compose files, Terraform, `.env*` files, keys and certificates, `.vulnetix/**`, and anything in `approve.sensitive_paths`. Checking costs one read of the changed files, made only once everything else holds. More than 300 changed files counts as sensitive.

A step that waits more than 72 hours ends. GitHub does not let an App approve a pull request it opened, and an App's approval may not count toward your branch rules. When GitHub refuses, the step comments that the pull request is ready for a person and ends.

> [!WHY] Why approval is separate from review
> A review says what the agent found. An approval is a promise that the change is safe to merge, so it waits for the facts a person would check: green checks, no requested changes, nothing sensitive touched.

## conflict_cards

Files a [merge conflict](/software-factory/decisions/merge-conflicts/) card for each open pull request that is conflicting. For a run about one pull request it looks at that one. For a push to the default branch it looks at the open pull requests based on it, newest first, at most 20. GitHub works out mergeability lazily, so the step rechecks at 0, 1, 3 and 10 minutes (1, 3 and 10 for a push), at most 40 rechecks in all. A fork's card carries `checkpoint:fork_code` and waits for a person before any host touches the code.

## tea_publish

Publishes to the Transparency Exchange when the repository has TEA on and `when` is met.

| Key | Values |
|---|---|
| `when` | `on_release_tag`, `on_merge_main`, `never` |
| `visibility` | `private`, `public` |

## vex

Writes `evidence/vex.openvex.json` to the run's evidence.

## notify

Sends a message through your messaging connections.

| Key | Values |
|---|---|
| `message` | at most 1,000 characters. `{workflow}`, `{run}`, `{repo}`, `{node}` and `{status}` are filled in. |
| `severity` | `info` (the default), `notice`, `warning`, `critical` |
| `connections` | up to 10 connection ids. None means your notification routes decide. |
| `push` | `owner` (the default), the run's starter, or `none` |

## Related

- [Default workflows](/software-factory/workflows/default-workflows/), which use `pr_review`, `approve_ready` and `conflict_cards`.
- [Autonomy levels](/software-factory/control/autonomy/)
