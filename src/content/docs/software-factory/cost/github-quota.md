---
title: Forge quota and the data plane
nav: Forge quota
description: How the factory shares each forge's rate limit with your own tools, its share and reserve, what each action costs, what happens when the share runs out.
order: 4
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_quota.go, vdb-site/api/internal/handler/factory_engine_quota.go, website/src/shared/factory-settings.ts]
checked: [vdb-site@597344c, website@58b9ffa]
updated: 28 Oct 2026
---

Each GitHub App installation has one rate limit, 5,000 calls an hour, shared by Vulnetix's enrichment, the factory and the people using the Resolve Platform. A [forge connection](/software-factory/control/forge-connections/) has one too. It is the scarcest thing the factory uses, so the factory is built to spend as little of it as possible.

> [!CAREFUL] Gitea and Forgejo report no budget
> GHES and GitLab send their rate limit with every answer, and the factory reads it as it does GitHub's. Gitea and Forgejo send none, so the factory counts its own calls on each connection in the clock hour against `forge.calls_per_hour` (default 5,000, from 100 to 100,000) and applies the share and reserve to that. The Quota panel marks such a connection as counted locally. Set it to what your instance allows.

## Where the factory reads GitHub from

Cheapest first:

1. **Your browser's cache**, then the factory API.
2. **Stored data**: repositories, pull requests, reviews, check runs, releases, alerts and scanner results, kept in mirror tables.
3. **Raw files**: SBOMs, SARIF, VEX and run artifacts, read when a panel opens.
4. **Webhooks**: GitHub tells the factory when something changes. 0 calls.
5. **A live API call**: only for a time-critical answer on a deliberate action, sent with `If-None-Match` so an unchanged answer costs nothing.

No page load calls GitHub. Only an action marked with a price, or a gate or output step, does.

| Setting | Values | Default | Effect |
|---|---|---|---|
| `forge.read.default` | `posture_mirror`, `s3_raw`, `live_api` | `posture_mirror` | Where steps read GitHub from by default |
| `forge.stale.repo` | duration | `6h` | How old repository data may be before a step reads it live |
| `forge.stale.pulls` | duration | `5m` | The same, for pull requests |
| `forge.stale.checks` | duration | `2m` | The same, for check runs |
| `forge.stale.alerts` | duration | `1h` | The same, for alerts |
| `forge.etag` | on, off | on | Send `If-None-Match` on every live read |
| `forge.polling.forbidden` | locked on | on | The factory never polls GitHub on a timer |
| `forge.poll.fallback` | `conditional_poll_10m`, `none` | `conditional_poll_10m` | For a board binding with no webhook, a 10 minute conditional poll |

The staleness settings apply to steps only. They never make a page call GitHub.

## The factory's share

| Setting | Default | Effect |
|---|---|---|
| `forge.quota.factory_share` | 10% | What the factory's own reads may use of each installation's hourly limit |
| `forge.quota.reserve` | 20% | Kept free for people and time-critical writes |
| `forge.quota.on_exhausted` | `pause_live_reads` | What a step does when the share is used up |
| `forge.quota.proactive_writes_per_hour` | 60 | Calls an hour the [default workflows](/software-factory/workflows/default-workflows/) may make on their own, per installation |

`factory_share` plus `reserve` cannot exceed 100.

Calls are classed by who makes them:

| Class | Who | Allowed while |
|---|---|---|
| A person | Someone pressed a priced button | the installation has calls left |
| Time-critical | Writes the factory must not skip: opening or readying a pull request, requesting reviewers, minting or revoking a token | the call fits in what is left. May use the reserve. |
| Deferrable | The factory's own reads, such as a gate's live read | it fits in the factory share and leaves the reserve untouched |

### When the share runs out

A step that is refused does what its `onQuotaLow` says, or else what `forge.quota.on_exhausted` maps to:

| `onQuotaLow` | `on_exhausted` | Effect |
|---|---|---|
| `use_cached` | `pause_live_reads` | Continue on stored data, marked stale |
| `defer` | `defer_to_next_window` | Wait until the limit resets. Nothing polls. |
| `escalate` | `escalate` | Ask a person, and hold the run |

A person's action that would go over the limit is refused with `github_rate_limited` and the time it resets. Stored data and webhooks keep working in every case; only buttons with a call count wait.

## Priced actions

Every button that calls GitHub shows its price before you press it, and the response reports what it spent.

| Action | Where | Calls |
|---|---|---|
| Refresh an installation | Repos › Organisations | 1 + 1 per 100 repositories |
| Sync a card | Board, card's GitHub tab | 1 to 3 |
| Open a pull request | `draft_pr` output | 1 to 3 |
| Re-check a pull request | Run page, session page | 1 |
| Fetch checks live | Gate step, when stored data is stale | 0 to 1 |
| Mint a token | For a run or scan | 0 (cached) to 1 |
| Revoke a token | Cancelling a run, stopping the factory | 0 to 1 each |
| Bind a board | Repos › With selected | 0 to 1 per repository |

## The Quota panel

The Budgets page shows each installation's and each forge connection's current hour: the limit and what is left, when it resets, calls by enrichment, the factory and people, the reserve held back, the factory's share used, calls per workflow over 24 hours, and the enrichment queue. The state is `ok`, `share_exhausted`, `limited` (below the reserve) or `secondary_limited` (GitHub asked the factory to back off; not yet recorded, as nothing stores the Retry-After). `quota` events mark each threshold.

## Other forge settings

Settings › Forge. These keys were `github.*`; the old names still work ([Forge connections](/software-factory/control/forge-connections/#settings-that-apply-to-every-forge)).

| Setting | Values | Default | Effect |
|---|---|---|---|
| `forge.calls_per_hour` | 100 to 100,000 | 5000 | The hourly budget the factory counts against on a Gitea or Forgejo connection, which reports none |
| `forge.branch_prefix` | 1 to 40 characters of letters, digits and `/ _ . -` | `belai/K-` | The prefix of every branch agents push. Events on these branches never start runs. |
| `forge.pr_state` | `draft`, `ready` | `draft` | The state pull requests open in |
| `forge.protected` | on, off | on | Never push to protected branches |
| `forge.check_runs` | on, off | off | Publish gate results as check runs. Needs the App permission `checks: write`. Gitea, Forgejo and GitLab have no check runs: there the result is a commit status. |

## API

| Method | Path |
|---|---|
| GET | `/v1/factory/quota?installation=` (includes the full price list; a forge connection's negative key filters on it, and its row carries `forge`, `host` and `budgetKnown`) |
| GET, PUT | `/v1/factory/quota/rules` with `{factoryShare, reserve, onExhausted, revision}` |
