---
title: version, update, env and the bare command
nav: Utilities
description: vulnetix with no command, vulnetix version, vulnetix update and vulnetix env.
order: 9
sources: [cli/cmd/root.go, cli/cmd/version.go, cli/cmd/update.go, cli/cmd/env.go, cli/internal/update/updater.go, cli/internal/config/config.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

## vulnetix with no command

```sh
vulnetix
```

Runs an authentication health check. Each source is checked against the API in turn: `VULNETIX_API_KEY` + `VULNETIX_ORG_ID`, `VVD_ORG` + `VVD_SECRET`, `./.vulnetix/credentials.json`, `$HOME/.vulnetix/credentials.json` and the netrc entry, followed by the always-available community fallback. Each line ends with a check mark and the organisation, a cross and the error, or `not set` / `not found`.

It does not look at `VULNETIX_API_TOKEN`, keychain-held secrets or `VULNETIX_CREDENTIALS_DIR`. `vulnetix auth status` and `vulnetix auth verify` cover those.

## version

```sh
vulnetix version            # version, commit, build date, Go version and module versions
vulnetix version --short    # the bare version, e.g. 3.154.0
vulnetix --version          # the same as --short
```

## update

```sh
vulnetix update
```

Checks the latest GitHub release and, if it is newer, replaces this binary: the release asset for this OS and architecture is downloaded next to the binary and renamed over it. A binary in `$GOBIN`, `$GOPATH/bin` or `~/go/bin` is updated with `go install github.com/vulnetix/cli/v3@latest` instead. A source build (version containing `-dev`, or no commit stamped) is refused. Prints `Already up to date (vX).` when there is nothing newer. The download is not checked against `checksums.txt`. Under Homebrew or Scoop, use the package manager. See [Install](/cli/get-started/install/#updating).

## env

```sh
vulnetix env
vulnetix env -o json
```

Prints what the CLI detects about where it runs: CLI version, platform (`cli`, `github`, `gitlab`, `azure`, `bitbucket`, `jenkins`, `kubernetes`, `podman`, `docker`), OS and architecture, shell, the git branch, commit, dirty state and root, the package managers and manifests found in the current directory, and the scan memory file. `-o json` prints the same as JSON; the Pix plugin reads it.

| Platform | Detected from |
|---|---|
| `github` | `GITHUB_ACTIONS=true` or `GITHUB_RUN_ID` |
| `gitlab` | `GITLAB_CI=true` or `CI_JOB_ID` |
| `azure` | `TF_BUILD=True`, `AZURE_HTTP_USER_AGENT` or `SYSTEM_TEAMFOUNDATIONCOLLECTIONURI` |
| `bitbucket` | `BITBUCKET_BUILD_NUMBER` or `BITBUCKET_COMMIT` |
| `jenkins` | `JENKINS_URL` or `BUILD_NUMBER` |
| `kubernetes` | `KUBERNETES_SERVICE_HOST` or `KUBERNETES_PORT` |
| `podman` | `container=podman` or `PODMAN_SYSTEMD_UNIT` |
| `docker` | `/.dockerenv` or `DOCKER_CONTAINER` |
| `cli` | none of the above |

The platform decides whether update checks run (only on `cli`) and how pipeline context is attributed to uploaded results.
