---
title: analyze
description: vulnetix analyze graphs the repository's tech stack with cross-repo join keys and reports evidence-backed activity, security, quality and trust metrics.
order: 3
sources: [cli/cmd/analyze.go, cli/cmd/insights_upload.go, cli/internal/analyze/run.go, cli/internal/analyze/forge/auth.go, cli/internal/analyze/collect_contracts.go, cli/internal/analyze/collect_coupling.go, cli/internal/analyze/collect_egress.go, cli/schemas/vulnetix-analyze-report.schema.json]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

```sh
vulnetix analyze [path] [flags]
```

`analyze` does two things over one repository:

- **Builds a graph** of its files, symbols, dependencies, images, workflows, infrastructure and contributors, plus **cross-repo join keys**: what this repository provides and what it consumes. It never reads a second repository. The server joins one repository's provides to another's consumes, so running `analyze` in every repository's CI gives the organisation graph in the Resolve Platform (`/resolve/graph`) without any repository needing access to another.
- **Reports metrics, each with the evidence that produced it.** A count of 23 has 23 evidence records; a capped metric says how many items it dropped and why; a metric that could not be measured is `null`, never `0`. Every metric is on [analyze metrics](/cli/commands/analyze-metrics/).

## Before you run it

**GitHub credentials.** Review coverage, response times and unreviewed commits on the default branch live in GitHub, not in git. `analyze` resolves a token before it scans, makes one API call to check it, and stops if there is none:

| Order | Source |
|---|---|
| 1 | `GITHUB_TOKEN` (set by GitHub Actions when you pass `${{ github.token }}`) |
| 2 | `GH_TOKEN` |
| 3 | `gh auth token`, if the `gh` CLI is installed and signed in |

On success it prints, for example, `GitHub authentication: ok (octocat via gh CLI, 4,987/5,000 requests remaining)`. The token needs read access to the repository's contents, pull requests and issues. A token that is valid but cannot see a private repository gets `404 Not Found` from GitHub; `analyze` reports that as `the GitHub token from <source> is valid (authenticated as <login>) but cannot read <owner>/<repo>`. Fine-grained tokens only see the repositories listed under Repository access.

`--no-forge` skips GitHub: those metrics are then `not measured`. A repository whose remote is not GitHub skips the check by itself.

**The GitHub quota is shared.** In GitHub Actions, the job token's hourly quota belongs to the whole repository, and every job shares it. So `analyze` stops reading from GitHub while half the token's hourly limit is still left (never less than 100 requests). When that happens, the report carries a `forge` warning saying so. Each pull request costs several requests. `--forge-window-days` reads a shorter window from GitHub than `--window-days` reads from git, so the run makes fewer requests. If other jobs have already spent the quota when `analyze` starts, it does not stop. It skips GitHub as `--no-forge` would, and reports those metrics as `not measured`. Every other metric is still reported.

**A clone or a worktree.** Both work: a worktree's history is read from the main repository's git directory, so history metrics match the main checkout. A shallow clone has less history; increase the fetch depth for the window you want.

**Vulnetix credentials (optional).** Dependency staleness needs registry metadata from Vulnetix. Without credentials those metrics are `null` with a reason, and the report is not uploaded.

## Flags

| Flag | Default | Effect |
|---|---|---|
| `[path]`, `--path <dir>` | `.` | Repository to analyse. The positional argument wins. |
| `--window-days <n>` | `365` | How far back to walk history |
| `--forge-window-days <n>` | `0` (same as `--window-days`) | How far back to read pull requests, issues and commit reviews from GitHub |
| `--max-commits <n>` | `20000` | Cap on commits walked; the report says when it was hit |
| `--complexity-threshold <n>` | `15` | Cyclomatic complexity at which a file counts as highly complex |
| `--no-git` | off | Skip the history walk: activity, contributor and ownership metrics are absent |
| `--no-files` | off | Skip the file and complexity pass |
| `--no-deps` | off | Skip the dependency pass, and the cross-repo package edges with it |
| `--no-trust` | off | Skip the open-source policy checks |
| `--no-forge` | off | Skip GitHub; pull request, review and issue metrics are `not measured` |
| `-o`, `--output` | `pretty` | Terminal format: `pretty`, `json` |
| `--output-file <path>` | `<path>/.vulnetix/analyze.report.json` | Where the report is written |
| `--no-upload` | off | Do not submit the report |
| `--fail-on-upload-error` | off | Exit non-zero if the report could not be stored |

Global flags apply; `--silent` also suppresses the `Wrote analysis report to ...` line.

## What it produces

- `.vulnetix/analyze.report.json`, validated against [the report schema](https://www.vulnetix.com/schemas/vulnetix-analyze-report.schema.json) before it is written.
- A terminal summary grouped by metric family.
- When signed in, an upload to `/v2/cli.insights`, which feeds the Resolve Platform graph. The upload is best effort: a failure is reported and the command still succeeds, unless `--fail-on-upload-error` is set.

## In GitHub Actions

```yaml
name: Analyze
on:
  push:
    branches: [main]
  schedule:
    - cron: "17 3 * * 1"
permissions:
  contents: read
  pull-requests: read
  issues: read
jobs:
  analyze:
    runs-on: ubuntu-latest
    env:
      GITHUB_TOKEN: ${{ github.token }}
      VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
      VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - name: Install Vulnetix CLI
        run: |
          curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"
      - run: vulnetix analyze --fail-on-upload-error
```

`fetch-depth: 0` gives `analyze` the full history; the default shallow checkout has one commit.

## The graph

The report schema's node kinds cover code (`file`, `function`, `method`, `class`, `interface`, `struct` and others), the supply chain (`dependency`, `package`, `manifest`, `container_image`, `container_registry`, `helm_chart`, `terraform_module`, registries), the service surface (`route`, `topic`, `workflow`, `action`, `service`), infrastructure (`iac_resource`), outbound hosts (`egress_domain`) and people (`contributor`).

| Edge | Means |
|---|---|
| `contains` | The repository contains a file; a file contains a symbol |
| `imports` | A file imports another file in this repository, resolved exactly, never guessed |
| `calls` | A static call site resolved to a function, method or class defined here. Ambiguous and external calls are left out. |
| `depends_on` | The repository depends on a package |
| `authored` | A contributor authored commits |
| `couples_with` | Two files keep changing in the same commits. Derived from history, not code. Commits touching more than 60 files are left out. |

### Cross-repo join keys

| Join kind | Provided when | Consumed when |
|---|---|---|
| `package` | The repository declares a module (`go.mod`, `package.json`, ...) | It depends on one |
| `http_route` | A file sets up a router and declares the route | Not detected: a path-like string in a client is a guess, so a missing edge does not mean nothing calls the route |
| `topic` | A publish call names it | A subscribe call names it |
| `container_image` | | A `FROM` or a compose `image:` names it |
| `workflow` | The repository defines a reusable workflow (`on: workflow_call`) | A workflow `uses:` it |

Keys are normalised so different spellings meet: `/users/:id` and `/users/{userId}` both become `GET /users/{param}`, and image tags are stripped (`acme/api:1.2.3` and `acme/api:1.3.0` are one image). Health-check routes (`/health`, `/readyz`, `/metrics`, ...) are excluded, because every service has one.
