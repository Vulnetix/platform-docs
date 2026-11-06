---
title: "Vulnetix/cli/github-publish action"
nav: "github-publish"
description: "The Vulnetix/cli/github-publish GitHub Action: inputs, outputs, permissions and a complete workflow with artifact upload and attestation."
order: 5
sources: [cli/github-publish/action.yml, cli/tools/actiongen/spec.go, cli/action-lib/run.sh, cli/action-lib/finish.sh, cli/docs/github-actions/github-publish.md]
checked: [cli@v4.24.2]
updated: 03 Nov 2026
---

Installs the CLI and publishes results that already exist into GitHub: SARIF to code scanning, a CycloneDX SBOM to the dependency graph and, with `release-tag`, files to a release. It scans nothing. Use it when the scan ran in another job, in another tool, or with a command whose action cannot publish.

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: Vulnetix/cli/github-publish@v4
    with:
      org-id: ${{ secrets.VULNETIX_ORG_ID }}
      api-key: ${{ secrets.VULNETIX_API_KEY }}
```

Runs `vulnetix gha publish code-scanning | dependency-graph`. Credentials are optional: without `org-id` and a credential the CLI runs in community mode. They reach the CLI only as environment variables; see [Credentials](/cli/ci-cd/github-actions/#credentials).

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
| `artifact-name` | Upload every file the command wrote as a workflow artifact with this name | - |
| `fail-on-findings` | Fail the step when the command exits non-zero (findings over a gate, a breach, an error): true or false. The artifact, attestation and publish steps run either way | `true` |
| `github-code-scanning` | Upload SARIF to GitHub code scanning (needs security-events: write): true or false | `false` |
| `dependency-graph` | Submit the SBOM to the GitHub dependency graph (needs contents: write): true or false | `false` |
| `github-token` | Token for GitHub publishing, release assets and pull request comments | `${{ github.token }}` |
| `attest` | Attest the written files with GitHub artifact attestations (needs id-token: write and attestations: write): true or false | `false` |
| `release-tag` | Attach every file the command wrote to the GitHub release with this tag (needs contents: write) | - |
| `sarif` | SARIF files to upload to code scanning, one per line (default: every .vulnetix/*.sarif under path) | - |
| `sbom` | CycloneDX SBOM to submit to the dependency graph (default: .vulnetix/sbom.cdx.json under path) | - |
| `campaigns` | Mirror Vulnetix remediation campaigns (Pro) as GitHub security campaigns (vulnetix gha publish campaigns). Run it as an organization-level scheduled job after code scanning has published: true or false | `false` |
| `campaigns-org` | GitHub organization that owns the campaigns; defaults to the repository owner | - |
| `campaigns-github-token` | GitHub token of an organization owner or security manager (a PAT or GitHub App token); the workflow token cannot manage campaigns. Defaults to github-token | - |
| `campaigns-recreate` | Close and recreate a GitHub campaign whose Vulnetix cohort changed, because GitHub cannot change a campaign's alerts: true or false | `false` |
| `campaigns-dry-run` | Print what would change and write nothing: true or false | `false` |

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
- `contents: write` with `dependency-graph: true`
- `id-token: write` and `attestations: write` with `attest: true`
- `contents: write` with `release-tag`
- no workflow permission for `campaigns: true`: `campaigns-github-token` must be a PAT or GitHub App token of an organization owner or security manager (the organization needs GitHub Advanced Security), and the `org-id` and `api-key` inputs a Vulnetix credential that can read campaigns

## Example workflow

```yaml
name: Scan, then publish
on:
  push:
    branches: [main]
jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/sca@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          artifact-name: results
          fail-on-findings: false
  publish:
    needs: [scan]
    if: ${{ !cancelled() }}
    runs-on: ubuntu-latest
    permissions:
      contents: write          # dependency graph
      security-events: write   # code scanning
      actions: read            # private repository
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@v5
      - uses: actions/download-artifact@v5
        with:
          name: results
          path: results
      - uses: Vulnetix/cli/github-publish@v4
        with:
          sarif: results/sca.sarif
          sbom: results/sbom.cdx.json
          github-code-scanning: true
          dependency-graph: true
          artifact-name: published
          attest: true
```

`artifact-name` uploads every file the command wrote as one workflow artifact. `attest: true` attests those files with GitHub artifact attestations.

## Behaviour

- `sarif` is one SARIF file per line. Left out, it uploads every `.vulnetix/*.sarif` under `path`. `sbom` defaults to `.vulnetix/sbom.cdx.json`.
- The step publishes only the targets switched on with `github-code-scanning` and `dependency-graph`. Both default to `false`.
- A failure of this action fails the step, unlike the publish steps of the scanning actions, which warn. See [gha publish](/cli/commands/gha-publish/).
- The token is `github-token`, default `github.token`. Repository advisories are not published by this action: the workflow token cannot create them.

## See also

- [gha publish](/cli/commands/gha-publish/)
- [SARIF reference](/cli/reference/sarif/)
- [All Vulnetix actions](/cli/ci-cd/github-actions/#an-action-for-each-command)
- [Versions and release channels](/cli/ci-cd/versions-and-channels/)
