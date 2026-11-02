---
title: analyze metrics
nav: analyze metrics
description: Every metric vulnetix analyze reports, its definition as the report states it, and how a metric relates to its evidence.
order: 4
sources: [cli/internal/analyze/collect_git.go, cli/internal/analyze/collect_forge.go, cli/internal/analyze/collect_files.go, cli/internal/analyze/collect_coupling.go, cli/internal/analyze/collect_trend.go, cli/internal/analyze/collect_secrets.go, cli/internal/analyze/collect_trust.go, cli/internal/analyze/collect_deps.go, cli/internal/analyze/collect_symbols.go, cli/internal/analyze/collect_contracts.go, cli/schemas/vulnetix-analyze-report.schema.json]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

Each metric in `.vulnetix/analyze.report.json` carries its own definition and thresholds, so the report explains itself. The definitions below are the ones the collectors write. Metrics whose ID contains `{median,p90,mean}` are emitted once per statistic.

## How a metric relates to its evidence

| `evidenceSemantics` | Meaning |
|---|---|
| `instances` | The value counts the evidence: 23 means 23 evidence records |
| `population` | The value is a statistic (median, slope, ratio); the evidence is the whole population it was computed over, and `populationSize` says how large |
| `assertion` | A single judgement (a category, a boolean) backed by evidence with no countable relation to it |

| `evidenceCompleteness` | Meaning |
|---|---|
| `exhaustive` | Every evidence item is present |
| `truncated` | A cap was hit; `omittedCount` and `truncationReason` are required |

A report whose evidence does not add up is rejected by the CLI before writing and by the server on upload. A collector that could not run contributes `null` and a diagnostic, never zeros.

`maintainability.repo.status` uses one ladder, also applied to contributors and dependency files: `Active` at 90 days or less since the last commit, `Aging` at 180 or less, `Stale` at 365 or less, otherwise `Unmaintained`.

## Activity

| Metric | Name | Definition |
|---|---|---|
| `activity.pull_requests.total` | Pull requests | Pull requests updated within the history window. |
| `activity.pull_requests.merged` | Merged pull requests | Pull requests that were actually merged. A pull request closed without merging is a rejection, not a merge, and is counted separately. |
| `activity.pull_requests.rejected` | Rejected pull requests | Pull requests closed without being merged. Counted, rather than dropped, a rejection is data. |
| `activity.pull_requests.open` | Open pull requests | Pull requests still open at the time of the scan. |
| `activity.issues.total` | Issues | Issues updated within the history window. Pull requests are excluded, GitHub's issues API returns them, and counting them here would double-count every one. |
| `activity.issues.open` | Open issues | Issues still open at the time of the scan. |
| `activity.issues.closed` | Closed issues | Issues closed within the history window. |
| `activity.issues.unanswered` | Unanswered issues | Issues with no comment from anybody other than the author, excluding bots. These are excluded from the response-time statistics, an issue nobody answered has no response time, and averaging it in as a zero would say the opposite of the truth. |
| `activity.commits.total` | Commits | Commits reachable from HEAD within the history window, including bot and agent commits. |
| `activity.commits.human` | Human commits | Commits whose author was not classified as a bot or an AI agent. |
| `activity.commits.bot` | Bot commits | Commits authored by a CI, dependency or service bot (see the identity catalog for the rule that classified each). |
| `activity.commits.ai_agent` | AI-agent commits | Commits authored by an AI coding agent. Counted separately from both humans and CI bots, because an agent's commits are neither. |
| `activity.commits.merge` | Merge commits | Commits with more than one parent. |
| `activity.branches.total` | Branches | Branches present in this checkout, counted once per branch name whether the ref is local or remote-tracking. A shallow or single-ref clone holds fewer than the repository has. |
| `activity.branches.stale` | Stale branches | Non-default branches whose last commit is more than 90 days old, the same 90-day threshold every other staleness signal in this report uses. |
| `activity.contributors.total` | Contributors | Distinct human contributors (commit authors and Co-authored-by trailers) in the history window, after identity merging. Bots and AI agents are excluded. |
| `activity.contributors.active` | Active contributors | Human contributors with at least one commit in the last 90 days. |
| `activity.contributors.new` | New contributors | Human contributors whose first commit in the window was within the last 90 days. |
| `activity.contributors.departed` | Departed contributors | Human contributors silent for more than 90 days but active within the last 365, the recent-departure signal. Contributors gone longer than a year are excluded as history rather than churn. |
| `activity.bus_factor.commits` | Bus factor (commits) | The smallest number of contributors whose cumulative share of commits, ranked descending, first exceeds 50% of all commits in the window. Bots excluded. The evidence is the whole ranked contributor list, because the number means nothing without the distribution behind it. |
| `activity.ownership.top_contributor_share` | Top contributor share | Share of all human commits in the window authored by the single most prolific contributor. |
| `activity.time_to_first_response.{median,p90,mean}` | Time to first response | Seconds from a pull request becoming ready for review to the first comment or review by someone other than the author, bots excluded. |
| `activity.time_to_first_review.{median,p90,mean}` | Time to first review | Seconds from ready for review to the first submitted review. A comment is not a review. |
| `activity.time_to_merge.{median,p90,mean}` | Time to merge | Seconds from ready for review to merge, for merged pull requests only. |
| `activity.issues.time_to_first_response.{median,p90,mean}` | Issue time to first response | Seconds to the first comment by someone other than the author. Unanswered issues are excluded, not counted as zero. |
| `activity.issues.time_to_close.{median,p90,mean}` | Issue time to close | Seconds from opening to closing, for closed issues. |

