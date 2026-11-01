---
title: Issue and label sync with your forge
nav: Issue sync
description: How a board card and an issue on GitHub, GHES, Gitea, Forgejo or GitLab stay one record. Sign-in, how changes arrive, the merge that settles both sides, which cards get an issue, labels, and what happens on failure.
order: 11
sources: [vdb-site/docs/belai-github-sync.md, website/.repo/belai-github-sync.md, vdb-site/api/internal/handler/belai_github.go, vdb-site/api/internal/handler/belai_github_engine.go]
checked: [vdb-site@597344c, website@58b9ffa]
updated: 28 Oct 2026
---

A board card and a GitHub issue can be kept as one record that either side can edit. GitHub is optional: a board with nothing bound works as before. The [Issue mirroring](/software-factory/control/issue-mirroring/) section of the Repos page is where you see and change every binding; this page explains the sync itself.

## Signing in

A binding signs in one of two ways:

| Sign-in | How |
|---|---|
| GitHub App | Your installation's token, cached for 40 minutes |
| A token in the Secrets Vault | The first `GITHUB_TOKEN` entry in your vault that can write issues on the repository. Its entry is remembered on the binding. |
| A forge connection | For a repository on GHES, Gitea, Forgejo or GitLab: the [connection's](/software-factory/control/forge-connections/) bot, with `via: "connection"`. Its own webhooks bring the issue events, so the binding makes no hook. |

If no sign-in can write issues, the binding's status is `lost_access`.

> [!CAREFUL] What differs off GitHub
> Issue deliveries match a binding by host and name, so a Gitea issue never reaches a GitHub binding of the same name. Gitea, Forgejo and GitLab issues have no close reason, so the card keeps "not planned" on the board only. Gitea names labels by id; the factory resolves them, and creates a missing one.

## How changes arrive

| Sign-in | Delivery |
|---|---|
| App | The App's webhook. A conditional poll every 10 minutes is the safety net. |
| A token that can administer the repository | A repository webhook the sync creates, plus the 10 minute poll |
| Any other token | A conditional poll every minute |

Every poll sends `If-None-Match`, so an unchanged repository costs no rate limit.

## One merge for every change

Every change, from either side, is merged against the last synced copy:

| Field | Merge |
|---|---|
| Title, list (the issue's state), priority | One value. A clash goes to the field's policy: `ask` (hold it for you), `board`, `github` or `newer`. |
| Details (the body) | Merged line by line. Only overlapping edits clash. |
| Labels | Merged as a set. An add beats a remove. |
| Notes and comments | Appended both ways |
| Assignees | Not mapped. Shown on the card's GitHub tab. |

Because every sync merges against the last copy, a change the sync made itself comes back as "nothing changed" and stops there. A held clash appears on the board's Conflicts tab and as one comment on the issue.

## Lists and labels

| Card list | Issue |
|---|---|
| `review` | open, label `belai:review` |
| `backlog` | open, label `belai:backlog` |
| `in_progress` | open, label `belai:in-progress` |
| `blocked` | open, label `belai:blocked` |
| `done` | closed as completed |
| `done` with label `not-planned` | closed as not planned |
| deleted | closed as not planned, with a comment |

The sync creates the `belai:` labels in the repository, each with its own colour: `belai:review` amber (`e8912b`), `belai:backlog` grey (`8fa8a3`), `belai:in-progress` teal (`3ac4b4`) and `belai:blocked` red (`e2564e`).

An open issue with no card becomes a card in Review. An issue whose body carries the card's hidden marker is relinked to its card.

## Which cards get an issue

- The board's mirroring is on and the binding's mode is not `off`.
- With `skip_review`, a card gets its issue once it leaves Review.
- A card labelled `no-github` (the card's **Don't mirror**) never does.
- A public repository never receives a card labelled `security` or carrying a finding.
- A card done before the binding existed stays off.
- Backfill: `none` (cards touched after binding), `recent` (the last 30 days) or `all` (everything open).

At most 30 issues are created per binding per pass, because GitHub throttles creation.

## Projects and repositories

A card's project key is the checkout it was filed in, so the same repository checked out on two machines, or in two worktrees, has two keys. The sync binds a key to a repository, and the settings list folds the keys of one repository into one row, so each repository is listed once.

## When it fails

- A rate limit queues the card until GitHub's reset.
- 401, 403 or 404 marks the binding `lost_access` and drops the cached credential.
- Other failures back off exponentially, up to 12 attempts, then the card's GitHub tab shows an error.
- An unresolved clash older than the escalation hours is escalated, and the board owner is emailed a link to resolve it.

## API

| Method | Path |
|---|---|
| GET, PUT | `/v1/belai/kanban/github/config` |
| PUT, DELETE | `/v1/belai/kanban/github/bindings` |
| GET | `/v1/belai/kanban/github/status`, `/repos`, `/projects`, `/backfill` |
| GET, POST | `/v1/belai/kanban/github/conflicts`, `/conflicts/{cid}/resolve` |
| GET, POST | `/v1/belai/kanban/github/items/{id}`, `/sync`, `/link`, `/unlink`, `/mirror` |
| POST | `/v1/webhooks/github/repo/{bindingId}` (a repository webhook) |
