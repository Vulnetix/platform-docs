---
title: "Vulnetix/cli/secrets action"
nav: "secrets"
description: "The Vulnetix/cli/secrets GitHub Action: inputs, outputs, permissions and a complete workflow with artifact upload and attestation."
order: 1
sources: [cli/secrets/action.yml, cli/tools/actiongen/spec.go, cli/action-lib/run.sh, cli/action-lib/finish.sh, cli/docs/github-actions/secrets.md]
checked: [cli@v4.3.0]
updated: 03 Nov 2026
---

Installs the CLI and runs [`vulnetix secrets`](/secrets/) on `path`. The findings are written to `.vulnetix/sast.sarif` and published to GitHub code scanning under the category `vulnetix/secrets/`.

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: Vulnetix/cli/secrets@v4
    with:
      org-id: ${{ secrets.VULNETIX_ORG_ID }}
      api-key: ${{ secrets.VULNETIX_API_KEY }}
```

Runs `vulnetix secrets --path <path>`. Credentials are optional: without `org-id` and a credential the CLI runs in community mode. They reach the CLI only as environment variables; see [Credentials](/cli/ci-cd/github-actions/#credentials).

## Inputs

| Input | Description | Default |
|---|---|---|
| `version` | Release of the Vulnetix CLI to install: an exact tag (v4.0.0), a major channel (v4, the newest v4 release) or latest | `v4` |
| `binary-path` | Path to an already-built vulnetix binary to use instead of downloading a release | - |
| `org-id` | Vulnetix organization ID (UUID), used with api-key. Optional: without credentials the CLI runs in community mode | - |
| `api-key` | Vulnetix API key. Passed to the CLI as VULNETIX_API_KEY, never on the command line | - |
| `api-token` | Vulnetix API token; the server resolves the organization. Passed as VULNETIX_API_TOKEN | - |
| `path` | Directory to scan | `.` |
| `args` | Extra arguments for the command, separated by spaces or newlines (no shell quoting is applied) | - |
| `artifact-name` | Upload every file the command wrote as a workflow artifact with this name | - |
| `fail-on-findings` | Fail the step when the command exits non-zero (findings over a gate, a breach, an error): true or false. The artifact, attestation and publish steps run either way | `true` |
| `github-code-scanning` | Upload SARIF to GitHub code scanning (needs security-events: write): true or false | `false` |
| `github-token` | Token for GitHub publishing, release assets and pull request comments | `${{ github.token }}` |
| `attest` | Attest the written files with GitHub artifact attestations (needs id-token: write and attestations: write): true or false | `false` |
| `release-tag` | Attach every file the command wrote to the GitHub release with this tag (needs contents: write) | - |
| `vex` | VEX documents to apply before the gates, one path, directory or https URL per line (passed as --vex). VexSource documents under .vulnetix/config apply too | - |

`vex` takes one path, directory or `https` URL per line. Each non-blank line becomes its own `--vex`, with no globbing, so the action does what [`--vex`](/vex/scans/vex-file/) does: a file or directory is read from the workspace, a URL is downloaded for the run, and a URL that cannot be fetched fails the scan. The `VexSource` documents under `.vulnetix/config` apply without the input; their `path` and `urls` sources are read, and a `tea`, `s3` or `git` source is the console's, so pass its documents here. Available from CLI v4.3.0 (`Vulnetix/cli/secrets@v4`).

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
- `security-events: write` with `github-code-scanning: true` (plus `actions: read` on private repositories)
- `id-token: write` and `attestations: write` with `attest: true`
- `contents: write` with `release-tag`

## Example workflow

```yaml
name: Vulnetix secrets
on:
  push:
    branches: [main]
  pull_request:
jobs:
  secrets:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
      actions: read            # private repository
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/secrets@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          github-code-scanning: true
          artifact-name: vulnetix-secrets
          attest: true
```

`artifact-name` uploads every file the command wrote as one workflow artifact. `attest: true` attests those files with GitHub artifact attestations.

## Behaviour

- `github-code-scanning: true` adds `--github-publish code-scanning`. Code scanning splits the SARIF by kind, so a secrets upload never closes a SAST alert.
- The SARIF names the file and line of each finding. Decide who can download a workflow artifact before you set `artifact-name`.
- `files` lists the paths of everything the command wrote, one per line. `sarif` and `sbom` narrow that to the SARIF files and the CycloneDX SBOM.

## Upload and attest in your own steps

The built-in `artifact-name` and `attest` inputs are the short form. To control those steps yourself, use the outputs. The action's last step fails the job with the command's exit code, so later steps need `if: ${{ !cancelled() }}`; the example turns the failure off and re-raises it at the end.

```yaml
      - uses: Vulnetix/cli/secrets@v4
        id: vulnetix
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          fail-on-findings: false
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: vulnetix-secrets
          path: ${{ steps.vulnetix.outputs.files }}
          include-hidden-files: true
      - uses: actions/attest-build-provenance@v4
        if: ${{ !cancelled() }}
        with:
          subject-path: ${{ steps.vulnetix.outputs.files }}
      - name: Fail on the command's exit code
        if: ${{ steps.vulnetix.outputs.exit-code != '0' }}
        env:
          EXIT_CODE: ${{ steps.vulnetix.outputs.exit-code }}
        run: exit "$EXIT_CODE"
```

Verify an attestation made this way with `gh attestation verify <file> --repo <owner>/<repo>`.

## See also

- [Secrets overview](/secrets/)
- [Reading the report](/secrets/guides/reading-the-report/)
- [All Vulnetix actions](/cli/ci-cd/github-actions/#an-action-for-each-command)
- [Versions and release channels](/cli/ci-cd/versions-and-channels/)
