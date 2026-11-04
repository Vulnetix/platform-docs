---
title: Remote control and connected hosts
nav: Remote control
description: Connect your own machine with belai rc so the console and the factory can start sessions and workers on it. What it needs, every flag, cloning for the factory, session controls and slash commands from the web, project settings from the web, and the per-session flags the daemon sets.
order: 19
sources: [belai/docs/remote-control.md, belai/docs/session-controls.md, belai/cmd/belai/rccmd.go, vdb-site/api/internal/handler/belai_rc.go, vdb-site/api/internal/handler/belai_commands.go]
checked: [belai@8aa7760, vdb-site@597344c, website@58b9ffa]
updated: 05 Nov 2026
---

`belai rc` connects a machine to Vulnetix. It then appears on the Pix Sandboxes page as a self-managed host, and the console can start Belai sessions on it, follow them live and prompt them. The factory can dispatch crews to it. Sessions run only in projects already trusted on the machine and in the directories you offer.

```sh
belai rc --dir ~/src/api --dir ~/src/web --detach
belai rc --status
belai rc --stop
```

`/rc` in the TUI is the same thing as a setup screen. It walks the checks below and offers a step for each gap.

Start with [Install and sign in](/software-factory/belai/install-and-sign-in/) if Belai is not on the machine yet.

**One free host on Community.** Community includes one self-hosted host. While it is running, `belai rc` on a second machine stops at the website check with "Community includes one self-hosted host; add more with Pro or a Pix Sandbox". Stop `belai rc` and Belai on the first machine and the second one can enrol after about 45 seconds. Pro, Business and Enterprise enrol any number of machines.

## What it needs

| Check | Needs |
|---|---|
| Vulnetix CLI | `vulnetix` on your `PATH` |
| Vulnetix login | A browser login, `vulnetix auth login`. An API-token login is refused, because the website does not accept it for remote control. |
| Session sync | `sync.enabled` on (the default) |
| Guardrails | On. Remote control never runs a session nobody is watching without them. |
| Directories | At least one directory to offer |
| The website | Accepts the credential and the host. On Community, no other self-hosted host of the organisation is active. |

Run it signed in as the member whose workflows should use this machine. The factory uses only the hosts of a run's principal. See [Hosts and placement](/software-factory/workforce/hosts-and-placement/).

`belai rc` never opens a browser on the machine, and neither do the sessions it starts.

## Flags

| Flag | Default | Meaning |
|---|---|---|
| `--dir PATH` | | Offer this directory, and trust it. Repeatable. |
| `--max N` | `3` | Sessions to run at once. Without `--max-workers`, also the worker cap. |
| `--max-workers N` | `agents.max_workers` | Fleet workers to run at once |
| `--idle DURATION` | `30m` | End a session after this long without a prompt |
| `--detach` | | Run in the background. Logs go to `~/.vulnetix/belai/rc/rc.log`. |
| `--status`, `--stop` | | Show whether it is running; stop it and its sessions |
| `--web-controls` | off | Let web sessions change their own mode, model and switches. See below. |
| `--web-allow-guardrails-off` | off | With `--web-controls`, let a web session turn its guardrails off |
| `--web-project-settings` | off | Let the website read and edit each offered directory's project settings |
| `--web-shell` | off | Let web sessions run shell lines. See [Host shell](/software-factory/workforce/host-shell-and-web/). |
| `--allow-private-cidr CIDR` | | Let WebFetch reach this one private range. Never loopback or link-local. |
| `--no-clone` | | Never clone a repository a factory request names |

`belai rc on` and `belai rc off` switch it on or off from the command line, like `/rc`.

## Cloning for the factory

With `agents.clone` on (the default), when the factory asks for a GitHub repository this machine does not offer, `belai rc` clones it under its worktrees directory (`repos/<owner>/<name>`) using the GitHub CLI's credential, offers it, and starts the workers there. A repository on another forge is named `host/owner/name` and carries its host, kind and exact `https` clone URL, is cloned under `repos/<host>/<owner>/<name>`, and authenticates with the token this machine holds for that host (`BELAI_FORGE_TOKEN_<HOST>`, else `GITEA_TOKEN`, `FORGEJO_TOKEN` or `GITLAB_TOKEN`), read by a git credential helper and never put in a URL. A Gitea or Forgejo host must be named in Belai's `forges` setting; see [Git](/software-factory/belai/git/#other-forges). Workers run in that checkout only when it is clean and on the default branch; otherwise they run in a worktree for the branch. `--no-clone` turns this off for the daemon.

## Session controls from the web

With `--web-controls`, a web session can change itself with the TUI's own slash commands and keys: the mode (`shift+tab`, `f5`), the model (`/model`, `ctrl+q`), the effort (`f6`), guardrails (`f3`), ask (`f4`), caveman (`f2`), auto-commit, the reasoning and tool displays, the tests run after a turn, language servers, and Jev jobs and thresholds. The session page shows them as a strip, and the keys work while the page has focus.

- **For that session only.** A control changes the running session and is never written to a settings file.
- **Only the table.** The host checks each command against a fixed table and each value against its rules. A model must be one this host has credentials for. Anything else is refused with a reason.
- **Guardrails stay on** unless you also pass `--web-allow-guardrails-off`. Turning them back on never needs it.
- **Ask.** With ask on, a tool call that would ask is put to the web session and waits. An unanswered ask is denied after ten minutes.

Web sessions can also run your custom slash commands, if `sync.commands` is on.

## Project settings from the web

With `--web-project-settings`, the Settings page's **Project overrides** section can read and edit each offered directory's project settings on this machine. Each value shows where it comes from: `flag`, `env`, `state`, `project_prefs`, `project`, `global` or `default`. See [The settings document](/software-factory/control/settings-document/).

## The session process

`belai rc` starts each session as a `belai rc-session` process and passes it these flags. You never pass them yourself; they are listed so you can read a host's process list:

| Flag | Meaning |
|---|---|
| `-session-id`, `-dispatch` | The session id the daemon minted, and the website request it answers |
| `-mode` | `agent`, `plan`, `goal`, `code` or `pix-assistant` |
| `-provider`, `-model`, `-effort` | The model, if the request chose one |
| `-profile` | An agent profile to engage |
| `-ask` | `on` or `off`, from the request |
| `-git-sync` | `on` or `off`: sync the branch with the default branch before turns |
| `-idle` | End after this long without a prompt |
| `-add-dir` | Extra workspace directories the daemon checked |
| `-controls`, `-allow-guardrails-off`, `-shell` | The web switches above |

## Related

- [Teleport](/software-factory/workforce/teleport/)
- [Host schedules](/software-factory/workforce/host-schedules/)
- [Library](/software-factory/workforce/library/)

## API

| Method | Path |
|---|---|
| GET | `/v1/belai/hosts` |
| POST | `/v1/belai/hosts/{hostId}/rc/heartbeat`, `/rc/offline` (the host) |
| GET | `/v1/belai/hosts/{hostId}/inbox` (the host's long-poll) |
| POST | `/v1/belai/sessions/{id}/commands` (a session control from the web) |
