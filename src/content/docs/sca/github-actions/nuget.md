---
title: "Vulnetix/cli/sca/nuget action"
nav: "sca/nuget"
description: "The Vulnetix/cli/sca/nuget GitHub Action: inputs, outputs and a workflow."
order: 85
sources: [cli/sca/nuget/action.yml, cli/tools/actiongen/spec.go, cli/tools/actiongen/catalog.go]
checked: [cli@v4.24.2]
updated: 06 Nov 2026
generated: true
---

Scan the NuGet dependencies of a repository for known vulnerabilities (vulnetix sca --package-manager nuget).

```yaml
jobs:
  vulnetix:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/sca/nuget@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
```

## Variations

### Gate on severity or exploitation

Fail the job on the findings that matter, and let the rest report without failing it. Each line is one condition.

```yaml
jobs:
  vulnetix:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/sca/nuget@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          fail-on: |
            high
            kev
```

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
      - uses: Vulnetix/cli/sca/nuget@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          fail-on-findings: false
```

### Publish to GitHub code scanning

Alerts appear in the Security tab, in a category of their own so this job never closes another job's alerts.

```yaml
jobs:
  vulnetix:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/sca/nuget@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          github-code-scanning: true
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
      - uses: Vulnetix/cli/sca/nuget@v4
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
      - uses: Vulnetix/cli/sca/nuget@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          exclude: |
            **/testdata/**
            vendor/**
```

### Scan the rest of the repository

Pair this job with a high-level `sca` job that skips nuget, so every manifest is scanned exactly once.

```yaml
jobs:
  vulnetix:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/sca@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          not-package-manager: nuget
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
      - uses: Vulnetix/cli/sca/nuget@v4
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
      - uses: Vulnetix/cli/sca/nuget@v4.24.2
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
      - uses: Vulnetix/cli/sca/nuget@v4
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
| `github-code-scanning` | Upload SARIF to GitHub code scanning (needs security-events: write): true or false | `false` |
| `github-token` | Token for GitHub publishing, release assets and pull request comments | `${{ github.token }}` |
| `attest` | Attest the written files with GitHub artifact attestations (needs id-token: write and attestations: write): true or false | `false` |
| `release-tag` | Attach every file the command wrote to the GitHub release with this tag (needs contents: write) | - |
| `vex` | VEX documents to apply before the gates, one path, directory or https URL per line (passed as --vex). VexSource documents under .vulnetix/config apply too | - |
| `fail-on` | Exit 1 when any of these hold, one per line or comma-separated: low, medium, high, critical, kev, malware, unpinned, exploit=poc and the rest of --fail-on | - |
| `exclude` | Paths to skip, one glob per line (passed as --exclude) | - |

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
