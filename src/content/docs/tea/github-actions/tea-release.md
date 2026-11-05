---
title: "Vulnetix/cli/tea-release action"
nav: "tea-release"
description: "The Vulnetix/cli/tea-release GitHub Action: inputs, outputs, permissions and a complete workflow with artifact upload and attestation."
order: 1
sources: [cli/tea-release/action.yml, cli/tools/actiongen/spec.go, cli/action-lib/run.sh, cli/action-lib/finish.sh, cli/docs/github-actions/tea-release.md]
checked: [cli@v4.23.1]
updated: 03 Nov 2026
---

Installs the CLI and runs [`vulnetix tea release`](/tea/cli/release/), which publishes a product release and its files to the Transparency Exchange API. It needs a Pro plan.

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: Vulnetix/cli/tea-release@v4
    with:
      tea-files: dist/*.cdx.json
```

Runs `vulnetix tea release <tea-files> [--product] [--purl] [--version] [--date] [--visibility] [--pre-release] [--dry-run]`. Credentials are optional: without `org-id` and a credential the CLI runs in community mode. They reach the CLI only as environment variables; see [Credentials](/cli/ci-cd/github-actions/#credentials).

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
| `tea-files` | Files to publish, one path or glob per line | - |
| `tea-product` | TEA product name; defaults to the GitHub repository | - |
| `tea-purl` | Package URL identifying the TEA product | - |
| `tea-version` | TEA release version; defaults to the tag on a tag run | - |
| `tea-date` | TEA release date (RFC3339) | - |
| `tea-pre-release` | Mark the release as a pre-release: true or false | `false` |
| `tea-visibility` | Visibility once published: private, shared or public. Public cannot be undone | - |
| `tea-dry-run` | Print what would be published and exit: true or false | `false` |
| `tea-channels` | Install channels with no single file to fetch, as name=...,url=...,purl=..., one per line (passed as --channel) | - |
| `tea-auto-version` | Outside a tag run, derive the version from git describe: true or false | `false` |
| `tea-checksums-from-release` | On a tag run, take the checksums from the GitHub release: true or false | `false` |

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
name: TEA release
on:
  release:
    types: [published]
jobs:
  sbom:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/sbom@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          artifact-name: sbom
          attest: true
      - uses: Vulnetix/cli/tea-release@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          tea-files: |
            .vulnetix/sbom.cdx.json
          tea-version: ${{ github.event.release.tag_name }}
          tea-visibility: private
```

`artifact-name` uploads every file the command wrote as one workflow artifact. `attest: true` attests those files with GitHub artifact attestations.

## Behaviour

- `tea-files` is one path or glob per line, and each becomes a positional argument.
- `tea-product` defaults to the repository. `tea-purl` defaults to `pkg:github/<tea-product>`. `tea-version` defaults to the tag on a tag run.
- Set `tea-date` for a version that is not a git tag, so a re-run republishes the same release instead of creating another.
- `tea-visibility: public` cannot be undone. Use `tea-dry-run: true` first.
- Artifact upload, attestation and release assets act on files the command wrote. `tea release` publishes files you name, so attest those files in an earlier step.

## See also

- [tea release](/tea/cli/release/)
- [Publishing](/tea/cli/publishing/)
- [All Vulnetix actions](/cli/ci-cd/github-actions/#an-action-for-each-command)
- [Versions and release channels](/cli/ci-cd/versions-and-channels/)
