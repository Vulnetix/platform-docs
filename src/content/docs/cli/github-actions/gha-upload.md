---
title: "Vulnetix/cli/gha-upload action"
nav: "gha-upload"
description: "The Vulnetix/cli/gha-upload GitHub Action: inputs, outputs, permissions and a complete workflow with artifact upload and attestation."
order: 4
sources: [cli/gha-upload/action.yml, cli/tools/actiongen/spec.go, cli/action-lib/run.sh, cli/action-lib/finish.sh, cli/docs/github-actions/gha-upload.md]
checked: [cli@v4.23.1]
updated: 03 Nov 2026
---

Installs the CLI and runs [`vulnetix gha upload`](/cli/ci-cd/gha-command/), which finds the artifacts earlier jobs of this workflow run uploaded and sends each report to Vulnetix under the tool that produced it.

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: Vulnetix/cli/gha-upload@v4
    with:
      org-id: ${{ secrets.VULNETIX_ORG_ID }}
      api-key: ${{ secrets.VULNETIX_API_KEY }}
```

Runs `vulnetix gha upload --json`. Credentials are optional: without `org-id` and a credential the CLI runs in community mode. They reach the CLI only as environment variables; see [Credentials](/cli/ci-cd/github-actions/#credentials).

## Inputs

| Input | Description | Default |
|---|---|---|
| `version` | Release of the Vulnetix CLI to install. Empty installs the release this action ref was cut from, which is what a lock file or a SHA pin expects. An exact tag (v4.0.0), a major channel (v4) or latest float instead | - |
| `binary-path` | Path to an already-built vulnetix binary to use instead of downloading a release | - |
| `verify-provenance` | Verify the downloaded CLI against the signed SLSA provenance of its release with cosign, which this action installs: true or false. Every v4 release is signed; set false to install a v3 release that has no provenance.sigstore.json. The SHA-256 checksum is checked either way | `true` |
| `org-id` | Vulnetix organization ID (UUID), used with api-key. Optional: without credentials the CLI runs in community mode | - |
| `api-key` | Vulnetix API key. Passed to the CLI as VULNETIX_API_KEY, never on the command line | - |
| `api-token` | Vulnetix API token; the server resolves the organization. Passed as VULNETIX_API_TOKEN | - |
| `args` | Extra arguments for the command, separated by spaces or newlines (no shell quoting is applied) | - |
| `extra-args` | Extra arguments, one per line, so a value may contain spaces | - |
| `artifact-name` | Upload every file the command wrote as a workflow artifact with this name | - |
| `fail-on-findings` | Fail the step when the command exits non-zero (findings over a gate, a breach, an error): true or false. The artifact, attestation and publish steps run either way | `true` |
| `github-token` | Token for GitHub publishing, release assets and pull request comments | `${{ github.token }}` |
| `attest` | Attest the written files with GitHub artifact attestations (needs id-token: write and attestations: write): true or false | `false` |
| `release-tag` | Attach every file the command wrote to the GitHub release with this tag (needs contents: write) | - |

`args` is split on spaces and newlines. No shell quoting is applied, and nothing is evaluated.

## Outputs

| Output | Description |
|---|---|
| `files` | Every file the command wrote, one per line |
| `sarif` | The SARIF files it wrote, one per line |
| `sbom` | The CycloneDX SBOM it wrote, if any |
| `manifest` | The artifact manifest (JSON Lines) listing what it wrote |
| `exit-code` | The command's exit code |
| `result` | success or failure |
| `summary` | One line saying what ran and how it ended |

## Permissions

- `contents: read` to check out the repository
- `id-token: write` and `attestations: write` with `attest: true`
- `contents: write` with `release-tag`

## Example workflow

```yaml
name: Scan and upload
on:
  push:
    branches: [main]
jobs:
  sast:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/sast@v4
        with:
          artifact-name: sast-reports
          fail-on-findings: false
  publish:
    needs: [sast]
    if: ${{ !cancelled() }}
    runs-on: ubuntu-latest
    permissions:
      contents: read
      actions: read
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/gha-upload@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          artifact-name: vulnetix-gha-upload
          attest: true
```

`artifact-name` uploads every file the command wrote as one workflow artifact. `attest: true` attests those files with GitHub artifact attestations.

## Behaviour

- It reads the run's artifacts through the GitHub API with `github-token` (`actions: read`). It sees only artifacts already uploaded in this run, so put it in a job that `needs:` every producer and gives it `if: ${{ !cancelled() }}`.
- Results from third-party scanners are described in [Third-party scanners](/cli/ci-cd/third-party-scanners/).

## See also

- [gha upload and status](/cli/ci-cd/gha-command/)
- [Third-party scanners](/cli/ci-cd/third-party-scanners/)
- [All Vulnetix actions](/cli/ci-cd/github-actions/#an-action-for-each-command)
- [Versions and release channels](/cli/ci-cd/versions-and-channels/)
