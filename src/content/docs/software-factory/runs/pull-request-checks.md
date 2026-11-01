---
title: Pull request checks and rechecks
nav: Pull request checks
description: How the factory knows a pull request's checks and merge state without polling GitHub, where it reads them from, and when it spends a call to read them live.
order: 7
sources: [vdb-site/docs/factory.md, vdb-site/docs/factory-engine.md, vdb-site/api/internal/handler/factory_pr_checker.go, vdb-site/api/internal/handler/factory_session_recheck.go]
checked: [vdb-site@597344c, website@58b9ffa]
updated: 28 Oct 2026
---

Gates, the approve when ready output and the run page all need to know about a pull request: is it a draft, are its checks green, can it merge? The factory keeps this in a **mirror**, which GitHub's webhooks update: `pull_request`, `pull_request_review`, `check_run` and `check_suite` deliveries. Reading the mirror costs nothing.

## Where a step reads from

Gate steps choose with `checkSource`:

| `checkSource` | Reads |
|---|---|
| `mirror` | The webhook-fed mirror. The default. |
| `posture` | Accepted; a gate reads the mirror as it does for `mirror` |
| `live_if_stale` | The mirror, unless the newest signal is older than `liveIfOlderThanMs` (default `forge.stale.checks`, 2 minutes) and checks are still pending. Then one live read through the quota guard. A tenant whose `forge.read.default` is `live_api` reads this way whatever the node says. |

## Re-check on GitHub

GitHub does not always say what it knows. In particular it works out mergeability lazily, and no webhook says when the answer is ready. **Re-check on GitHub**, on the run page and on the session's git strip, makes one GraphQL query for the pull request and its checks, writes the result to the mirror, and shows it. It costs 1 GitHub call and shows that price on the button.

The engine uses the same check itself when it must: the approve when ready step asks once for the exact merge state when everything else holds, and the merge conflict step rechecks unknown pull requests at 0, 1, 3 and 10 minutes (1, 3 and 10 minutes after a push).

A recheck is refused with `bad_state` when the run or session has no pull request yet, and with 429 `github_rate_limited` or `github_share_exhausted` (with `resetAt`) when the quota guard refuses the call.

## API

| Method | Path | GitHub calls |
|---|---|---|
| POST | `/v1/factory/runs/{id}/recheck-pr` | 1 |
| POST | `/v1/factory/sessions/{id}/git/recheck` | 1 |

## Related

- [Gate node](/software-factory/workflows/nodes/gate/)
- [GitHub quota](/software-factory/cost/github-quota/)
