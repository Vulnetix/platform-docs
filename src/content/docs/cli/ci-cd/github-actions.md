---
title: GitHub Actions
description: The Vulnetix/cli action's inputs, outputs and tasks, and complete workflows for scanning with gates, code scanning upload, parallel scanners, posture checks and release artifacts.
order: 2
sources: [cli/action.yml, cli/cmd/gha.go, cli/cmd/upload.go, cli/cmd/gha_submit.go, cli/cmd/scan_report.go, cli/install.sh]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

There are two ways to run the CLI in a workflow:

| Approach | Use it for |
|---|---|
| The install script in a `run:` step | Any command: `scan`, `sca`, `sast`, `analyze`, `gha audit`, ... |
| The action, `uses: Vulnetix/cli@<ref>` | Four fixed tasks: `info`, `upload`, `gha`, `tea-release` |

Both install the released binary; neither needs a Go toolchain.

## Secrets

Add under **Settings > Secrets and variables > Actions**:

| Secret | Value |
|---|---|
| `VULNETIX_ORG_ID` | Organisation UUID |
| `VULNETIX_API_KEY` | ApiKey |

## Scan with a gate

```yaml
name: Vulnetix
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
  security-events: write
jobs:
  scan:
    runs-on: ubuntu-latest
    env:
      VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
      VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
    steps:
      - uses: actions/checkout@v5
      - name: Install Vulnetix CLI
        run: |
          curl -fsSL --retry 5 --retry-all-errors -o "$RUNNER_TEMP/vulnetix-install.sh" https://cli.vulnetix.com/install.sh
          sh "$RUNNER_TEMP/vulnetix-install.sh" --install-dir "$HOME/.local/bin"
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"
      - run: vulnetix auth verify
      - name: Scan
        run: vulnetix scan --fail-on high,kev,malware -o dist/sbom.cdx.json -o dist/results.sarif
      - name: Upload SARIF to code scanning
        if: always() && hashFiles('dist/results.sarif') != ''
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: dist/results.sarif
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: vulnetix
          path: dist/
          if-no-files-found: warn
```

Under Actions, `scan` prints the plain view, adds workflow-command annotations on the manifest lines, and appends a Markdown summary to the job summary. The SARIF file exists only when there are findings, hence the `hashFiles` guard.

To report without blocking the merge, add `continue-on-error: true` to the scan step rather than removing the gate.

## One job per scanner

Every scanner runs on its own and publishes its own results:

```yaml
jobs:
  scanner:
    strategy:
      fail-fast: false
      matrix:
        run:
          - "sca --fail-on high -o dist/sbom.cdx.json"
          - "sast --fail-on high -o dist/sast.sarif"
          - "secrets -o dist/secrets.sarif"
          - "iac -o dist/iac.sarif"
          - "containers -o dist/containers.sarif"
          - "license --allow MIT,Apache-2.0,BSD-3-Clause"
          - "cbom --output-file dist/cbom.cdx.json"
          - "aibom --output-file dist/aibom.cdx.json"
    runs-on: ubuntu-latest
    env:
      VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
      VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
    steps:
      - uses: actions/checkout@v5
      - name: Install Vulnetix CLI
        run: |
          curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"
      - run: mkdir -p dist && vulnetix ${{ matrix.run }}
```

`malscan` reads installed dependencies, so run it after your install step (`npm ci`, `pip install`, ...): `vulnetix malscan --output-file dist/malscan.sarif`. Each scanner's flags are in its segment: [SCA](/sca/), [SAST](/sast/), [Secrets](/secrets/), [IaC scanning](/iac-scanning/), [Malware](/malware/), [SBOM](/sbom/).

## Posture and metrics

```yaml
      - name: GitHub posture
        env:
          GITHUB_TOKEN: ${{ github.token }}
        run: vulnetix gha audit --format sarif --output dist/gha.sarif --fail-on high
      - name: Repository metrics
        env:
          GITHUB_TOKEN: ${{ github.token }}
        run: vulnetix analyze
```

`analyze` needs `pull-requests: read` and `issues: read` in `permissions`, and `fetch-depth: 0` on checkout for history. See [GitHub posture commands](/cli/commands/gha/) and [analyze](/cli/commands/analyze/).

## Third-party scanners

`vulnetix gha setup` writes a workflow that runs gosec, Trivy, Semgrep, Checkov and others as separate jobs, and one publish job that sends every report to Vulnetix under the tool that produced it. See [Third-party scanners](/cli/ci-cd/third-party-scanners/) and [gha upload and status](/cli/ci-cd/gha-command/).

## Release artifacts

Attach the SBOM to a GitHub release from a separate job, so `contents: write` is not held by the scanning job:

```yaml
on:
  release:
    types: [published]
jobs:
  sbom:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    env:
      VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
      VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
    steps:
      - uses: actions/checkout@v5
      - name: Install Vulnetix CLI
        run: |
          curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"
      - run: vulnetix scan -o sbom.cdx.json
      - uses: actions/upload-artifact@v4
        with: { name: sbom, path: sbom.cdx.json }
  attach:
    needs: sbom
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/download-artifact@v4
        with: { name: sbom }
      - env:
          GH_TOKEN: ${{ github.token }}
        run: gh release upload "${{ github.event.release.tag_name }}" sbom.cdx.json --repo "${{ github.repository }}"
```

