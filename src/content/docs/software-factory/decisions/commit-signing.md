---
title: Commit signing
description: How commits you make from factory pages are signed as you with a key held in AWS KMS, how agent commits are signed, the key lifecycle, and the signing settings.
order: 6
sources: [vdb-site/docs/signing.md, website/.repo/commit-signing.md, website/.repo/pix-sandbox-git-signing.md, vdb-site/api/internal/handler/signing_handlers.go, vdb-site/api/internal/handler/factory_signing.go]
checked: [vdb-site@72a0135, website@255a6c8]
updated: 28 Oct 2026
---

Three kinds of commit come out of the factory, and each is signed differently:

| Who commits | Signed by | GitHub shows |
|---|---|---|
| You, from a factory page (the conflict editor, a resolution you commit by hand) | Your own key, held in AWS KMS | Verified, as you |
| An agent in a Pix Sandbox | Pix's sandbox key, as `Pix [bot]` | Verified, as `Pix [bot]` |
| The Vulnetix GitHub App on its own | GitHub, as the App | Verified, as the App |

Agents never use a person's key.

> [!CAREFUL] On GHES, Gitea, Forgejo and GitLab
> Commits you make from a factory page on a [forge connection's](/software-factory/control/forge-connections/) repository are signed with the same KMS key. The factory builds the commit and pushes it over git, because only GitHub's API takes a signature the client made. The forge shows it verified only when your public key is on your account there. Link your forge account on the connection and choose **Add my signing key** ([Forge connections](/software-factory/control/forge-connections/#peoples-own-accounts)), or add it yourself. A linked account's email is the commit's email. Without a ready key the commit is made by the connection's bot, unsigned.

## Your signing key

Each GitHub user in your organisation has at most one key. It is a Secrets Vault entry with no value: the private half is made inside AWS KMS (ECDSA P-256) and can never be exported. Only the person signed in as that GitHub user can create or use it. Admins can see its state and revoke it, but never create one or sign with it.

| State | Meaning | You can |
|---|---|---|
| `ready` | In the vault and listed on GitHub | Rotate, revoke |
| `not_on_github` | Someone removed it from GitHub | Add it again |
| `no_permission` | The GitHub App cannot add keys to your account | Grant permission, or copy the public key and add it by hand |
| `revoked` | Disabled and scheduled for deletion | Nothing |

With no key, the state is `not_set_up`.

## Commits as

Beside every button that commits as you, a control says how the commit will be made:

| Shows | Means |
|---|---|
| ✓ as @you · signed | Ready |
| ○ as @you · no signing key | Set one up first |
| ! as @you · key not on GitHub | Add it again |
| ! as @you · App cannot add keys | Grant the App permission |
| ✕ branch requires signed commits | The branch needs a signed commit and you have no key |
| ◇ GitHub signs this | GitHub makes and signs the commit itself, for example **Update branch** |

## Settings

Settings › Commit signing:

| Setting | Values | Default | Effect |
|---|---|---|---|
| `signing.mode` | `required`, `preferred`, `off` | `preferred` | Whether a commit from a factory page must be signed |
| `signing.auto_add` | on, off | on | Add a new key's public half to the person's GitHub account |
| `signing.email` | `primary`, `noreply`, `ask` | `primary` | The address on the commit |
| `signing.on_missing` | `readd`, `ask` | `readd` | What to do when GitHub no longer lists a key |
| `signing.rotate_days` | `365`, `180`, `90`, `0` (never) | `365` | How often a key is replaced |
| `signing.retire_days` | `30`, `7`, `0` (right away), `-1` (leave it) | `30` | How long a replaced key stays on GitHub, so older commits stay Verified |

> [!CAREFUL] Removing an old key unverifies old commits
> GitHub shows a commit as Verified only while its key is on the account. Keep `signing.retire_days` long enough for your review and audit needs.

A signing key that drops off GitHub shows in the cockpit's Needs you list.

## API

| Method | Path |
|---|---|
| GET | `/v1/signing/keys` |
| POST | `/v1/signing/keys` (create yours) |
| POST | `/v1/signing/keys/{id}/github` (add to GitHub again), `/check`, `/rotate` |
| DELETE | `/v1/signing/keys/{id}` (revoke) |
| GET | `/v1/signing/state?owner=&name=&branch=` (what "Commits as" shows) |
| GET | `/v1/signing/github/authorize`, `/v1/signing/github/callback` (grant the App permission to add keys) |

## Related

- [Merge conflicts](/software-factory/decisions/merge-conflicts/) for the conflict editor.
- [Pix Sandboxes](/software-factory/workforce/pix-sandboxes/) for agent signing.
