---
title: Git sync and repository info
nav: Git
description: How Belai keeps a session's branch up to date with the default branch, what it tells the model about the repository, and per-project preferences.
order: 16
sources: [belai/docs/git-sync.md, belai/docs/forges.md, belai/internal/gitinfo, belai/internal/projectregistry, belai/internal/config, belai/internal/forge]
checked: [belai@aebead5]
updated: 28 Oct 2026
---

## Git sync

Before a session starts work, Belai brings its branch up to date with the default branch, so the work does not start from a base that has moved on. It is on by default.

It runs before a turn, never during one: on the first turn of a session, and on the first turn after a commit. It first checks the repository is quiet (no merge or rebase in progress, nothing uncommitted in the way); if not, it skips and says why.

| Control | Effect |
|---|---|
| `/gitsync on\|off` | This session |
| `/gitsync global on\|off` | Your default |
| `git.sync` | The setting |
| `-no-git-sync` | One run from the command line |

A web session has a **Sync with main** switch for the same thing.

## What Belai knows about the repository

Belai reads the repository's remotes, branch and recent state and tells the model, so it names the right branch and remote. It also detects the repository's build, test and lint commands. See [Tests and lint](/software-factory/belai/tests-and-lint/).

## Project preferences

Each directory has its own preferences: mode, guardrails, ask, the display switches, tests after a turn, language servers and Jev. They live under your global Belai directory, keyed by the project directory (`~/.vulnetix/belai/projectprefs/`), so a repository can never supply them, and a remote control host can let the Resolve Platform edit them. See [Remote control](/software-factory/workforce/remote-control/).

## Auto-commit

With `auto_commit_per_task` on, the TUI commits each completed goal's changed files as one conventional commit. It is off by default, works only in the interactive TUI, and can be set only in your global settings or your own per-project preferences: a cloned repository's `.vulnetix/settings.json` can never make Belai commit.

## Other forges

Belai reads pull requests and CI with `gh` on github.com and GHES, `glab` on GitLab, and the REST API on Gitea and Forgejo. A Gitea or Forgejo host is never guessed from its name: name it in your own settings file, never a project's, which cannot add one.

```json
{ "forges": { "git.example.com": "gitea", "code.example.org": "forgejo", "ghe.example.net": "ghes" } }
```

The kinds are `github`, `ghes`, `gitea`, `forgejo` and `gitlab`. `codeberg.org` is known as Forgejo without a setting. The token for a Gitea or Forgejo host is read from `BELAI_FORGE_TOKEN_<HOST>` (the host upper-cased, other characters as `_`, so `BELAI_FORGE_TOKEN_CODEBERG_ORG`), then `FORGEJO_TOKEN` or `GITEA_TOKEN`. A token the Secrets Vault granted the machine is read first. git gets it through a credential helper for that one host, never in a URL or on a command line.

On Gitea and Forgejo a draft pull request is the `WIP: ` title prefix, and the CI tab and gates read the head commit's statuses. Fleet workers publish there as on GitHub; the forge coordinator, which takes over a push that failed for the machine's credential, works on GitHub only.