## Security

| Metric | Name | Definition |
|---|---|---|
| `security.pull_requests.reviewed` | Reviewed merged pull requests | Merged pull requests with at least one approving review from somebody other than the author. A self-approval is not review coverage. |
| `security.pull_requests.unreviewed` | Unreviewed merged pull requests | Merged pull requests with no approving review from anybody other than the author. |
| `security.pull_requests.self_merged` | Self-merged pull requests | Merged pull requests where the author merged their own work with no approving review from anybody else. |
| `security.commits.unreviewed` | Unreviewed commits on the default branch | Commits that reached the default branch with no approving review on any associated pull request. |
| `security.commits.review_unknown` | Commits with no resolvable pull request | Commits on the default branch for which no pull request could be found at all. These are NOT counted as unreviewed: we could not tell, and 'we could not tell' is a different claim from 'nobody reviewed it'. |
| `security.commits.signed` | Signed commits | Commits carrying a PGP signature. Presence only, verification needs the signer's public key, which the CLI does not have, so a signed commit is reported as present-but-unverified rather than valid. |
| `security.secrets.history` | Secrets in git history | Credentials found in commit messages or in the names of files that were ever committed. |
| `security.secrets.commit_messages` | Secrets in commit messages | Credentials written into a commit message. No content scanner looks here, because the message is not a file. |
| `security.secrets.committed_files` | Secret files ever committed | Files whose names mark them as credentials (private keys, .env, service-account JSON, keystores) that appear anywhere in history, whether or not they still exist at HEAD. |

## Quality

| Metric | Name | Definition |
|---|---|---|
| `quality.coupling.pairs` | Coupled file pairs | Pairs of files that change together in the same commit at least 3 times. |
| `quality.coupling.strong` | Strongly coupled file pairs | File pairs that change together at least 70% of the time the rarer of the two changes. These are the hidden architectural dependencies: two files that must move together, with nothing in the code to say so. |
| `quality.complexity.median` | Median file complexity | Median cyclomatic complexity across source files, counted as decision points plus one (if/for/while/case/catch/ternary/boolean operators), per language, via tree-sitter. Files in languages with no complexity grammar are excluded, not scored zero. |
| `quality.complexity.p90` | 90th-percentile file complexity | 90th-percentile cyclomatic complexity across source files. The tail is where the maintenance cost lives; the median hides it. |
| `quality.commits.fix` | Fix commits | Commits whose subject begins with a corrective word (fix, bug, hotfix, patch, repair, resolve, correct). Depends entirely on commit-message discipline; see the caveat in diagnostics. |
| `quality.commits.revert` | Revert commits | Commits whose subject begins with revert, undo or rollback, the firefighting signal. |
| `quality.complexity.rising` | Files with rising complexity | Files whose cyclomatic complexity is trending upward over the history window. |
| `quality.complexity.trend_median` | Median complexity trend | Median least-squares slope of cyclomatic complexity per day, across the busiest and most complex files. A positive number means the codebase's hot files are getting harder to work in. |
| `quality.hotspots` | Hotspots | Files with at least 5 commits in the window and cyclomatic complexity at or above --complexity-threshold (default 15). |

