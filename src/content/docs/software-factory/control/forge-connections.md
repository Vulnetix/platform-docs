---
title: Forge connections
description: Connect GitHub Enterprise Server, Gitea, Forgejo or GitLab to the factory, with the bot account, token and webhooks each needs and how repositories are named.
order: 1.5
sources: [vdb-site/docs/forge-connections.md, vdb-site/api/internal/handler/forge_connections.go, vdb-site/api/internal/handler/forge_webhooks.go, vdb-site/api/internal/forge/probe.go, website/.repo/forge-connections.md, website/src/components/integrations/console/ForgeConnectDialog.vue]
checked: [vdb-site@72a0135, website@255a6c8]
updated: 28 Oct 2026
---

A forge connection does for GHES, Gitea, Forgejo and GitLab what the GitHub App installation does for github.com: it gives the factory an identity on the forge, a list of repositories and a stream of webhooks. Once connected, the forge's accounts appear on the Repos page beside your GitHub installations and are managed the same way ([Managed scope](/software-factory/control/managed-scope/)).

Only owners and admins connect, refresh or remove a connection. Members see them.

## Connecting

Open **Integrations** in the Resolve Platform and choose the card for your forge: **GitHub Enterprise Server**, **Gitea**, **Forgejo** or **GitLab for the Software Factory**. (The other GitLab card is the CI/CD quickstart, which needs no connection.) Choose **Connect**, enter the host and choose **Check**: the factory asks the host what it is and shows the version. Then fill in the rest for your forge.

The host must be reachable from the public internet. A host that resolves to a private or link-local address is refused.

### Gitea and Forgejo

1. Make a bot account, for example `vulnetix-bot`, and add it to the organisation with write access to the repositories. To let the factory create its own webhooks, give it admin instead: Gitea and Forgejo let only a repository's admins add a webhook. With write access, add the webhook by hand with the URL and secret the dialog shows.
2. Signed in as the bot, open **Settings › Applications** (`https://<host>/user/settings/applications`) and create an access token with `read:user`, `write:repository`, `write:issue` and `read:organization`.
3. Paste the token. Leave **Organisation** empty to use every repository the bot can reach, or name one organisation.

Codeberg is Forgejo: use the Forgejo card with host `codeberg.org`. The factory tells Gitea and Forgejo apart from the version the host reports, so a Gitea host given on the Forgejo card is refused with the right name.

### GitLab

1. Make a bot user, or use a group or project access token.
2. Give it the `api`, `read_repository` and `write_repository` scopes, at the Developer role or above. Only a Maintainer may add a project webhook, so give it Maintainer for the factory to create its own, or add the webhook by hand.
3. Paste the token, and name the group if you want only one. The host is `gitlab.com` or your own.

### GitHub Enterprise Server

