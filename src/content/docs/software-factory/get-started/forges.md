---
title: "Supported forges: GitHub, GHES, Gitea, Forgejo and GitLab"
nav: Supported forges
description: The git forges the factory works on, how each one connects, what the factory emulates where a forge lacks something GitHub has, and how to choose.
order: 2.5
sources: [vdb-site/docs/forge-connections.md, vdb-site/api/internal/forgecap/forgecap.go, website/.repo/forge-connections.md, belai/docs/forges.md]
checked: [vdb-site@72a0135, website@255a6c8, belai@aebead5]
updated: 28 Oct 2026
---

The factory works on five kinds of forge. Every one runs the same workflows, triggers, gates, kanban sync and console pages. Where a forge lacks something GitHub has, the factory emulates it, or says plainly that it is not available there.

| Forge | Connects with | Pull requests are called |
|---|---|---|
| github.com | The Vulnetix GitHub App | pull requests |
| GitHub Enterprise Server (GHES) | A GitHub App you register on your instance | pull requests |
| Gitea | A bot account's access token | pull requests |
| Forgejo, Codeberg included | A bot account's access token | pull requests |
| GitLab, gitlab.com or your own | A bot user's, group's or project's access token | merge requests |

github.com connects as described in the [Quickstart](/software-factory/get-started/quickstart/). Every other forge connects through a [forge connection](/software-factory/control/forge-connections/), made on the Integrations page. A tenant can use several forges at once: repositories from all of them sit side by side on the Repos page.

## What works the same everywhere

- Managed scope, repository settings and autonomy.
- Workflows, triggers, gates and outputs. Trigger events keep GitHub's names; each forge's deliveries are translated into them.
- Draft pull requests, comments, review requests and updating a branch from its base.
- The kanban board's issue and label sync.
- The conflict editor, including commits signed with your own key.
- Belai hosts: cloning, publishing a branch and opening a pull request.

## What the factory emulates

| On | GitHub has | The factory uses |
|---|---|---|
| Gitea, Forgejo | Check runs | The head commit's statuses. Gitea and Forgejo Actions, Woodpecker and Drone report there. |
| Gitea, Forgejo | Draft pull requests | The `WIP: ` title prefix |
| GitLab | Draft pull requests | The `Draft: ` title prefix |
| Gitea, Forgejo | Merge readiness | Worked out from mergeability, reviews and statuses |
| Gitea, Forgejo, GitLab | Merge commits and signed commits through the API | The factory builds the commit and pushes it over git |
| Gitea, Forgejo | A rate limit in each response | A local count of the factory's own calls against `forge.calls_per_hour` |

## What is not available

Some GitHub features have no equivalent. A step that needs one fails with `forge_capability_unavailable` and says why, and the console marks it "not available on" that forge.

- **Security alerts** (Dependabot, code scanning, secret scanning) are GitHub's. On other forges Vulnetix's own scanners report the same findings.
- **Merge queues** are GitHub's.
- **Issue close reasons** exist only on GitHub. Elsewhere the card keeps the reason on the board.
- **Pix Sandboxes** reach repositories through the Vulnetix GitHub App, so they work on github.com only. Belai on your own machines works on every forge.

The full table, per capability and per trigger event, is [Forge capabilities](/software-factory/reference/forge-capabilities/).

## Choosing

If your code is on github.com, install the App; there is nothing else to set up. If it is on GHES, register an App on the instance: it gets the same fine-grained permissions as on github.com. For Gitea, Forgejo and GitLab, make a dedicated bot account rather than using a person's token. The factory acts as that account, and its commits, pull requests and comments sign off as it.
