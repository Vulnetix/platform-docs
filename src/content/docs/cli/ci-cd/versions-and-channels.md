---
title: Versions and release channels
nav: Versions and channels
description: How install.sh and the GitHub Actions choose a CLI version, what a major channel such as v3 is, and how the release workflow moves the major tag, Latest and the package managers when a new major ships.
order: 3
sources: [cli/install.sh, cli/action-lib/install.sh, cli/.github/workflows/release.yml, cli/docs/PUBLISHING.md, cli/action.yml]
checked: [cli@3e6fd831d]
updated: 03 Nov 2026
---

A version argument takes one of three forms, in `install.sh --version`, in the `version` input of every Vulnetix action, and in the `VERSION` environment variable of the script.

| Form | Example | Installs |
|---|---|---|
| Exact tag | `v3.164.1` | That release. Reproducible. |
| Major channel | `v3` (or `3`) | The newest stable release of that major |
| `latest` | `latest` | The newest stable release of any major. The default of `install.sh`. |

```sh
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --version v3
```

The channel was added in v3.159.0.

## How a channel resolves

`install.sh` resolves a channel to a concrete tag before it downloads anything, and downloads the binary and `checksums.txt` for that tag. It prints `channel v3 resolved to v3.164.1`.

1. It asks for the latest release. If that release belongs to the major, it is the answer.
2. Otherwise it reads the tag list (`git ls-remote`, else the releases API) and takes the highest `vMAJOR.x.y`.

Prereleases such as `v3.1.0-rc.1` never match. When nothing resolves the script exits with `could not resolve the newest vN release`.

## In GitHub Actions

| You write | You get |
|---|---|
| `Vulnetix/cli/sca@v3` | The action files at the moving `v3` tag, and a binary from the `v3` channel |
| `Vulnetix/cli/sca@v3.164.1` | The action files at that release. The `version` input still defaults to `v3`, so the binary is the newest v3 release unless you set it. |
| `Vulnetix/cli/sca@<sha>` | The action files at that commit |
| `with: { version: v3.164.1 }` | That binary, whatever the ref |
| `with: { binary-path: ./vulnetix }` | A binary you built earlier in the job. Nothing is downloaded. |

The `version` default is the major channel matching the action's ref, so a workflow on `@v3` keeps a v3 binary after v4 ships. For a fully reproducible job, pin the action to a commit SHA and `version` to an exact tag.

A second Vulnetix action in the same job that asks for the same `version` skips the download. The [setup action](/cli/github-actions/setup/) does only the install.

## The major tag and Latest

Every tag is published with its binaries. Only the newest stable tag across every major does the following:

- becomes the GitHub Latest release,
- moves the major tag (`v3`, `v4`) that `uses: Vulnetix/cli@v3` follows,
- updates Homebrew, Scoop and the Nix flake.

A prerelease never moves a major tag. Two pushes minutes apart each start a release and the earlier can finish last; the newer tag wins, so the older one is published and left there.

## When v4 ships

> [!CAREFUL] v4.0.0 is not released yet
> This describes how the release workflow treats the first v4 tag. Nothing here has happened. Check [the releases](https://github.com/Vulnetix/cli/releases) before relying on it.

| After v4.0.0 | Behaviour |
|---|---|
| `Vulnetix/cli@v4` | Moves to each newest v4 release. The default `version` is `v4`. |
| `Vulnetix/cli@v3` | Frozen on the last v3 release that was the newest overall. Its `version` default stays `v3`. |
| `install.sh --version v3` | Resolves from the tag list, so it reaches a later v3 patch if one is published. |
| `install.sh` with no version, `latest` | v4 |
| A v3 patch release | Published with binaries. It does not become Latest, move `v3` or change Homebrew, Scoop or the flake. Nothing rolls back to v3. |
| Go module | `github.com/vulnetix/cli/v4`. The workflow reads the path from `go.mod`. |

A workflow on `@v3` keeps working unchanged. Moving to v4 is a deliberate edit: see [Migrating from v3 to v4](/cli/get-started/migrating-to-v4/).
