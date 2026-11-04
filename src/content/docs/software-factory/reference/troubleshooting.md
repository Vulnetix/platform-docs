---
title: Software Factory troubleshooting
nav: Troubleshooting
description: The most common reasons a factory run does not start, waits or fails, what belai rc's setup checks mean, and how to fix each one.
order: 50
sources: [vdb-site/api/internal/handler/factory_access.go, vdb-site/api/internal/handler/factory_runs.go, vdb-site/api/internal/handler/forge_connections.go, vdb-site/api/internal/handler/factory_state.go, belai/internal/rc/preflight.go, belai/cmd/belai/rccmd.go]
checked: [vdb-site@d2ea72f23, belai@ea3372a14]
updated: 04 Nov 2026
---

Start here when a run does not start, sits waiting, or fails. The API refuses a request with a code in `issues[].code`; [Error codes](/software-factory/reference/validation-codes/) lists every one. A run that waits or fails says why on the run page, on the card and in the [event stream](/software-factory/evidence/event-stream/).

## Setting up

| Symptom or message | Cause | Fix |
|---|---|---|
| `403` with `"code": "plan_locked"`: `The Software Factory needs Pro, or a Pix Sandbox on Community.` | A Community organisation with no active Pix Sandbox | Move to Pro, or buy a sandbox, which stays open on Community. See [Who can use it](/software-factory/#who-can-use-it). |
| A trigger never fires, and its webhook row shows `needs_permission` or `needs_webhook_move` | The GitHub App lacks the permission the event needs, or its webhook still points at an old URL | Grant the named permission (for example Actions: read for `workflow_run`), or update the App's webhook URL. See [Managed scope](/software-factory/control/managed-scope/#what-the-organisations-panel-shows). |
| Connecting a forge fails with `<host> answered as Gitea, not Forgejo`, `the token was refused: ...` or `the token cannot list ...'s repositories` | The wrong forge card, or a bot token without the scopes or repository access the factory needs | Use the card for the forge the host reports. Create the token with the listed scopes. See [Forge connections](/software-factory/control/forge-connections/#connecting). |

## A run did not start

| Symptom or message | Cause | Fix |
|---|---|---|
| A default workflow ignores a repository, with a `trigger.skipped` event | The repository's effective autonomy is below what that default needs: `pr-review` needs `suggest`, the fix and sweep defaults `draft_pr` | Raise the repository's autonomy, within `autonomy.max`. See [Autonomy levels](/software-factory/control/autonomy/#how-the-level-is-chosen). |
| A workflow of your own never runs on a repository, but the defaults do | The repository is under org defaults: it has no settings row, and only default workflows start work on it | Open it on the Repos page and save its settings panel. See [A repository's own settings](/software-factory/control/managed-scope/#a-repositorys-own-settings). |
| `scope_unmanaged_repo`: `<repo> is not a managed repository. Manage it in Settings first.` or `<repo> is not in this workflow's scope` | A manual start named a repository outside the managed orgs or outside `scope.repos` | Switch Managed on for its organisation, or add it to the workflow's scope and publish. See [Graph limits](/software-factory/workflows/graphs/). |
| Start or retry refused with `factory_stopped`; other actions with `bad_state` | The factory is stopped, or the run is not in a state that allows the action | Resume the factory from Settings. See [Pause, stop and resume](/software-factory/control/pause-and-stop/) and the action table in [Runs and steps](/software-factory/runs/runs-and-steps/#actions). |
| Runs sit as `held` | A pause, stop, maintenance window or schedule blackout. Blackouts use `schedules.tz`, which defaults to `UTC`. | Wait for the window to close, or resume. Set `schedules.tz` to your own zone. See [Holds and blackouts](/software-factory/control/holds-and-blackouts/). |

## A run waits or fails

| Symptom or message | Cause | Fix |
|---|---|---|
| A crew step is `waiting` with `host_offline`, `stopped_by_user` or `repo_not_cloned` | No host can take the step yet. A stopped sandbox is never woken. | Start `belai rc` on the machine, or start the sandbox. Every reason is in [Waiting for a machine](/software-factory/runs/waiting-for-a-machine/#reasons). |
| The run fails with `no_host_timeout:<node>` or `no_host:<node>` | The step waited longer than `autonomy.no_host_ttl_hours` (6 by default), or was pinned with `runOnFallback: none` and had no host | Connect a host that has the repository, or change the step's `runOn`. Check with `GET /v1/factory/hosts/eligibility`. |
| Your own machine runs `belai rc`, but the factory never uses it | `belai rc` registered the host under whoever is signed in to the Vulnetix CLI. Only the run's principal's hosts are candidates. | Sign in as the workflow's author, or the member who made the organisation managed. See [Hosts and placement](/software-factory/workforce/hosts-and-placement/#which-hosts-are-candidates). |
| A run is `paused` and nobody paused it | A budget's `pause_run` action reached its limit | Resume it, or raise the budget. See [Budgets](/software-factory/cost/budgets/#at-the-limit). |

## belai rc will not start

`belai rc` prints a check for each requirement and stops with ``Remote control is not running. Fix the ✗ lines above and run `belai rc` again.`` See [Remote control](/software-factory/workforce/remote-control/#what-it-needs).

| Message | Cause | Fix |
|---|---|---|
| `the Vulnetix CLI is logged in with an API token, which the website does not accept for remote control` | Remote control needs a browser login | Run `vulnetix auth login` without `--token`, and unset `VULNETIX_API_TOKEN`. See [CLI authentication troubleshooting](/cli/authentication/troubleshooting/). |
| `session sync is off, so the website cannot see or start sessions` | `sync.enabled` is off | Run `/sync on` in Belai, or set `"sync": {"enabled": true}` in `~/.vulnetix/belai/settings.json` |
| `no directory to offer: nothing is trusted yet and no --dir was given` | No trusted project and no `--dir` | Run `belai rc --dir <path>`, or open `belai` in the project once and trust it |

## Still stuck

Note the run's display key (such as `run_3f9a2c1e`) and its failure reason from the run page, and download its evidence zip if it has one. For a host, collect the output of `belai rc --status`, the check lines `belai rc` printed, and `~/.vulnetix/belai/rc/rc.log` if it runs with `--detach`. For a sign-in problem, add `vulnetix auth status` and `vulnetix version`.
