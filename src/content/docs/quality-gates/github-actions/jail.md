---
title: "Vulnetix/cli/jail action"
nav: "jail"
description: "The Vulnetix/cli/jail GitHub Action: inputs, outputs, permissions and a complete workflow with artifact upload and attestation."
order: 1
sources: [cli/jail/action.yml, cli/tools/actiongen/spec.go, cli/action-lib/run.sh, cli/action-lib/finish.sh, cli/docs/github-actions/jail.md]
checked: [cli@v4.23.1]
updated: 03 Nov 2026
---

Installs the CLI and runs [`vulnetix jail`](/quality-gates/jail/in-ci/), which assesses the repository against the organisation's jail policy using the scan snapshots already uploaded. It needs credentials.

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: Vulnetix/cli/jail@v4
    with:
      org-id: ${{ secrets.VULNETIX_ORG_ID }}
      api-key: ${{ secrets.VULNETIX_API_KEY }}
```

Runs `vulnetix jail --path <path>`. Credentials are optional: without `org-id` and a credential the CLI runs in community mode. They reach the CLI only as environment variables; see [Credentials](/cli/ci-cd/github-actions/#credentials).

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
name: Jail
on:
  push:
    branches: [main]
jobs:
  sca:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/sca@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
  jail:
    needs: [sca]
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/jail@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          artifact-name: vulnetix-jail
          attest: true
```

`artifact-name` uploads every file the command wrote as one workflow artifact. `attest: true` attests those files with GitHub artifact attestations.

## Behaviour

- Run it after the scan jobs have uploaded: give it `needs:` on them.
- Exit codes: `0` passed, `1` a rule breached, `2` usage or configuration error, `3` the verdict could not be decided because scan coverage is stale or missing. The action re-raises any non-zero code unless `fail-on-findings` is `false`.
- `files` lists the paths of everything the command wrote, one per line. `sarif` and `sbom` narrow that to the SARIF files and the CycloneDX SBOM.

> [!CAREFUL] `fail-on-findings: false` also lets exit code 3 pass
> With `fail-on-findings: false` an undecided verdict (exit code 3) and a usage error (exit code 2) become warnings, and the job continues. Read `exit-code` in a later step if you need to tell them apart from a breach.

## Upload and attest in your own steps

The built-in `artifact-name` and `attest` inputs are the short form. To control those steps yourself, use the outputs. The action's last step fails the job with the command's exit code, so later steps need `if: ${{ !cancelled() }}`; the example turns the failure off and re-raises it at the end.

```yaml
      - uses: Vulnetix/cli/jail@v4
        id: vulnetix
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          fail-on-findings: false
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: vulnetix-jail
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

- [Jail in CI](/quality-gates/jail/in-ci/)
- [How jail works](/quality-gates/jail/how-jail-works/)
- [All Vulnetix actions](/cli/ci-cd/github-actions/#an-action-for-each-command)
- [Versions and release channels](/cli/ci-cd/versions-and-channels/)