## Maintainability

| Metric | Name | Definition |
|---|---|---|
| `maintainability.ownership.single_maintainer` | Single-maintainer files | Files with at least 3 commits in the window where one author holds 70% or more of them. The knowledge concentration risk. |
| `maintainability.ownership.fragmented` | Fragmented files | Files with at least 10 commits touched by 5 or more distinct authors, the opposite of concentration, where nobody owns the file. |
| `maintainability.repo.status` | Repository status | Development status from days since the most recent commit. |

## Trust

| Metric | Name | Definition |
|---|---|---|
| `trust.policy.breaches` | Open-source policy breaches | Compliance checks with no satisfying file: license, README, contributing guide, code of conduct, security policy, changelog, support policy, code owners, issue and PR templates, CI configuration, dependency automation, tests. Each breach records the globs that were searched. |
| `trust.policy.satisfied` | Open-source policy checks satisfied | Compliance checks with a satisfying file present. The evidence is the file that satisfied each one. |

## Business

| Metric | Name | Definition |
|---|---|---|
| `business.dependencies.total` | Declared dependencies | Distinct dependencies declared across every manifest in the repository, deduplicated by package URL. |
| `business.dependencies.direct` | Direct dependencies | Dependencies declared directly by this repository, as opposed to those pulled in transitively. |
| `business.files.source` | Source files | Files with a recognised source language, excluding vendored, generated and dependency directories, and files over 1 MiB. |
| `business.dependencies.stale` | Stale dependencies | Dependencies more than 2 releases behind the version the ecosystem recommends. `versionsBehind` counts the releases published between the resolved version and the recommended one, not the total number of releases, so a package pinned to the newest version is zero behind however long its release history is. |
| `business.dependencies.very_stale` | Badly stale dependencies | Dependencies more than 6 releases behind the recommended version. At this distance an upgrade is a project, not a bump, which is why it is worth separating. |
| `business.dependencies.eol` | End-of-life dependencies | Dependencies whose version is past its end-of-life date. No further security fixes will be published for them, regardless of what is found. |
| `business.dependencies.aged` | Dependencies not released in over a year | Dependencies whose resolved version was published more than a year ago. Not automatically a problem, some libraries are finished, but combined with an advisory it means nobody is coming to fix it. |
| `business.language.<language>` | Source files per language | Source files in each language. |
| `business.dependencies.ecosystem.<ecosystem>` | Dependencies per ecosystem | Declared dependencies in that ecosystem. |

## Graph

| Metric | Name | Definition |
|---|---|---|
| `graph.cross_repo.total` | Cross-repo join keys | Every key this repository publishes for the org graph: packages, HTTP routes, topics, container images and reusable workflows, each as a provides or a consumes. Health-check endpoints are excluded, every service has one, and publishing them would link every repository to every other. |
| `graph.symbols.total` | Symbols | Functions, methods, classes and interfaces defined in this repository, extracted with tree-sitter. Languages with no extraction query are excluded, not counted as zero. |
| `graph.imports.resolved` | Resolved internal imports | Import statements that resolve to a file within this repository. Imports of external packages are dependency edges, not import edges, and an import that resolves to nothing produces no edge at all, rather than a guess with a confidence attached to it. |
| `graph.calls.resolved` | Resolved local calls | Static call sites resolved to functions, methods or classes defined in this repository. Ambiguous and external calls are omitted rather than guessed; repeated call sites between the same two symbols are collapsed into one edge with a count. |
| `graph.symbols.<kind>` | Symbols per kind | Functions, methods, classes and interfaces, counted per kind. |

## Notes on the forge metrics

- `security.commits.unreviewed` checks at most 300 default-branch commits for an associated pull request; past that the metric is marked truncated.
- `security.commits.review_unknown` is kept apart from `unreviewed` on purpose: "no pull request found" is not "nobody reviewed it".
- The forge metrics need a GitHub token; see [analyze](/cli/commands/analyze/#before-you-run-it). Without one, or with `--no-forge`, they are `not measured`.
- The staleness metrics need Vulnetix credentials for registry data. Without them they are `null` with a reason.