To publish a release to the Transparency Exchange API instead, use the action's `tea-release` task (below) or `vulnetix tea release`; see [TEA](/tea/).

## The Vulnetix/cli action

```yaml
      - uses: Vulnetix/cli@v3.154.0
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          task: info
```

The action installs the CLI with the install script into `$HOME/bin`, then, when `api-key` is set, runs `vulnetix auth login --store project` and `vulnetix auth verify`, then runs the task. `@v3` is a moving major tag; pin an exact release tag or a commit SHA. The `version` input chooses the CLI release separately from the action ref.

### Inputs

| Input | Required | Default | Used by | Meaning |
|---|---|---|---|---|
| `org-id` | Yes | | all | Organisation UUID |
| `api-key` | No | | all | ApiKey. When set, the action logs in and verifies before the task. |
| `version` | No | `latest` | all | CLI release to install, e.g. `v3.154.0` (a `v` is added if missing) |
| `task` | No | `info` | | `info`, `upload`, `gha` or `tea-release` |
| `upload-file` | With `upload` | | `upload` | Report to publish |
| `upload-format` | No | detected | `upload` | `cyclonedx`, `spdx`, `sarif`, `openvex`, `csaf_vex` |
| `tea-files` | With `tea-release` | | `tea-release` | Files to publish, one path or glob per line |
| `tea-product` | No | the repository | `tea-release` | TEA product name |
| `tea-purl` | No | `pkg:github/<tea-product>` | `tea-release` | Package URL identifying the product |
| `tea-version` | No | the tag, on a tag run | `tea-release` | Release version |
| `tea-date` | No | | `tea-release` | Release date (RFC 3339). Set it for a version that is not a git tag, so a re-run republishes the same release. |
| `tea-pre-release` | No | `false` | `tea-release` | Mark as a pre-release |
| `tea-visibility` | No | private | `tea-release` | `private`, `shared` or `public`. Public cannot be undone. |
| `tea-dry-run` | No | `false` | `tea-release` | Print what would be published, publish nothing |

### Tasks

| Task | Runs |
|---|---|
| `info` | `vulnetix` (the authentication health check) |
| `upload` | `vulnetix upload --file <upload-file> --org-id <org-id> --json [--format <upload-format>]` |
| `gha` | `vulnetix gha upload --org-id <org-id> --json`. Needs `GITHUB_TOKEN` in the step's `env` and `actions: read`. |
| `tea-release` | `vulnetix tea release <files> [--product] [--purl] [--version] [--date] [--visibility] [--pre-release] [--dry-run]`. Needs a Pro plan. |

```yaml
      - uses: Vulnetix/cli@v3.154.0
        env:
          GITHUB_TOKEN: ${{ github.token }}
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          task: gha
```

### Outputs

| Output | Value |
|---|---|
| `result` | `success` when the task step completed |
| `summary` | A fixed sentence per task |
| `upload-uuid` | Meant to be the uploaded report's ID (`task: upload`). |

> [!CAREFUL] upload-uuid is always empty
> The action reads `.pipelineRecord.uuid` from `vulnetix upload --json`, which now prints `snapshotUuid` and `pipelineId` instead, so the output is never set. Read the snapshot from the step log, or run `vulnetix upload --json` in a `run:` step and parse `snapshotUuid` yourself.

### The action stores a project credential

With `api-key`, the action runs `vulnetix auth login --api-key ... --store project`, which writes `./.vulnetix/credentials.json` into the checkout, with the key passed on the command line. Do not upload the workspace as an artifact or cache it after the action ran, and delete the file in a final `if: always()` step. For other commands, prefer the install script with `VULNETIX_API_KEY` in `env:`, which writes nothing.

## Permissions

| Permission | Needed for |
|---|---|
| `contents: read` | Checkout |
| `security-events: write` | `github/codeql-action/upload-sarif` |
| `actions: read` | `gha upload` and the action's `gha` task, to list the run's artifacts |
| `pull-requests: read`, `issues: read` | `analyze` |
| `contents: write` | `gh release upload`, in its own job |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `GITHUB_TOKEN environment variable is required` | Add `env: { GITHUB_TOKEN: ${{ github.token }} }` to the step running `gha upload` or the action's `gha` task |
| The SARIF upload step fails on a clean scan | The file is written only when there are findings: guard with `hashFiles(...)` or `if-no-files-found: warn` |
| `gha upload` finds nothing | It sees only artifacts already uploaded in this run: put it in a job that `needs:` every producer, with `if: always()` |
| Results look unauthenticated | A secret name is wrong or the secret is not available to forks. Assert the source: [Precedence](/cli/authentication/precedence/#asserting-the-source-in-a-pipeline) |
| The install step fails | The runner must reach `cli.vulnetix.com` and `github.com` release downloads. Behind a proxy, set `HTTPS_PROXY` at job level. |
