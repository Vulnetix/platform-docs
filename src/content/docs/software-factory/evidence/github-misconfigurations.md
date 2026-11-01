---
title: GitHub misconfigurations
nav: GitHub misconfigurations
description: How the factory finds misconfigured GitHub workflows, actions and settings as webhooks arrive, rates each one against the repository's own settings, files it as a finding, and opens a draft pull request that fixes it.
order: 13
sources: [vdb-site/docs/github-posture-rules.md, vdb-site/api/internal/handler/github_posture.go, vdb-sca-match/ghaudit, vdb-sca-match/docs/ghaudit-rules.md]
checked: [vdb-site@df5eba5, website@00c3dfa]
updated: 28 Oct 2026
---

The factory checks the GitHub side of every repository it manages: the workflows, the actions and container images they run, and the repository's and organisation's settings. It does this as GitHub tells it about changes, not on a scan schedule you have to remember, and it uses the same rules as `vulnetix gha audit`, so a finding from the CLI and one from the factory agree.

## What is checked

| Group | Examples |
|---|---|
| Workflows | Untrusted text (a pull request title, a branch name, a comment) expanded into a script, followed through `env`, `GITHUB_ENV`, step and job outputs and local composite actions; a `pull_request_target` or `workflow_run` job that runs the pull request's code; credentials left in an uploaded workspace; artifact and cache poisoning; write tokens and OIDC tokens a job does not need; secrets dumped or sent to another host; conditions that are always true |
| Actions | References not pinned to a commit, a pin whose version comment points elsewhere, a commit that exists only in a fork, archived or renamed action repositories, versions with a published advisory |
| Repository settings | Branch protection and rulesets on the default branch, Actions token defaults and approvals, fork pull request approval, secret scanning and push protection, environments holding secrets with no reviewers, deploy keys, webhooks, outside admins |
| Organisation settings | Two-factor enforcement, default member permission, organisation secrets visible to every repository, runner groups open to public repositories |

The full list, with what each rule needs and how to fix it, is the [GitHub rules](https://docs.cli.vulnetix.com/docs/github-rules/) reference.

## When it runs

- A push to the default branch that changes a workflow, an action, `CODEOWNERS`, `SECURITY.md` or the Dependabot configuration.
- A change to branch protection, a ruleset, a deploy key, the security settings or the repository itself.
- An organisation or membership change, for the organisation rules.
- Once a day for every repository, to catch anything no event announced.
- A pull request that changes a workflow, an action or `CODEOWNERS`: its head is checked before it merges. What it would add is not filed as a finding, since it is not on the default branch yet; it is announced as `posture_finding.introduced` on the pull request, so a workflow can review it or propose the fix on the same branch.

- Right away when the GitHub App is installed or claimed, when new App permissions are accepted, when repositories are added to the installation, and when a posture capability is turned on, so the first results do not wait for the daily pass.
- When an owner or admin presses **Evaluate now** on the GitHub posture page.

Deliveries that arrive while a repository is being checked are folded into one more pass, so a burst of pushes costs one evaluation, not one each.

Settings reads are kept for up to 30 minutes between settings events, so a push that changes a workflow does not re-read every setting; any settings event clears them first, and the daily pass always reads GitHub.

## Your settings decide the rating

A rule's severity is a starting point. The factory reads the repository's configuration and moves each finding up or down, and the finding says why:

- a `pull_request_target` checkout in a private repository with forking disabled is rated lower than in a public one;
- a workflow with no `permissions:` block is not reported at all when the repository's default token is read-only;
- a privileged job bound to an environment with required reviewers is rated lower;
- a self-hosted runner reachable from pull requests is rated higher in a public repository.

Anything the GitHub App is not allowed to read is recorded as **not evaluated** with the reason, never as a pass.

The **GitHub posture** page (Resolve, GitHub posture) lists each repository and the organisation, worst first. For each one it shows the failing rules, linked to their findings; the rules that were not evaluated, grouped by the reason (usually one missing App permission explains several); and what was fixed.

## Findings without a scan

Each failed rule is a finding in the misconfiguration lens. There is no scan snapshot behind it, so everything the finding page shows is written when it is filed: where it is (the file and line, or the settings page), the rule's explanation, the reasons for its rating, the evidence, and a suggested fix. When a line edit fixes the finding safely, it is attached and was checked to keep the workflow valid and to clear the finding.

When the rule passes again, the finding is resolved and the triage history says why: fixed at a commit, or the file was removed.

## Starting work from a finding

Two kinds of trigger start a workflow from a finding:

- the `posture_finding` webhook event (`opened`, `resolved`, `regressed`), narrowed by `severity`, for any workflow you build. See [Triggers](/software-factory/workflows/triggers/).
- the `github-posture` firewall source, which the fix templates use: pin actions, least-privilege token, move untrusted input out of scripts, close a pwn request, and add missing security files. Each opens one draft pull request per finding through `belai:workflow-fixer` (or `belai:repo-onboarder` for the files), with code owners as reviewers. See [Templates](/software-factory/workflows/templates/).

Both fix capabilities write to GitHub, so they stay off until an owner turns them on under Integrations, GitHub. When the pull request merges, the next push sees the rule pass and the finding resolves.

## Related

- [Triggers](/software-factory/workflows/triggers/)
- [Templates](/software-factory/workflows/templates/)
- [Event stream](/software-factory/evidence/event-stream/)
