---
title: "Vulnetix/cli/iac action"
nav: "iac"
description: "The Vulnetix/cli/iac GitHub Action: inputs, outputs, permissions and a complete workflow with artifact upload and attestation."
order: 1
sources: [cli/iac/action.yml, cli/tools/actiongen/spec.go, cli/action-lib/run.sh, cli/action-lib/finish.sh, cli/docs/github-actions/iac.md]
checked: [cli@v4.23.0]
updated: 03 Nov 2026
---

Installs the CLI and runs [`vulnetix iac`](/iac-scanning/) on `path`. The findings are written to `.vulnetix/sast.sarif` and published to GitHub code scanning under the category `vulnetix/iac/`.

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: Vulnetix/cli/iac@v4
    with:
      org-id: ${{ secrets.VULNETIX_ORG_ID }}
      api-key: ${{ secrets.VULNETIX_API_KEY }}
```

Runs `vulnetix iac --path <path>`. Credentials are optional: without `org-id` and a credential the CLI runs in community mode. They reach the CLI only as environment variables; see [Credentials](/cli/ci-cd/github-actions/#credentials).

## Inputs

| Input | Description | Default |
|---|---|---|
| `version` | Release of the Vulnetix CLI to install. Empty installs the release this action ref was cut from, which is what a lock file or a SHA pin expects. An exact tag (v4.0.0), a major channel (v4) or latest float instead | - |
| `binary-path` | Path to an already-built vulnetix binary to use instead of downloading a release | - |
| `verify-provenance` | Verify the downloaded CLI against the signed SLSA provenance of its release with cosign, which this action installs: true or false. Every v4 release is signed; set false to install a v3 release that has no provenance.sigstore.json. The SHA-256 checksum is checked either way | `true` |
| `org-id` | Vulnetix organization ID (UUID), used with api-key. Optional: without credentials the CLI runs in community mode | - |
| `api-key` | Vulnetix API key. Passed to the CLI as VULNETIX_API_KEY, never on the command line | - |
| `api-token` | Vulnetix API token; the server resolves the organization. Passed as VULNETIX_API_TOKEN | - |
| `path` | Directory to scan | `.` |
| `args` | Extra arguments for the command, separated by spaces or newlines (no shell quoting is applied) | - |
| `extra-args` | Extra arguments, one per line, so a value may contain spaces | - |
| `artifact-name` | Upload every file the command wrote as a workflow artifact with this name | - |
| `fail-on-findings` | Fail the step when the command exits non-zero (findings over a gate, a breach, an error): true or false. The artifact, attestation and publish steps run either way | `true` |
| `github-code-scanning` | Upload SARIF to GitHub code scanning (needs security-events: write): true or false | `false` |
| `github-token` | Token for GitHub publishing, release assets and pull request comments | `${{ github.token }}` |
| `attest` | Attest the written files with GitHub artifact attestations (needs id-token: write and attestations: write): true or false | `false` |
| `release-tag` | Attach every file the command wrote to the GitHub release with this tag (needs contents: write) | - |
| `vex` | VEX documents to apply before the gates, one path, directory or https URL per line (passed as --vex). VexSource documents under .vulnetix/config apply too | - |
| `fail-on` | Exit 1 when any of these hold, one per line or comma-separated: low, medium, high, critical, kev, malware, unpinned, exploit=poc and the rest of --fail-on | - |
| `exclude` | Paths to skip, one glob per line (passed as --exclude) | - |
| `rules` | External rule repositories in org/repo form, one per line (passed as --rule) | - |

`vex` takes one path, directory or `https` URL per line. Each non-blank line becomes its own `--vex`, with no globbing, so the action does what [`--vex`](/vex/scans/vex-file/) does: a file or directory is read from the workspace, a URL is downloaded for the run, and a URL that cannot be fetched fails the scan. You do not need the input for the organization's own VEX. The `VexSource` documents under `.vulnetix/config` apply without it, and an authenticated scan (CLI v4.4.0 and later) also applies the statements the Resolve Platform holds for the repository, including those of `tea`, `s3` and `git` sources and of VEX documents ingested earlier, de-duplicated against this input. Use the input for extra or local documents, such as a vendor's file in the workspace. `--no-vex` in `args` turns all of it off, and a community-mode run applies none from the Resolve Platform; see [VEX in a scan](/vex/scans/vex-file/#statements-the-resolve-platform-holds). Available from CLI v4.3.0 (`Vulnetix/cli/iac@v4`).

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
name: Vulnetix IaC
on:
  push:
    branches: [main]
  pull_request:
jobs:
  iac:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
      actions: read            # private repository
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/iac@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          github-code-scanning: true
          artifact-name: vulnetix-iac
          attest: true
```

`artifact-name` uploads every file the command wrote as one workflow artifact. `attest: true` attests those files with GitHub artifact attestations.

## Behaviour

- `github-code-scanning: true` adds `--github-publish code-scanning`. See [SARIF reference](/cli/reference/sarif/).
- `files` lists the paths of everything the command wrote, one per line. `sarif` and `sbom` narrow that to the SARIF files and the CycloneDX SBOM.

## Upload and attest in your own steps

The built-in `artifact-name` and `attest` inputs are the short form. To control those steps yourself, use the outputs. The action's last step fails the job with the command's exit code, so later steps need `if: ${{ !cancelled() }}`; the example turns the failure off and re-raises it at the end.

```yaml
      - uses: Vulnetix/cli/iac@v4
        id: vulnetix
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          fail-on-findings: false
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: vulnetix-iac
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

- [IaC scanning overview](/iac-scanning/)
- [Reading the report](/iac-scanning/guides/reading-the-report/)
- [All Vulnetix actions](/cli/ci-cd/github-actions/#an-action-for-each-command)
- [Versions and release channels](/cli/ci-cd/versions-and-channels/)
