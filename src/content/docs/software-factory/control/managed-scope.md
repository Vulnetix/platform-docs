---
title: Managed orgs and repositories
nav: Managed scope
description: Which GitHub organisations and repositories the factory may act on, how a repository gets listed, and the per-repository settings that override the tenant's.
order: 1
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_orgs.go, vdb-site/api/internal/handler/factory_repos_store.go, website/src/shared/factory-settings.ts]
checked: [vdb-site@597344c, website@58b9ffa]
updated: 28 Oct 2026
---

The factory explores and acts only inside **managed orgs**. Every GitHub App installation on your tenant is listed on the Repos page (`/resolve/factory-repos`). Installations you have not switched on stay visible and read-only.

## Managing an organisation

On the Repos page, under Organisations, switch **Managed** on for an installation. A [forge connection](/software-factory/control/forge-connections/) is listed there too, as its forge and host (for example "Gitea on git.example.com"), and is managed the same way; in `scope.orgs` its account is written `host/account`, so `acme` on github.com and `codeberg.org/acme` stay apart, and its repositories are named `host/owner/name`. Only owners and admins can. This is the same value as the `scope.orgs` setting, so changing either changes both.

When you manage an organisation:

- New events from its repositories can start runs.
- The seven [default workflows](/software-factory/workflows/default-workflows/) are seeded for it, unless `defaults.enabled` is off.
- Its repositories under `autonomy.default` (see below) are eligible for those defaults.

When you switch it off:

- New webhook and label triggers for its repositories are skipped. Each skip is recorded as a `trigger.skipped` event with reason `org_disabled`.
- Runs already going finish. Use the [kill switch](/software-factory/control/pause-and-stop/) to stop them.
- Cron triggers and manual runs are not affected, and no data is deleted.

An installation that is `suspended` or `deleted` on GitHub cannot be switched on.

### What the Organisations panel shows

For each installation: its login, how many repositories it covers (all or a selection), its status (`active`, `suspended`, `deleted`) and when it was last synced. It also shows which App permissions are missing and what each one would unlock. See the [quickstart](/software-factory/get-started/quickstart/) for the permission list.

The **webhooks** list shows each GitHub event the factory listens for and its state:

| State | Meaning |
|---|---|
| `subscribed` | Deliveries arrive. The last delivery time is shown. |
| `needs_permission` | The App lacks the permission the event needs. The permission is named. |
| `needs_webhook_move` | The App's webhook still points at an old URL. Update it in the App settings. |
| `needs_handler` | The factory does not handle this event yet. |

**Refresh** re-reads one installation and its repositories from GitHub. It costs 1 call plus 1 per 100 repositories, and the button shows the price first.

## Which repositories are listed

A repository appears once it has at least one **signal**:

| Signal | Meaning |
|---|---|
| `app` | A GitHub App installation covers it. |
| `scanned` | Vulnetix scanners have results for it. |
| `pix` | It is cloned in one of your Pix Sandboxes. |
| `kanban` | A board is bound to it. |
| `tea` | Releases of it are published to TEA. |
| `watched` | A member is watching it. |
| `uploads` | SBOM uploads name it as a public dependency repository. |

The filter chips across the top of the list count each signal. Some names are hidden:

- A name that is not in GitHub's `owner/name` form is hidden as `not_a_repository`. This happens when a scan ran in a directory with no git remote.
- A repository whose only signals are `scanned` or `watched` is hidden as `no_access` unless one of your installations or sandboxes can reach it.

The count of hidden names and their reasons is shown under the list. A repository whose installation lacks `contents` access shows a **No access** pill.

Rows added by a webhook or a new installation show as loading until enrichment fills them in, with their place in the queue.

### Scope settings

| Setting | Resolve Platform label | Default | Effect |
|---|---|---|---|
| `scope.orgs` | Managed orgs | managed orgs | The list of managed installation logins, or `"all_active"`. |
| `scope.interest` | Repos of interest | `any_signal` | Which repositories count as in scope: `any_signal`, `scanned_or_pix` (scanned or in a Pix Sandbox) or `watched_only` (explicitly watched). |
| `scope.archived` | Include archived repos | `false` | Off: archived repositories are skipped by the defaults. |
| `scope.dependencies` | Include public dependency repos (SBOM uploads) | `false` | Include public repositories that only appear through SBOM uploads. |
| `scope.sync` | Installation sync | `6h` | How often installation metadata is re-read: `6h`, `1h` or `webhook_only`. |

## A repository's own settings

Open a repository on the Repos page to see why it is listed, its workflows, and counts of its cards, runs and events. The settings panel overrides the tenant's settings for this repository alone:

| Field | Values | Effect |
|---|---|---|
| Autonomy | `observe`, `suggest`, `draft_pr`, `auto_merge_low_risk` | Never above `autonomy.max`. The page shows the stored value and the effective one. |
| Board mode | `all`, `skip_review`, `off` | Sets the mode of the repository's board bindings. It never creates a binding. |
| Monthly token cap | a number, or none | Also creates or updates the repository's budget on the Budgets page. |
| Protected branches | on, off | Off lets agents push to protected branches. Only owners and admins can switch it off. |
| TEA publish | on, off | Whether releases of this repository are published to TEA. |

A repository with no settings row of its own is **under org defaults**. It runs at `autonomy.default`, capped by `autonomy.max`. Only the [default workflows](/software-factory/workflows/default-workflows/) start work on such a repository. Any other workflow needs the repository to have a settings row, which saving this panel creates.

> [!CAREFUL] Saving can conflict
> Repository settings carry a revision. If someone else saved since you opened the panel, your save is refused with `revision_conflict` and the panel shows their values. Re-apply your change and save again.

## Acting on many repositories

Select repositories in the list to get the **With selected** bar. Up to 100 repositories at a time:

| Action | GitHub calls | Effect |
|---|---|---|
| Attach workflow | 0 | Adds the repositories to a workflow's scope as a new draft version. Publish it to take effect. |
| Bind kanban | 0 to 1 per repository | Sets the board mode and, if no binding exists, creates one. That checks once that the sign-in can write issues. |
| Run scanners now | 0 to 1 per repository | Not available yet: the button is disabled, and the API answers each repository with an error (`pix sandbox not ready`, or that scanner dispatch is not available yet). |
| Stop watching | 0 | Removes your `watched` signal. Other signals stay. |
| Add to Pix Sandbox | 0 | Clones the repositories into a sandbox. See [Pix Sandboxes](/software-factory/workforce/pix-sandboxes/). |

Each repository gets its own result, so one failure does not undo the others.

## API

| Method | Path | Who |
|---|---|---|
| GET | `/v1/factory/orgs` | member |
| PUT | `/v1/factory/orgs/{installationId}` with `{"managed": true}` | owner, admin |
| POST | `/v1/factory/orgs/{installationId}/refresh` | owner, admin |
| GET | `/v1/factory/repos?signal=&org=&q=&sort=` | member |
| GET | `/v1/factory/repos/{owner}/{name}` | member |
| PUT | `/v1/factory/repos/{owner}/{name}/settings` | member (owner or admin to switch protected branches off) |
| POST | `/v1/factory/repos/bulk` | member |

The repository list's `visibility` is `private` or `public`. `sort` is `name`, `enriched`, `open` or `slsa`.

## Related

- [Autonomy levels](/software-factory/control/autonomy/)
- [Repository profiles](/software-factory/control/repository-profiles/) describe what each repository is built with.
- [Issue mirroring](/software-factory/control/issue-mirroring/) shows the board's GitHub sync per repository.
