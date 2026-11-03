---
title: Versions and release channels
nav: Versions and channels
description: How install.sh and the GitHub Actions choose a CLI version, what a major channel such as v4 is, and how the release workflow moves the major tag, Latest and the package managers when a new major ships, as it did for v4.0.0.
order: 3
sources: [cli/install.sh, cli/action-lib/install.sh, cli/.github/workflows/release.yml, cli/docs/PUBLISHING.md, cli/action.yml]
checked: [cli@v4.0.0]
updated: 03 Nov 2026
---

A version argument takes one of three forms, in `install.sh --version`, in the `version` input of every Vulnetix action, and in the `VERSION` environment variable of the script.

| Form | Example | Installs |
|---|---|---|
| Exact tag | `v4.0.0` | That release. Reproducible. |
| Major channel | `v4` (or `4`) | The newest stable release of that major |
| `latest` | `latest` | The newest stable release of any major. The default of `install.sh`. |

```sh
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --version v4
```

The channel was added in v3.159.0.

## How a channel resolves

`install.sh` resolves a channel to a concrete tag before it downloads anything, and downloads the binary and `checksums.txt` for that tag. It prints `channel v4 resolved to v4.0.0`.

1. It asks for the latest release. If that release belongs to the major, it is the answer.
2. Otherwise it reads the tag list (`git ls-remote`, else the releases API) and takes the highest `vMAJOR.x.y`.

Prereleases such as `v4.1.0-rc.1` never match. When nothing resolves the script exits with `could not resolve the newest vN release`.

## In GitHub Actions

| You write | You get |
|---|---|
| `Vulnetix/cli/sca@v4` | The action files at the moving `v4` tag, and a binary from the `v4` channel |
| `Vulnetix/cli/sca@v4.0.0` | The action files at that release. The `version` input still defaults to `v4`, so the binary is the newest v4 release unless you set it. |
| `Vulnetix/cli/sca@<sha>` | The action files at that commit |
| `with: { version: v4.0.0 }` | That binary, whatever the ref |
| `with: { binary-path: ./vulnetix }` | A binary you built earlier in the job. Nothing is downloaded. |

The `version` default is the major channel matching the action's ref, so a workflow on `@v3` keeps a v3 binary now that v4 has shipped. For a fully reproducible job, pin the action to a commit SHA and `version` to an exact tag.

A second Vulnetix action in the same job that asks for the same `version` skips the download. The [setup action](/cli/github-actions/setup/) does only the install.

## The major tag and Latest

Every tag is published with its binaries. Only the newest stable tag across every major does the following:

- becomes the GitHub Latest release,
- moves the major tag (`v3`, `v4`) that `uses: Vulnetix/cli@v4` follows,
- updates Homebrew, Scoop and the Nix flake.

A prerelease never moves a major tag. Two pushes minutes apart each start a release and the earlier can finish last; the newer tag wins, so the older one is published and left there.

## Since v4.0.0

v4.0.0 was released on 3 November 2026 and is the first release the workflow treated as a new major.

| Since v4.0.0 | Behaviour |
|---|---|
| `Vulnetix/cli@v4` | Moves to each newest v4 release. The default `version` is `v4`. |
| `Vulnetix/cli@v3` | Frozen on v3.169.2, the last v3 release that was the newest overall. Its `version` default stays `v3`, and it keeps working. |
| `install.sh --version v3` | Resolves from the tag list, so it reaches a later v3 patch if one is published. |
| `install.sh` with no version, `latest` | v4 |
| A v3 patch release | Published with binaries. It does not become Latest, move `v3` or change Homebrew, Scoop or the flake. Nothing rolls back to v3. |
| Go module | `github.com/vulnetix/cli/v4`. The workflow reads the path from `go.mod`. |

A workflow on `@v3` keeps working unchanged. Moving to v4 is a deliberate edit: see [Migrating from v3 to v4](/cli/get-started/migrating-to-v4/).
