---
title: Granular actions
description: Run one job per language or package manager with sast/<language> and sca/<manager>, and keep coverage whole with a rest step.
order: 3
sources: [cli/tools/actiongen/catalog.go, cli/internal/sast/language_scope.go, cli/internal/scan/package_manager.go, cli/cmd/scan_scope.go]
checked: [cli@v4.23.0]
updated: 05 Nov 2026
---

`Vulnetix/cli/sast` and `Vulnetix/cli/sca` scan a whole repository in one job. The granular actions scan part of one, so a repository can run languages in parallel and gate each on its own terms.

## Which to use

| Repository | Use |
|---|---|
| One or two languages | `sast/<language>` for each, in parallel jobs, with a rest step in the largest |
| Three or more languages | `sast`, the high-level action |
| One or two package managers | `sca/<manager>` for each, with a rest step in the largest |
| Three or more package managers | `sca`, the high-level action |

A language counts once it has 10 or more files and 2% of the source. [`vulnetix gha init`](#vulnetix-gha-init) applies these rules for you.

## A two-language repository

```yaml
jobs:
  sast-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/sast/python@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          fail-on: critical
      # The rest step: everything the language jobs do not cover.
      - uses: Vulnetix/cli/sast@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          not-language: python,javascript
  sast-javascript:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/sast/javascript@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
```

## Why the rest step matters

Every file has exactly one language or package manager, so jobs never overlap. Files no job names are not scanned by those jobs: configuration files, languages below the threshold, and rules that report on a file type no language claims, such as a Java rule on `application.properties`.

`--not-language` scans those. The language jobs plus the rest step report exactly what `sast` reports. The same holds for `--not-package-manager`, whose job also covers committed SBOMs and the packages named in CI pipelines and shell scripts.

`typescript` is another name for `javascript`: `sast/typescript` and `sast/javascript` scan the same files, so use one.

## What each job writes

| | `sast/python` | `sca/npm` |
|---|---|---|
| File | `.vulnetix/sast.python.sarif` | `.vulnetix/sbom.npm.cdx.json`, `.vulnetix/sca.npm.sarif` |
| Code scanning category | `vulnetix/sast/python/` | `vulnetix/sca/npm/` |
| Tool name in Vulnetix | `Vulnetix SAST python` | `Vulnetix SCA npm` |

Each job keeps its own history. A finding missing from a job is only compared with what that job scans, so `sast/python` never closes a JavaScript finding. Code scanning works the same way: an alert closes against a later upload in its own category.

Moving a repository from `sast` to the granular actions starts new histories. Findings recorded under the old tool name are not compared with the new jobs, so close or review them in Vulnetix. Local `.vulnetix/memory.yaml` is not resolved by absence on a scoped `sca` run.

## The whole-repository SBOM

A scoped job's SBOM holds one manager's packages. Keep one `Vulnetix/cli/sbom` job for attestation, the dependency graph and [TEA](/tea/github-actions/tea-release/). `dependency-graph` is not offered on `sca/<manager>`, because a snapshot replaces the last one and a scoped job sees only part of the dependency list. To join the fragments into one document, use [`bom-merge`](/sbom/github-actions/bom-merge/).

## Fork pull requests

A pull request from a fork has no secrets, so the actions run in community mode with no credentials and nothing uploads. Code scanning needs a token a fork does not have, so publish only on push:

```yaml
github-code-scanning: ${{ github.event_name == 'push' }}
```

Never run a public repository's pull request jobs on a self-hosted runner.

## vulnetix gha init

```sh
vulnetix gha init --triggers pr --runner ''
```

Writes `.github/workflows/vulnetix.yml` from what the repository contains and `.vulnetix/workflow.yaml`, and a Dependabot configuration when there is none. It refuses to replace a `vulnetix.yml` it did not write unless you pass `--force`. Re-run it after you change the policy.

```yaml
# .vulnetix/workflow.yaml
version: 1
triggers: pr        # pr, push, or belai (main plus belai/ pull requests)
runner: ''          # a self-hosted label; empty uses ubuntu-latest
publish: true       # code scanning, dependency graph and attestation on push
sast: auto          # auto, high, none, or a list of languages
sca: auto           # auto, high, none, or a list of package managers
gates:
  secrets: high
  sast: critical
  sca: critical,malware
rules:
  sast/go: [Vulnetix/opa-gosec]
```

A scanner with no gate reports and never fails its job. There is no baseline, so turn a gate on once a run is clean at that level.

On a pull request the rendered jobs do not spend the repository's GitHub API quota. Every scanner step gets `github-token: ${{ github.event_name != 'pull_request' && github.token || '' }}`, so a pull-request scan runs without the job token and does not resolve unknown licences through the GitHub API, and the `analyze` job adds `--no-forge`, so it skips the pass that reads every pull request and issue. That quota is shared with every other job in the repository, CodeQL's SARIF upload among them, and a large repository's scans used to spend it in minutes. The push to the default branch keeps the token and is the run that publishes.

The forge pass is bounded on every other run too. On a push or a release the `analyze` job passes `--forge-window-days=7`, so it reads only the last week of pull requests, issues and commit reviews from GitHub. The git history window stays at a year. Only a manual run (`workflow_dispatch`) reads the full window from GitHub. Whatever the window, `analyze` stops the forge pass while half the token's hourly limit is still left, and the report carries a warning when it stopped early. A push lands on every merge, and an auto-versioned repository publishes a release on every merge too. A year-long forge pass on each of them used to spend the repository's quota until CodeQL's upload and the release dispatch failed with `API rate limit exceeded for installation`.

The licence lookups are bounded on a push as well. The scanners that resolve licences (`sca`, `license`, `sbom`, `containers` and `scan`) ask GitHub only about a repository whose licence the Vulnetix store, the package registry and deps.dev could not name. They never ask about a name that cannot be a GitHub repository, such as a workflow's `uses: $/sbom`, a glob or a template placeholder, and they stop at the first 404. A repository costs one to four requests.

Inside GitHub Actions the lookups also keep 80% of the token's hourly limit for everything else: with a 5,000 limit, they stop at 4,000 left. The remaining count belongs to the repository, so it is the same in every job, and that floor holds for the whole run however many jobs look up licences. It sits above the half that `analyze` keeps. They also stop at once when GitHub answers with a rate limit. A licence they did not check stays `UNKNOWN`, and the job log says how many repositories went unchecked. Every batch of lookups in Actions logs what it cost, for example `GitHub licence lookups: 31 requests for 26 repositories (4880 of 5000 left)`.

On the push that merged Vulnetix/cli#341, before this bound, those lookups spent 4,913 requests in under three and a half minutes, and the SCA job’s SARIF upload then failed with `GitHub API rate limit exhausted`.

An extra's `prior` step that runs a scanner gets `github-token: ""` on every event, since it only writes the file the extra reads.

`vulnetix gha init --check` writes nothing and exits 1 when the workflow differs from what the policy renders. It ignores action refs, so a [locked](/cli/ci-cd/actions-lockfile/) workflow stays current.
