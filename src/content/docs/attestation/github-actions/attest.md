---
title: "Vulnetix/cli/attest action"
nav: "attest"
description: "The Vulnetix/cli/attest GitHub Action: inputs, outputs, permissions and a complete workflow with artifact upload and attestation."
order: 1
sources: [cli/attest/action.yml, cli/tools/actiongen/spec.go, cli/action-lib/run.sh, cli/action-lib/finish.sh, cli/docs/github-actions/attest.md]
checked: [cli@3e6fd831d]
updated: 03 Nov 2026
---

Installs the CLI and runs [`vulnetix attest verify`](/attestation/verify/attest-verify/), which verifies an artefact's signature, identity and provenance. It is the consuming side of the `attest` input the other actions offer.

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: Vulnetix/cli/attest@v3
    with:
      subject: dist/app.tar.gz
```

Runs `vulnetix attest verify <subject>`. Credentials are optional: without `org-id` and a credential the CLI runs in community mode. They reach the CLI only as environment variables; see [Credentials](/cli/ci-cd/github-actions/#credentials).

## Inputs

| Input | Description | Default |
|---|---|---|
| `version` | Release of the Vulnetix CLI to install: an exact tag (v3.158.0), a major channel (v3, the newest v3 release) or latest | `v3` |
| `binary-path` | Path to an already-built vulnetix binary to use instead of downloading a release | - |
| `org-id` | Vulnetix organization ID (UUID), used with api-key. Optional: without credentials the CLI runs in community mode | - |
| `api-key` | Vulnetix API key. Passed to the CLI as VULNETIX_API_KEY, never on the command line | - |
| `api-token` | Vulnetix API token; the server resolves the organization. Passed as VULNETIX_API_TOKEN | - |
| `args` | Extra arguments for the command, separated by spaces or newlines (no shell quoting is applied) | - |
| `artifact-name` | Upload every file the command wrote as a workflow artifact with this name | - |
| `fail-on-findings` | Fail the step when the command exits non-zero (findings over a gate, a breach, an error): true or false. The artifact, attestation and publish steps run either way | `true` |
| `github-token` | Token for GitHub publishing, release assets and pull request comments | `${{ github.token }}` |
| `attest` | Attest the written files with GitHub artifact attestations (needs id-token: write and attestations: write): true or false | `false` |
| `release-tag` | Attach every file the command wrote to the GitHub release with this tag (needs contents: write) | - |
| `subject` | The artefact to verify | - |

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
name: Verify a release artefact
on:
  workflow_dispatch:
    inputs:
      tag:
        required: true
jobs:
  verify:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Download the release asset and its attestation
        env:
          GH_TOKEN: ${{ github.token }}
          TAG: ${{ inputs.tag }}
        run: gh release download "$TAG" --repo "$GITHUB_REPOSITORY" --pattern 'sbom.cdx.json*'
      - uses: Vulnetix/cli/attest@v3
        with:
          subject: sbom.cdx.json
      - name: Check the GitHub attestation
        env:
          GH_TOKEN: ${{ github.token }}
        run: gh attestation verify sbom.cdx.json --repo "$GITHUB_REPOSITORY"
```

`artifact-name` uploads every file the command wrote as one workflow artifact. `attest: true` attests those files with GitHub artifact attestations.

## Behaviour

- `subject` is one artefact per line, each passed as a positional argument. Trust and pinning options go in `args`: [Trust and pinning](/attestation/verify/trust-and-pinning/).
- A failed verification exits non-zero and fails the job. With `fail-on-findings: false` the failure becomes a warning, which defeats the check: leave it at `true`.
- To check a GitHub artifact attestation made by the `attest` input, `gh attestation verify <file> --repo <owner>/<repo>` is the GitHub side of the same check.

## See also

- [attest verify](/attestation/verify/attest-verify/)
- [Trust and pinning](/attestation/verify/trust-and-pinning/)
- [All Vulnetix actions](/cli/ci-cd/github-actions/#an-action-for-each-command)
- [Versions and release channels](/cli/ci-cd/versions-and-channels/)
