---
title: "CI/CD"
nav: "Overview"
description: "What every CI pipeline needs: installing the CLI, credentials, choosing commands and outputs, gating, exit codes and publishing other tools' reports."
order: 1
sources: [cli/install.sh, cli/action.yml, cli/cmd/scan.go, cli/cmd/upload.go, cli/cmd/gha.go, cli/internal/config/config.go, cli/internal/scanopts/failon.go, cli/cmd/exit_codes.go, cli/Dockerfile]
checked: [cli@v4.0.0]
updated: 03 Nov 2026
---

Every platform page assumes this page. The pattern is the same everywhere: install the binary, give the job two environment variables, verify, scan with a gate, keep the files.

```sh
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$PATH"
vulnetix auth verify
vulnetix scan --fail-on high -o dist/sbom.cdx.json -o dist/results.sarif
```

## Install

The install script needs `sh`, `curl` or `wget`, and CA certificates. It verifies the binary against the release checksums. Installing to `$HOME/.local/bin` avoids needing root on any runner; add the directory to `PATH` the way your platform does it (`$GITHUB_PATH` on GitHub Actions).

| Image | Install first |
|---|---|
| Alpine | `apk add --no-cache curl ca-certificates` |
| Debian, Ubuntu slim | `apt-get update && apt-get install -y --no-install-recommends curl ca-certificates` |
| UBI, Fedora | `microdnf install -y curl` or `dnf install -y curl` |

Pin a release for reproducible pipelines (`--version v4.0.0`), take the newest release of a major with a channel (`--version v4`), or leave it unpinned to get fixes without editing pipelines. See [Versions and release channels](/cli/ci-cd/versions-and-channels/). There is no published Vulnetix CLI container image: install into your build image, or bake an image of your own once (see [Containers](/cli/ci-cd/containers/)).

## Credentials

| Variable | Value |
|---|---|
| `VULNETIX_ORG_ID` | Organisation UUID |
| `VULNETIX_API_KEY` | ApiKey |

Set them from the platform's secret store. Do not run `vulnetix auth login` on a runner. `vulnetix auth verify` as the first command fails the job at once when they are missing or revoked. Details: [Authentication in CI/CD](/cli/authentication/ci-cd/).

Without credentials, scans still run against the community tier, but nothing is stored in Vulnetix.

## Which command

| Goal | Command |
|---|---|
| Everything in one pass, one gate | `vulnetix scan` |
| One scanner only | `vulnetix sca`, `sast`, `secrets`, `containers`, `iac`, `license`, `malscan` (see their segments) |
| Inventories | `vulnetix cbom`, `vulnetix aibom` |
| Look again in a later step, offline | `vulnetix report` |
| Organisation jail policy | `vulnetix jail`, or `scan --jail` |
| Repository and workflow posture | `vulnetix gha audit` (GitHub) |
| Repository metrics and org graph | `vulnetix analyze` |
| Another tool's SARIF, CycloneDX or SPDX | `vulnetix upload --file <report>`; on GitHub Actions `vulnetix gha upload` |

Each command publishes its own results when credentials are present. `upload` exists for reports other tools wrote.

## Output files

Results always land in `<path>/.vulnetix/`; see [Files](/cli/reference/files/). For artifacts, write copies where your platform collects them:

```sh
vulnetix scan -o dist/sbom.cdx.json -o dist/results.sarif   # CycloneDX and SARIF
vulnetix scan -o json-cyclonedx > dist/sbom.cdx.json         # stdout instead
```

The SARIF files are written only when there are findings, so an artifact step must tolerate a missing file. `cbom`, `aibom` and `malscan` take `--output-file` for their document; on those commands `-o` is the terminal format.

## Gates

Without a gate the command reports and exits `0`.

```sh
vulnetix scan --fail-on high
vulnetix scan --fail-on kev,malware,unpinned,eol
vulnetix scan --fail-on exploit=poc,lag=1,cooldown=3d
```

