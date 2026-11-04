---
title: The board
description: The kanban board agents and people share, with its five lists, cards, claims, routing and human checkpoints, in the Resolve Platform, the TUI and the CLI.
order: 9
sources: [belai/docs/kanban.md, belai/docs/fleet.md, belai/cmd/belai/kanbancmd.go, vdb-site/docs/factory.md, vdb-site/docs/belai-assignment-mail.md]
checked: [belai@35506b9, vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

The board is where work waits, is claimed and moves on. Every Belai session on a machine shares it, it is mirrored to the Resolve Platform while you are signed in, and workers claim cards from it. The Board page (`/resolve/factory-board`) shows it with tabs for the board, review, backlog, done, triage and conflicts, and a drawer for each card.

![The Board page with its lists and an open card drawer](/img/sf-board-dark.webp)

## The lists

| List | Means |
|---|---|
| `backlog` | Work nobody has started |
| `review` | Work a session noted as open, or a survey found. Confirm it before it is done. |
| `in_progress` | Work a session is doing now |
| `blocked` | Work that cannot continue. The last note says why. |
| `done` | Finished and verified, or confirmed obsolete |

## A card

A card has a short id such as `K-7f21a9` (`K-` and six hex characters), a title, details, labels, a priority from -2 to 3, an assignee, dependencies, and a history of every move and note. It also records the session that filed it, its project and directory, and, for a git checkout, the repository as `owner/name`, which is what lets a worker on any machine claim it.

When [issue mirroring](/software-factory/control/issue-mirroring/) is on, a card and its GitHub issue are one record.

## Claims and routing

A [worker](/software-factory/workforce/agents/) claims a card when the card is in a list it claims from, carries every label it asks for, and is assigned to it, its crew, or nobody. While it works, it holds a lease, which it renews. A lapsed lease frees the card and shows as a `claim_lapsed` checkpoint.

**Assigning** routes a card: to one agent profile (`belai:builder`), to a crew (`crew:<name>`), to a person (`person:<handle>`), or to a profile named explicitly (`worker:<profile>`, needed when a profile's own name starts with one of these prefixes). Assigning to a profile also adds that profile's claim labels and moves the card to the list it claims from. A card can be **pinned** to one host.

When a member is assigned a card on the website, they get one short email naming the card, its project, who assigned it and a link. The card's title and details are never in the email, because models and other people write them. Assigning to yourself sends nothing.

## Human checkpoints

A flow stage can hand its card on **held for a person**. The card gets a label `checkpoint:<reason>`, where the reason is `plan_approval`, `root_cause`, `visual` or `pre_pr`, and **no worker claims a card with a checkpoint label**. Only a person clears it:

- **Approve** removes the label and leaves the card for the next stage.
- **Reject** removes it and moves the card to `blocked` (or the list you name) with your reason.

One checkpoint belongs to the harness: `checkpoint:conflicts-unresolved`, when the [merge conflict](/software-factory/decisions/merge-conflicts/) loop gave up. Held cards appear on [Checkpoints](/software-factory/decisions/checkpoints/) and in the TUI's `/inbox`.

> [!WHY] Why a rejected plan goes to blocked
> A planner's card still carries the label a builder claims by. Sending a rejected plan back to the backlog would let a builder build the plan you just refused. Name `backlog` deliberately when you want it re-queued.

## Factory cards

Cards a workflow's crew step writes carry a factory summary on the Board: the run, the workflow and the step. While no machine can take the card, it shows **waiting** with the reason and a sentence, the same reasons as [Waiting for a machine](/software-factory/runs/waiting-for-a-machine/).

**Send to workflow** on selected cards starts a run of a published workflow for each card, sent as one request per repository. A card that does not say which repository it belongs to cannot be sent.

A card's **GitHub** tab shows its issue and the sync history, and the drawer's **Sync now** syncs it (1 to 3 GitHub calls). **Classify** tags a finished card that has a pull request with the kind of change it made (a fix for a scanner finding of a given kind, or an ordinary defect), asked of Jev.

## Quality and duplicates

Cards workers file are checked before they are written. A card that would duplicate an open one is refused. Cards an agent files for a person are written in the [ticket standard](/software-factory/workforce/ticket-standard/).

## In the TUI

`/kanban` views and manages the board. `/kanban K-xxxxxx` opens one card. In `/kanban`, `a` assigns, `L` edits labels, `+` and `-` change priority, and `u` releases a claim. `/inbox` lists cards waiting on you: held at a checkpoint, assigned to you, or blocked. `/todos` shows the session's own plan progress.

## On the command line

```sh
belai kanban add "Add a -json flag to agent ps" -label build -priority 2
belai kanban list -label build
belai kanban show K-3f9a2c
belai kanban move K-3f9a2c done -note "shipped"
belai kanban note K-3f9a2c "found the cause"
belai kanban release K-3f9a2c
belai kanban assign K-3f9a2c belai:builder -start
belai kanban checkpoint K-3f9a2c approve -note "scope is right"
belai kanban checkpoint K-3f9a2c reject -to backlog -note "reworded, build it"
belai kanban delete K-3f9a2c
belai kanban import items.jsonl
```

| Flag | Meaning |
|---|---|
| `-body`, `-body-file` | The card's details |
| `-list` | `backlog` (the default) or `review` for `add`; a filter for `list` |
| `-label` | A routing label. Repeatable. |
| `-flow` | `feature`, `bug` or `ui`: file it for that flow crew's first stage |
| `-priority` | -2 to 3 |
| `-assignee` | Route to one agent profile; a filter for `list` |
| `-depends` | A card that must be done first. Repeatable. |
| `-project` | File under another project; for `list`, `current`, `all` or a name |
| `-limit` | How many to list (default 50) |
| `-note` | A note with a move or checkpoint |
| `-to` | Where a rejected checkpoint goes (default `blocked`) |
| `-crew` | With `assign`, route to a crew's entry profile |
| `-host` | With `assign`: `this`, a host id, or `none` to unpin |
| `-start` | With `assign`, also start the worker or crew here |
| `-json` | Print JSON |

`import` reads one card per line: `{"title", "body", "list", "labels", "priority", "assignee", "depends_on"}`.

The board is the file `~/.vulnetix/belai/kanban`. Nothing in `belai kanban` runs a model.

## Settings

| Setting | Default | Effect |
|---|---|---|
| `kanban.mode` | `all` | The default mode for new GitHub bindings: `all`, `skip_review` or `off` |
| `kanban.opt_out_label` | `no-github` | The label that keeps a card off GitHub |
| `kanban.conflict_comment` | on | Comment on the issue once when a sync clash is held |

## API

| Method | Path |
|---|---|
| GET | `/v1/belai/kanban/items` |
| PUT, DELETE | `/v1/belai/kanban/items/{id}` |
| POST | `/v1/belai/kanban/items/batch` |
| GET | `/v1/belai/kanban/items/{id}/context` |
| POST | `/v1/belai/kanban/items/{id}/classify` |
| POST | `/v1/belai/assignees` |
| | GitHub sync: `/v1/belai/kanban/github/...`. See [GitHub sync](/software-factory/workforce/github-sync/). |
