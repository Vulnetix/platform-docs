---
title: "Vulnetix/cli/upload action"
nav: "upload"
description: "The Vulnetix/cli/upload GitHub Action: inputs, outputs, permissions and a complete workflow with artifact upload and attestation."
order: 3
sources: [cli/upload/action.yml, cli/tools/actiongen/spec.go, cli/action-lib/run.sh, cli/action-lib/finish.sh, cli/docs/github-actions/upload.md]
checked: [cli@v4.24.2]
updated: 03 Nov 2026
---

Installs the CLI and runs [`vulnetix upload`](/cli/commands/upload/), which sends one report another tool wrote (CycloneDX, SPDX, SARIF, OpenVEX or CSAF VEX) to Vulnetix. It needs credentials; community mode stores nothing.

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: Vulnetix/cli/upload@v4
    with:
      upload-file: build/sbom.cdx.json
```

Runs `vulnetix upload --json --file <upload-file> [--format <upload-format>]`. Credentials are optional: without `org-id` and a credential the CLI runs in community mode. They reach the CLI only as environment variables; see [Credentials](/cli/ci-cd/github-actions/#credentials).

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
| `upload-file` | Path to the artifact file to upload | - |
| `upload-format` | Override the detected format (cyclonedx, spdx, sarif, openvex, csaf_vex) | - |

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
name: Build, attest and upload
on:
  push:
    branches: [main]
jobs:
  report:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@v5
      - run: ./build.sh   # writes build/sbom.cdx.json
      - uses: actions/upload-artifact@v7
        with:
          name: sbom
          path: build/sbom.cdx.json
      - uses: actions/attest-build-provenance@v4
        with:
          subject-path: build/sbom.cdx.json
      - uses: Vulnetix/cli/upload@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          upload-file: build/sbom.cdx.json
          upload-format: cyclonedx
```

`artifact-name` uploads every file the command wrote as one workflow artifact. `attest: true` attests those files with GitHub artifact attestations.

## Behaviour

- `upload-format` overrides format detection. Without it the CLI detects the format from the file.
- The command prints its JSON result in the step log (`snapshotUuid`, `pipelineId`). The action has no output for it: the root action's `upload-uuid` is documented in [GitHub Actions](/cli/ci-cd/github-actions/#outputs).
- To upload every report a whole workflow run produced, use [gha-upload](/cli/github-actions/gha-upload/).

## See also

- [upload](/cli/commands/upload/)
- [Third-party scanners](/cli/ci-cd/third-party-scanners/)
- [All Vulnetix actions](/cli/ci-cd/github-actions/#an-action-for-each-command)
- [Versions and release channels](/cli/ci-cd/versions-and-channels/)
