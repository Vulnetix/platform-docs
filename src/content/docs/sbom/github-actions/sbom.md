---
title: "Vulnetix/cli/sbom action"
nav: "sbom"
description: "The Vulnetix/cli/sbom GitHub Action: inputs, outputs, permissions and a complete workflow with artifact upload and attestation."
order: 1
sources: [cli/sbom/action.yml, cli/tools/actiongen/spec.go, cli/action-lib/run.sh, cli/action-lib/finish.sh, cli/docs/github-actions/sbom.md]
checked: [cli@v4.23.0]
updated: 04 Nov 2026
---

Installs the CLI and runs [`vulnetix cdx`](/sbom/generate/cdx/), which writes one CycloneDX SBOM for the directory to `.vulnetix/sbom.cdx.json`. It can sign the SBOM with the runner's OIDC identity, attest it, submit it to the GitHub dependency graph and attach it to a release.

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: Vulnetix/cli/sbom@v4
    with:
      org-id: ${{ secrets.VULNETIX_ORG_ID }}
      api-key: ${{ secrets.VULNETIX_API_KEY }}
```

Runs `vulnetix cdx --path <path> [--sign]`. Credentials are optional: without `org-id` and a credential the CLI runs in community mode. They reach the CLI only as environment variables; see [Credentials](/cli/ci-cd/github-actions/#credentials).

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
| `dependency-graph` | Submit the SBOM to the GitHub dependency graph (needs contents: write): true or false | `false` |
| `github-token` | Token for GitHub publishing, release assets and pull request comments | `${{ github.token }}` |
| `attest` | Attest the written files with GitHub artifact attestations (needs id-token: write and attestations: write): true or false | `false` |
| `release-tag` | Attach every file the command wrote to the GitHub release with this tag (needs contents: write) | - |
| `sign` | Sign the document with the runner's OIDC identity (needs id-token: write): true or false | `false` |
| `bom-manufacturer` | Organisation that created the BOM (metadata.manufacturer); defaults to the repository owner | - |
| `bom-author` | Author of the document as Name <email>, one per line (metadata.authors; passed as --bom-author) | - |
| `bom-supplier` | Supplier of the component the BOM describes (metadata.supplier) | - |
| `bom-license` | Licence of the document itself, an SPDX id or expression (metadata.licenses) | - |
| `bom-property` | Document property as name=value, one per line (metadata.properties; passed as --bom-property) | - |
| `bom-overlay` | CycloneDX JSON fragments merged into the document before validation, one path per line (passed as --bom-overlay) | - |

`args` is split on spaces and newlines. No shell quoting is applied, and nothing is evaluated.


The identity inputs arrived in CLI v4.15.0. Values without spaces, such as `--bom-serial` and `--component-version`, go in `args` or the `VULNETIX_BOM_*` and `VULNETIX_COMPONENT_*` environment variables. See [Overlay files](/sbom/author/overlay/#github-actions).

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
- `contents: write` with `dependency-graph: true`
- `id-token: write` and `attestations: write` with `attest: true`
- `contents: write` with `release-tag`
- `id-token: write` with `sign: true`

## Example workflow

```yaml
name: SBOM
on:
  release:
    types: [published]
jobs:
  sbom:
    runs-on: ubuntu-latest
    permissions:
      contents: write          # dependency graph and release assets
      id-token: write          # signing and attestation
      attestations: write
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/sbom@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          sign: true
          dependency-graph: true
          artifact-name: sbom
          attest: true
          release-tag: ${{ github.event.release.tag_name }}
```

`artifact-name` uploads every file the command wrote as one workflow artifact. `attest: true` attests those files with GitHub artifact attestations.

## Behaviour

- `sign: true` adds `--sign`. The signature, certificate and in-toto sidecars (`.sig`, `.pem`, `.intoto.jsonl`) are written next to the SBOM and recorded in the artifact manifest, so `release-tag` attaches them too. See [Signing documents](/attestation/sign/signing-documents/).
- `attest: true` uses `actions/attest` with the SBOM as both the subject and the `sbom-path`, so GitHub stores an SBOM attestation. The other actions use build provenance attestation.
- `dependency-graph: true` runs `vulnetix gha publish dependency-graph` after the command. Components without a purl are skipped. See [gha publish](/cli/commands/gha-publish/#dependency-graph).
- `release-tag` runs `vulnetix gha publish release-assets --tag <tag> --clobber`. The release must exist; it is not created.
- `files` lists the paths of everything the command wrote, one per line. `sarif` and `sbom` narrow that to the SARIF files and the CycloneDX SBOM.

## Upload and attest in your own steps

The built-in `artifact-name` and `attest` inputs are the short form. To control those steps yourself, use the outputs. The action's last step fails the job with the command's exit code, so later steps need `if: ${{ !cancelled() }}`; the example turns the failure off and re-raises it at the end.

```yaml
      - uses: Vulnetix/cli/sbom@v4
        id: vulnetix
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          fail-on-findings: false
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: vulnetix-sbom
          path: ${{ steps.vulnetix.outputs.files }}
          include-hidden-files: true
      - uses: actions/attest-build-provenance@v4
        if: ${{ !cancelled() }}
        with:
          subject-path: ${{ steps.vulnetix.outputs.sbom }}
      - name: Fail on the command's exit code
        if: ${{ steps.vulnetix.outputs.exit-code != '0' }}
        env:
          EXIT_CODE: ${{ steps.vulnetix.outputs.exit-code }}
        run: exit "$EXIT_CODE"
```

Verify an attestation made this way with `gh attestation verify <file> --repo <owner>/<repo>`.

## See also

- [vulnetix cdx](/sbom/generate/cdx/)
- [Signing documents](/attestation/sign/signing-documents/)
- [Artifact manifest](/cli/reference/artifact-manifest/)
- [All Vulnetix actions](/cli/ci-cd/github-actions/#an-action-for-each-command)
- [Versions and release channels](/cli/ci-cd/versions-and-channels/)