1. On the instance, register a GitHub App with the same permissions and events as the Vulnetix GitHub App ([Quickstart](/software-factory/get-started/quickstart/) lists them).
2. Install it on the organisation.
3. Enter the App id, the installation id (the number at the end of the installation's settings URL) and the App's private key.

The factory signs in as the App, exactly as on github.com, so a GHES installation has the same features as a github.com one.

## Webhooks

After connecting, the dialog shows the connection's webhook URL and its secret, once. The URL is `https://www.vulnetix.com/api/site/v1/webhooks/<kind>/<connection id>`.

Choose the webhook button on the connection's row to have the factory create its webhook on every repository the bot can reach. It subscribes to push, pull requests, reviews, review comments, issues, issue comments, checks (commit statuses on Gitea and Forgejo, jobs on GitLab; Gitea 1.22 has no status event, so a check trigger does not fire there, though gates still read the statuses), workflow runs (GitLab pipelines), releases, repository events and deployment statuses. A webhook that already exists is left as it is. Removing the connection removes the factory's webhooks. Where the bot may not add a webhook, the row says so for each repository it could not reach; add the webhook there by hand with the same URL and secret.

Each delivery is checked before anything reads it:

| Forge | Check |
|---|---|
| GHES | `X-Hub-Signature-256`, as on github.com |
| Gitea, Forgejo | `X-Gitea-Signature` or `X-Forgejo-Signature`: the HMAC of the body with the secret |
| GitLab | `X-Gitlab-Token`: the secret itself |

The factory then translates the delivery into GitHub's event names, so a trigger on `pull_request.opened` fires for a Gitea pull request too. [Forge capabilities](/software-factory/reference/forge-capabilities/) lists how each event is made and which a forge cannot send. Gitea and GitLab do not say how an author relates to a repository, so the factory asks the forge for the author's permission: write access counts as a collaborator, admin as an owner, and anything else, or a failed check, as outside your team.

## What the connection stores

- The kind, the host and its API address, the version and the bot's login and email.
- The token or the GHES private key, and the webhook secret, in your [Secrets Vault](/software-factory/workforce/providers-and-keys/). Only the server opens them, and each opening is in the vault's activity log.
- The repositories the bot can reach, listed again when you choose **Check again** on the row.

The status reads **connected**, or **the token was refused** when the forge answers 401 or 403. Paste a new token by connecting the same host again.

## People's own accounts

The bot does the factory's work. Each member can also link their own account on a connection, so a merge they commit from the conflict editor carries an email the forge matches to them, and so their signing key can be added to their account there.

1. An owner or admin chooses **Set up sign-in** on the connection's row. On the forge, create an OAuth application with the redirect URI the row shows (`https://www.vulnetix.com/resolve/integrations`), then paste its client id and secret. On Gitea and Forgejo the application asks for `read:user write:user`; on GitLab, `api`; on GHES, the App you registered is the application.
2. A member chooses **Link my account**, signs in on the forge and comes back to Integrations. The row then names their login and email.
3. **Add my signing key** puts their ready [signing key](/software-factory/decisions/commit-signing/) on their forge account, so the forge can show their signed commits as verified.

The person's token is sealed in the vault, bound to them and the connection. **Unlink** removes it.

## Repository names

A repository off github.com is named `host/owner/name` in lower case, for example `codeberg.org/acme/app` or `gitlab.example.com/group/sub/app`. A repository on github.com stays `owner/name`. The longer name is used in workflow scopes, settings, budgets, checkpoints and links, so `acme/app` on github.com and on a Gitea never mix.

## Settings that apply to every forge

The settings that used to be `github.*` are now `forge.*` and apply to every forge. The old names still work: a stored document, a YAML export or an API call using one reads and writes the new key.

| Key | Earlier name |
|---|---|
| `forge.branch_prefix` | `github.branch_prefix` |
| `forge.pr_state` | `github.pr_state` |
| `forge.protected` | `github.protected` |
| `forge.check_runs` | `github.check_runs` |
| `forge.read.default` | `github.read.default` |
| `forge.stale.repo` | `github.stale.repo` |
| `forge.stale.pulls` | `github.stale.pulls` |
| `forge.stale.checks` | `github.stale.checks` |
| `forge.stale.alerts` | `github.stale.alerts` |
| `forge.polling.forbidden` | `github.polling.forbidden` |
| `forge.poll.fallback` | `github.poll.fallback` |
| `forge.etag` | `github.etag` |
| `forge.quota.factory_share` | `github.quota.factory_share` |
| `forge.quota.reserve` | `github.quota.reserve` |
| `forge.quota.on_exhausted` | `github.quota.on_exhausted` |
| `forge.quota.proactive_writes_per_hour` | `github.quota.proactive_writes_per_hour` |

`forge.calls_per_hour` is new: see [Forge quota](/software-factory/cost/github-quota/).

> [!CAREFUL] One bot, one identity
> The factory's commits, pull requests and comments on a forge are made as the connection's bot account, not as `vulnetix[bot]`. Give the bot only the repositories you want the factory to touch, and keep its token for the factory alone.