The rules are on [scan: when to fail](/cli/commands/scan/#when-to-fail). An organisation's stored quality-gate policy overrides these flags on authenticated runs. To report a breach without blocking a merge, use the platform's soft-fail (`continue-on-error`, `allow_failure`, `catchError`) rather than removing the gate.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Passed |
| `1` | A gate breached, or the command failed |
| `2` | `jail` usage or configuration error |
| `3` | `jail` or `scan --jail` could not decide (scan coverage stale or missing) |

See [Exit codes](/cli/reference/exit-codes/).

## Pipeline context

The CLI detects GitHub Actions, GitLab CI, Azure Pipelines, Bitbucket Pipelines and Jenkins from their environment variables and records the repository, commit, branch and pull or merge request with each result. Elsewhere it reads the local git checkout. Deployment labels (`--environment`, `--cluster`, `--namespace`, `--project`, `--tag`) can be set once per job with `VULNETIX_ENVIRONMENT` and similar; see [scan](/cli/commands/scan/#deployment-context-and-bom-identity).

## Proxies

The CLI uses Go's standard proxy handling: `HTTPS_PROXY`, `HTTP_PROXY` and `NO_PROXY`. A TLS-intercepting proxy's CA must be in the system trust store of the image.

## GitHub Actions: one action per command

On GitHub, each command has a composite action, `uses: Vulnetix/cli/<name>@v4`. It installs the CLI, runs the command, and can publish to code scanning and the dependency graph, upload the files it wrote as an artifact, attest them and attach them to a release. Credentials are passed as environment variables only.

| Action | Page |
|---|---|
| `setup`, `analyze`, `upload`, `gha-upload`, `github-publish` | [setup](/cli/github-actions/setup/), [analyze](/cli/github-actions/analyze/), [upload](/cli/github-actions/upload/), [gha-upload](/cli/github-actions/gha-upload/), [github-publish](/cli/github-actions/github-publish/) |
| `sca`, `containers`, `license` | [sca](/sca/github-actions/sca/), [containers](/sca/github-actions/containers/), [license](/sca/github-actions/license/) |
| `sast`, `secrets`, `iac`, `malscan` | [sast](/sast/github-actions/sast/), [secrets](/secrets/github-actions/secrets/), [iac](/iac-scanning/github-actions/iac/), [malscan](/malware/github-actions/malscan/) |
| `sbom`, `cbom`, `aibom` | [sbom](/sbom/github-actions/sbom/), [cbom](/sbom/github-actions/cbom/), [aibom](/sbom/github-actions/aibom/) |
| `vex`, `attest`, `jail`, `tea-release` | [vex](/vex/github-actions/vex/), [attest](/attestation/github-actions/attest/), [jail](/quality-gates/github-actions/jail/), [tea-release](/tea/github-actions/tea-release/) |
| `config-plan`, `config-apply` | [config-plan](/platform-iac/github-actions/config-plan/), [config-apply](/platform-iac/github-actions/config-apply/) |

The files the CLI writes are listed in an [artifact manifest](/cli/reference/artifact-manifest/) and the SARIF is described in the [SARIF reference](/cli/reference/sarif/).

## Platform pages

| Platform | Page |
|---|---|
| GitHub Actions | [GitHub Actions](/cli/ci-cd/github-actions/), [an action for each command](#github-actions-one-action-per-command), [gha publish](/cli/commands/gha-publish/), [gha upload and status](/cli/ci-cd/gha-command/), [Third-party scanners](/cli/ci-cd/third-party-scanners/), [Versions and channels](/cli/ci-cd/versions-and-channels/) |
| GitLab CI/CD | [GitLab CI](/cli/ci-cd/gitlab-ci/) |
| Bitbucket Pipelines | [Bitbucket](/cli/ci-cd/bitbucket/) |
| Azure Pipelines | [Azure DevOps](/cli/ci-cd/azure-devops/) |
| Jenkins | [Jenkins](/cli/ci-cd/jenkins/) |
| Docker, Podman, Kubernetes | [Containers](/cli/ci-cd/containers/) |
| A developer machine, before push | [Local and pre-push](/cli/ci-cd/local/) |
| CircleCI, Buildkite, Travis CI, Drone, Woodpecker, Tekton, Argo Workflows, AWS CodeBuild, Google Cloud Build, Harness, Codefresh, TeamCity, Bamboo, Gitea, Forgejo, Spacelift, Semaphore, Buddy, Earthly, Dagger, Depot | [Other CI systems](/cli/ci-cd/other-platforms/) |
