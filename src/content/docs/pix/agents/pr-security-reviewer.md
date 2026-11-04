---
title: pr-security-reviewer
description: Reviews a pull request before merge, runs only the scanners for changed files, checks new direct dependencies, and writes an APPROVE or REQUEST_CHANGES review.
order: 2
sources: [pix-ai-coding-assistant/vulnetix/agents/pr-security-reviewer.md, pix-ai-coding-assistant/website/guides/agents/pr-security-reviewer.md, cli/cmd/scan.go]
checked: [pix-ai-coding-assistant@7aebf02, cli@4c8c3b7]
updated: 02 Nov 2026
---

```
> Use the pr-security-reviewer agent on PR 142.
```

It is a Claude Code subagent from the plugin, `sonnet` at medium effort, at most 18 turns, with `Bash`, `Read`, `Glob`, `Grep`, `Edit` and `Write`. It needs the Vulnetix CLI and `git`, and optionally `gh` logged in (`gh auth status`).

## Inputs

| Input | Effect |
|---|---|
| A pull request number (`--pr <num>`) | With `gh`, changed files come from `gh pr diff <num> --name-only`, and the review can be posted there |
| `BASE` | Without a PR number, changed files come from `git diff --name-only "${BASE:-origin/main}"...HEAD` |
| `.vulnetix/capabilities.yaml` | `binaries.gh` decides which of the two ways is used |

## What it does

1. **Scope.** Sorts the changed files into source, manifests, Dockerfiles and Containerfiles, Terraform and OpenTofu, and files that often hold secrets (Helm values, YAML, env files).
2. **Scan**, in parallel, only what changed, into `.vulnetix/review/`:

   | Scanner | Runs when | Output |
   |---|---|---|
   | SAST, `vulnetix scan --evaluate-sast` | Source changed | `sast.sarif` |
   | SCA, `vulnetix scan --evaluate-sca` | A manifest changed | `sca.json` |
   | Secrets, `vulnetix scan --evaluate-secrets` | Always | `secrets.json` |
   | Containers, `vulnetix containers` | A Dockerfile or Containerfile changed | `containers.json` |
   | IaC, `vulnetix iac` | A Terraform or OpenTofu file changed | `iac.json` |
   | Licences, `vulnetix license -o json-spdx` | A manifest changed | `licenses.json` |

3. **Check new dependencies.** Runs [`dependency-choice`](/pix/skills/dependencies/#dependency-choice) for each direct dependency the diff adds. Existing ones are not rechecked.
4. **Write the review.** One Markdown review, a section per scanner that ran, and a findings table of at most 50 rows sorted by severity and location.
5. **Post, if you agree.** With a PR number and a working `gh` it asks, then runs `gh pr review "$PR" --comment --body-file .vulnetix/review/<timestamp>.summary.md`. It never posts without asking.
6. **Record.** One `event: pr-security-review` entry with the counts in `.vulnetix/memory.yaml`. Decisions already recorded for individual vulnerabilities are not changed.

## Verdict

| Verdict | When |
|---|---|
| `APPROVE` | No critical or high blocker |
| `REQUEST_CHANGES` | At least one critical or high finding, a `BLOCK` from the dependency check, or a new secret |

In CI, treat `REQUEST_CHANGES` as the failing gate. Example output:

```markdown
**Verdict: REQUEST_CHANGES**

1 blocker: a high-severity SQL injection finding in api/handlers.go.

| Severity | Scanner | Location | Finding |
| --- | --- | --- | --- |
| High | SAST | api/handlers.go:57 | query built by string concatenation from a request parameter |
| Medium | Containers | Dockerfile:1 | base image runs as root |
| Low | Licences | package.json | new dependency is MPL-2.0 |
```

## Where Vulnetix data comes in

SAST, secrets, container and IaC scanning run locally on the CLI's rules. The vulnerability database is consulted twice: SCA matches the changed manifests' packages against the VDB, and `dependency-choice` looks each new package up (`vulnetix vdb packages search`, `packages get`, `package-vulns`). Both count against your daily API limit; a PR that adds several dependencies uses a visible share on the Community plan.

## Limits

- **The scans cover the project, not only the diff.** The definition passes changed paths with `--paths`, which in the current CLI is a hidden, deprecated boolean alias for `--show-introduced-paths`. The review can include findings in files the pull request did not touch.
- The slowest scanner, usually SAST on a large repository, sets the wall-clock time.
- PR scope needs `binaries.gh: true` and a valid `gh auth status`; otherwise it compares against `origin/main` or `BASE`.
- The definition's `chain` names a `code-review-security` skill that does not exist.
