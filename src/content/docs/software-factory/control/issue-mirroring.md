---
title: Issue mirroring
description: How a board card and a GitHub issue are kept as one record, what each binding's status means, how clashes are settled, and where to change it.
order: 3
sources: [vdb-site/docs/factory.md, vdb-site/docs/belai-github-sync.md, vdb-site/api/internal/handler/factory_repos.go]
checked: [vdb-site@597344c]
updated: 28 Oct 2026
---

When mirroring is on, a [board](/software-factory/workforce/board/) card and its GitHub issue are one record that either side can edit. The Repos page has an **Issue mirroring** section that shows every binding at once. This page explains what it shows. The sync itself is described in [Issue sync](/software-factory/workforce/github-sync/).

A board with nothing bound works as before, and none of this runs for it.

## The master switch and choices

| Choice | Values | Effect |
|---|---|---|
| Mirroring | on, off | The master switch for your board. |
| Backfill | `none`, `recent`, `all` | Which existing cards get an issue when you bind a project: none (only cards touched after binding), the last 30 days, or everything open. |
| Clash policy per field | `ask`, `board`, `github`, `newer` | What to do when the same field changed on both sides. `ask` holds the field for you to decide. Defaults: `ask` for title, details and list, `board` for priority. |
| Escalation hours | hours | An unresolved clash older than this is escalated and the board owner is emailed a link to the resolver. Default 24. |

## Bindings

A **binding** ties one board project to one repository. Its **mode** is the repository's board mode:

| Mode | Cards that get an issue |
|---|---|
| `all` | Every eligible card. |
| `skip_review` | A card gets its issue once it leaves Review. |
| `off` | None. The binding stays but sends nothing. |

**Inbound** decides whether a new issue on GitHub becomes a card in Review.

Each binding row shows a status and how changes reach it:

| Status | Meaning |
|---|---|
| `live` | Changes arrive by webhook. |
| `degraded` | No webhook is set up for it (a token binding with no repository webhook, or no GitHub App webhook configured), so the sync polls every 10 minutes. An issue edit can take up to 10 minutes to reach its card. |
| `lost_access` | GitHub refused the sign-in (401, 403 or 404). Nothing syncs until access is restored. |
| `off` | The binding's mode is `off`. |

| Delivery | Meaning |
|---|---|
| `app_webhook` | The GitHub App's webhook. |
| `repo_webhook` | A repository webhook the sync created, for a binding signed in with a token. |
| `poll_fallback` | A conditional poll with `If-None-Match`. An unchanged repository costs no rate limit. |
| `none` | Nothing is delivered. |

A repository checked out on two machines or in two worktrees has two project keys. The page folds them into one row per repository.

## How lists map to issues

| Card list | Issue |
|---|---|
| review, backlog, in_progress, blocked | open, with label `belai:review`, `belai:backlog`, `belai:in-progress` or `belai:blocked` |
| done | closed as completed |
| done, with the `not-planned` label | closed as not planned |

## Which cards never get an issue

- A card labelled `no-github` (the card's **Don't mirror** switch).
- A card labelled `security`, or carrying a finding, when the repository is public.
- A card that was done before the binding existed.

At most 30 issues are created per binding per pass, because GitHub throttles issue creation.

> [!CAREFUL] Security cards stay off public repositories
> A card about a vulnerability is never mirrored to a public repository, whatever the binding says. Keep the fix discussion on the board, or mirror it to a private repository.

## Clashes

Every change is merged against the last synced copy:

- **Title, list and priority** hold one value. If both sides changed it, the field's policy decides.
- **Details (the body)** merge line by line. Only overlapping edits clash.
- **Labels** merge as a set. An add beats a remove.
- **Notes and comments** are appended both ways.
- **Assignees** are not mapped, because a card is assigned to a worker, crew or person handle. The card's GitHub tab shows them.

A held clash shows on the board's Conflicts tab and as one comment on the issue. Resolve it there by picking the board value, the GitHub value or your own.

## Where to change things

Every change is made on the existing board settings routes. The Issue mirroring section reads them all at once:

| Change | Route |
|---|---|
| Master switch, backfill, policies, escalation hours | `PUT /v1/belai/kanban/github/config` |
| Bind, change mode or repository, toggle inbound | `PUT /v1/belai/kanban/github/bindings` |
| Stop mirroring | `DELETE /v1/belai/kanban/github/bindings` |
| Preview a backfill | `GET /v1/belai/kanban/github/backfill?projectKey=` |
| List and resolve clashes | `GET /v1/belai/kanban/github/conflicts`, `POST .../conflicts/{cid}/resolve` |

The section itself is `GET /v1/factory/repos/mirroring`. It makes no GitHub calls.

## Related

- [Issue sync](/software-factory/workforce/github-sync/) for the sync engine, sign-in and failures.
- [The board](/software-factory/workforce/board/)
