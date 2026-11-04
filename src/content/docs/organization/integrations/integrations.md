---
title: Integrations
description: What the Integrations page connects, how a GitHub App installation binds to your organisation, forge connections, chat providers, and the plan each needs.
order: 1
sources: [vdb-site/api/internal/handler/integrations.go, vdb-site/api/internal/handler/integrations_github.go, vdb-site/api/internal/handler/github_installations.go, vdb-site/api/internal/handler/integrations_rules.go, vdb-site/api/internal/handler/entitlements.go, vdb-site/docs/github-app-installations.md, vdb-site/docs/github-capabilities.md, vdb-site/api/main.go]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

**Configuration › Integrations** (`/resolve/integrations`) connects Vulnetix to your source forges, chat and ticket tools, cloud accounts and registries. Credentials you give it are stored in the [secrets vault](/organization/security/secrets-vault/) as connector entries.

## Plans

| Integration | Plan |
|---|---|
| GitHub App installation and its status | every plan |
| The scanner catalogue and per-tool scan activity | every plan |
| Chat and issue delivery (Slack, Teams, Discord, Google Chat, Jira, GitHub Issues, signed webhooks) and their routes | Pro and above |
| Cloud posture (AWS, Wiz) | Pro and above |
| Container registry logins | Pro and above |

A gated part of `GET /v1/integrations` comes back empty with an `_entitlements` marker rather than an error.

## GitHub App

The Vulnetix GitHub App gives Vulnetix read access to your repositories and, where you grant it, write access for issues, pull requests and alert dismissals. Repository scope, code scanning alerts, GitHub Issues delivery, the manifest curator and the Software Factory all use it.

### Installing

1. **Integrations › GitHub › Install** (`GET /v1/integrations/github/install/start` returns the URL). The install carries a signed state, so the installation is bound to your organisation when GitHub sends you back.
2. On GitHub, choose the account and **All repositories** or **Only select repositories**.

If someone installs the App from GitHub directly, there is no signed state. GitHub then asks them to authorise; Vulnetix checks that they can see the installation and sends them to `/resolve/integrations?github_claim=<token>`. A signed-in owner confirms it within **10 minutes** (`POST /v1/integrations/github/claim`). If that fails, the page shows `github=claim_failed`; install again from Integrations.

An installation is never bound by matching an account name, and a webhook never creates one.

### Keeping it current

- GitHub's `installation` webhooks (`created`, `unsuspend`, `new_permissions_accepted`, `suspend`, `deleted`) update its status and permissions; `installation_repositories` adds and removes repositories.
- Every six hours Vulnetix re-reads each installation and its repositories. **Refresh** (`POST /v1/integrations/github/{id}/refresh`) does it now.
- Removing it in Vulnetix (`DELETE /v1/integrations/github/{id}`, owner only) stops Vulnetix using it. The App stays installed on GitHub until you uninstall it there.

`GET /v1/integrations` lists `githubInstallations`, each `{id, installationId, accountLogin, accountType, status, repositorySelection, repoCount, canWriteIssues, source, reposSyncedAt, createdAt, updatePermissionsUrl}`. `status` is `activated`, `suspended` or `not_installed`; `source` is `install_flow`, `claim` or `backfill`. When the App asks for new permissions, an owner of the GitHub account accepts them through `updatePermissionsUrl`.

### Capabilities

Each thing the App can do for you (read alerts, draft advisories, open fix pull requests, poll the audit log, and so on) is a **capability** with the permissions it needs.

| State | Means |
|---|---|
| `planned` | Not built yet |
| `no_install` | No active installation |
| `not_applicable` | Organisation-only, and every installation is on a user account |
| `missing_permission` | No installation grants everything it needs; `missing` lists the permissions |
| `off` | Granted, and turned off |
| `on` | Granted and on |

Every built capability is on by default, including those that write to GitHub, except `alerts.dismiss_writeback` (writing your triage back to GitHub as an alert dismissal), which an owner must turn on. `GET /v1/integrations/github/capabilities` lists them; `PUT /v1/integrations/github/capabilities/{id}` turns one on or off.

## Other forges

GitHub Enterprise Server, Gitea, Forgejo and GitLab connect as **forge connections**: a bot account and token per forge, with webhooks. Owners connect, refresh and remove them. See [Forge connections](/software-factory/control/forge-connections/).

| Method | Path |
|---|---|
| GET | `/v1/integrations/forges`, `/v1/integrations/forges/capabilities` |
| POST | `/v1/integrations/forges/probe`, `/v1/integrations/forges` |
| POST | `/v1/integrations/forges/{uuid}/refresh`, `/v1/integrations/forges/{uuid}/hooks` |
| DELETE | `/v1/integrations/forges/{uuid}` |
| PUT | `/v1/integrations/forges/{uuid}/oauth` |
| GET, POST, DELETE | `/v1/integrations/forges/{uuid}/me`, `.../me/authorize`, `.../me/signing-key` (your own link to the forge) |

## Chat, tickets and webhooks

Slack is connected from Integrations with **Add to Slack** (`GET /v1/integrations/slack/oauth/start`). The install asks for `users:read` and `users:read.email` so members can be looked up by email for mentions. Discord and Google Chat webhook URLs can also be added here (`POST /v1/integrations/discord`, `POST /v1/integrations/google-chat`; Discord URLs must start `https://discord.com/api/webhooks/`).

Everything about what is sent where is in the messaging centre: [Messaging](/organization/integrations/messaging/).

### Legacy notification rules

`/v1/integrations/rules` holds the older per-upload notification rules (CVSS, EPSS and CESS thresholds, malware, exploitable, EOL, reachable, test code, production and direct-only filters, sent to Slack, Discord, Google Chat or a GitHub repository). Each was copied into the messaging centre as a route in **shadow** mode. **Go live** on that route hands delivery over to the messaging centre with no gap and no double send. Create new routes in the messaging centre instead.

## Cloud and registries

AWS accounts, Wiz and container registry logins are documented with the products that use them: [/cloud-security/](/cloud-security/) and [/sca/](/sca/). The credentials a scan uses to read your own private npm, PyPI, Maven or OCI registry are a separate list, **Configuration › Private Registries**; see [Private registries for scans](/organization/integrations/private-registries/).
