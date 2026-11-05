---
title: Lockfiles and pinning
description: Use the Vulnetix actions with GitHub Actions lockfiles and SHA pins, and how each action ref selects the CLI binary it installs.
order: 3
sources: [cli/action-lib/install.sh, cli/.github/workflows/auto-version.yml, cli/.github/workflows/release.yml]
checked: [cli@TAG]
updated: 05 Nov 2026
---

The Vulnetix actions work with GitHub's [workflow lockfile](https://docs.github.com/en/actions/concepts/security/workflow-dependency-lockfiles), `.github/workflows/actions.lock`.

```sh
gh extension install github/gh-actions-lock
gh actions-lock
gh actions-lock --verify
```

Refs such as `Vulnetix/cli/sast/python@v4` narrow to the exact release, and nested paths lock like any other. The third-party actions the composites use are pinned by commit SHA and locked with them.

## What a lock freezes

A lock freezes an action's commit. It does not freeze what that commit downloads, so each release tag names its own binary in `action-lib/cli-release`:

| `version` input | Installs |
|---|---|
| empty (the default) | The release this action ref was cut from |
| `v4.24.0` | That release |
| `v4` or `latest` | Whatever is newest when the job runs. A lock cannot freeze this |

So leave `version` empty on a locked or SHA-pinned workflow. The action, its scripts and the binary then all come from one release.

`verify-provenance` is on by default, so the action verifies the binary's signed provenance and its SHA-256 checksum. Release assets sit outside the lock: this check is what binds them to the release.

## How @v4 moves

`@v4` moves to a release only after a canary installs that release through its own `setup` action and confirms the binary is the tag. It only moves forward, so a locked commit stays reachable from its tag.

## Require lockfile

GitHub's Require lockfile policy also blocks workflows with no `uses:` and callers of reusable workflows that are not onboarded. Reusable workflows are not pinned by a lock: refer to them by full SHA.
