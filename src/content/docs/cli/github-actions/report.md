---
title: "Vulnetix/cli/report action"
nav: "report"
description: "The Vulnetix/cli/report GitHub Action: inputs, outputs and a workflow."
order: 62
sources: [cli/report/action.yml, cli/tools/actiongen/spec.go, cli/tools/actiongen/catalog.go]
checked: [cli@v4.24.2]
updated: 06 Nov 2026
generated: true
---

Render the stored scan results of an earlier step without rescanning (vulnetix report).

```yaml
jobs:
  vulnetix:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/report@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
```

## Variations

### Report without failing the job

Adopt the action first and turn the gate on later. The artifact, attestation and publish steps run either way.

```yaml
jobs:
  vulnetix:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/report@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          fail-on-findings: false
```

### Attest the output and attach it to a release

Sign the files with a GitHub artifact attestation and add them to the release the workflow is publishing.

```yaml
jobs:
  vulnetix:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
      attestations: write
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/report@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          attest: true
          release-tag: ${{ github.event.release.tag_name }}
```

### Narrow the scan

Skip paths, add an external rule repository, or pass any other flag of the command with `extra-args`, one argument per line.

```yaml
jobs:
  vulnetix:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/report@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
```

### A subdirectory or monorepo package

Point the action at one directory. Run it once per package with a matrix when each has its own manifest.

```yaml
jobs:
  vulnetix:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/report@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          path: services/api
```

### Pin the CLI for a locked workflow

Use an exact tag, or a full commit SHA, and leave `version` empty: the action installs the release its own ref was cut from, so an `actions.lock` entry or a SHA pin names the binary too. Setting `version` to `v4` or `latest` floats instead.

```yaml
jobs:
  vulnetix:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/report@v4.24.2
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
```

### Pull requests from forks

Secrets are not available to a fork. Leave the credentials out and the action runs in community mode, with nothing published.

```yaml
jobs:
  vulnetix:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/report@v4
        with:
          fail-on-findings: false
```

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
| `view` | How to present results: auto, packages, findings, tree, table or plain | - |
| `filter` | Show only findings that match all of these, one per line (passed as --filter) | - |
| `min-severity` | Hide anything below this severity | - |

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
