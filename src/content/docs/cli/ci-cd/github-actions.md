---
title: GitHub Actions
description: The Vulnetix/cli action's inputs, outputs and tasks, and complete workflows for scanning with gates, code scanning upload, parallel scanners, posture checks and release artifacts.
order: 2
sources: [cli/action.yml, cli/cmd/gha.go, cli/cmd/upload.go, cli/cmd/gha_submit.go, cli/cmd/scan_report.go, cli/install.sh]
checked: [cli@d01f1dbe3]
updated: 02 Nov 2026
---

There are two ways to run the CLI in a workflow:

| Approach | Use it for |
|---|---|
| The install script in a `run:` step | Any command: `scan`, `sca`, `sast`, `analyze`, `gha audit`, ... |
| The action, `uses: Vulnetix/cli@<ref>` | Six fixed tasks: `info`, `upload`, `gha`, `tea-release`, `config-plan`, `config-apply` |

Both install the released binary; neither needs a Go toolchain.

## Secrets

Add under **Settings > Secrets and variables > Actions**:

| Secret | Value |
|---|---|
| `VULNETIX_ORG_ID` | Organisation UUID |
| `VULNETIX_API_KEY` | ApiKey |
| `VULNETIX_CONFIG_TOKEN` | Config management token (`vmt_...`), only for `config-plan` and `config-apply` |

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
| `task` | No | `info` | | `info`, `upload`, `gha`, `tea-release`, `config-plan` or `config-apply` |
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
| `config-token` | For `config-*` | | `config-plan`, `config-apply` | Config management token. Passed to the CLI as `VULNETIX_CONFIG_TOKEN`, never on the command line. |
| `config-path` | No | `.vulnetix/config` | `config-plan`, `config-apply` | Documents, one file or directory per line |
| `config-manager` | No | `gitops:<owner/repo>` | `config-plan`, `config-apply` | Manager the documents are declared by |
| `config-prune` | No | `false` | `config-plan`, `config-apply` | Delete objects this manager owns that the documents no longer declare |
| `github-token` | No | `github.token` | `config-plan` | Token used to comment the plan on a pull request. Needs `pull-requests: write`. |

### Tasks

| Task | Runs |
|---|---|
| `info` | `vulnetix` (the authentication health check) |
| `upload` | `vulnetix upload --file <upload-file> --org-id <org-id> --json [--format <upload-format>]` |
| `gha` | `vulnetix gha upload --org-id <org-id> --json`. Needs `GITHUB_TOKEN` in the step's `env` and `actions: read`. |
| `tea-release` | `vulnetix tea release <files> [--product] [--purl] [--version] [--date] [--visibility] [--pre-release] [--dry-run]`. Needs a Pro plan. |
| `config-plan` | `vulnetix config plan -o json [-f <config-path>]... [--manager] [--prune]`, then writes the plan to the job summary and, on `pull_request`, to a PR comment |
| `config-apply` | `vulnetix config apply --auto-approve [-f <config-path>]... [--manager] [--prune]`, with its output in the job summary |

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
| `result` | `success` when the task step completed. For `config-plan` and `config-apply`: `success`, `blocked` (exit 3) or `failure`. |
| `summary` | A fixed sentence per task. For `config-plan`, the plan's counts: `0 to create, 1 to update, 0 to delete, 0 unchanged`. |
| `upload-uuid` | Meant to be the uploaded report's ID (`task: upload`). |

> [!CAREFUL] upload-uuid is always empty
> The action reads `.pipelineRecord.uuid` from `vulnetix upload --json`, which now prints `snapshotUuid` and `pipelineId` instead, so the output is never set. Read the snapshot from the step log, or run `vulnetix upload --json` in a `run:` step and parse `snapshotUuid` yourself.

### config-plan and config-apply

Plan on pull requests, apply on the default branch:

```yaml
on:
  pull_request:
    paths: ['.vulnetix/config/**']
  push:
    branches: [main]
    paths: ['.vulnetix/config/**']

jobs:
  config:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: Vulnetix/cli@v4.0.0
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          config-token: ${{ secrets.VULNETIX_CONFIG_TOKEN }}
          task: ${{ github.event_name == 'pull_request' && 'config-plan' || 'config-apply' }}
```

`config-plan`:

- The job summary gets the plan as a table: one row per object with its action, `(adopt)` or `(drift)`, and the field changes, then any blocking conditions and warnings, then the counts.
- On `pull_request`, the same text goes to one PR comment, found by a hidden `<!-- vulnetix-config-plan -->` marker and updated on each push rather than added again. A fork's read-only token cannot comment; that is a warning, and the summary still has the plan.
- The step fails with the CLI's exit code: 3 when the plan has blocking conditions. The summary and the comment are written first.

`config-apply` runs `vulnetix config apply --auto-approve`. Each run plans again and applies only that fresh plan, so a push that races another push fails with a 409 rather than applying something nobody planned. Its exit codes are those of [apply](/platform-iac/cli/apply/#exit-codes).

`--manager` defaults to `gitops:<owner/repo>` from `GITHUB_REPOSITORY`, lowercased. `api-key` is not needed for these tasks; the token is read only from the environment. Both tasks need `jq` on the runner, as `upload` does.

### The action stores a project credential

With `api-key`, the action runs `vulnetix auth login --api-key ... --store project`, which writes `./.vulnetix/credentials.json` into the checkout, with the key passed on the command line. Do not upload the workspace as an artifact or cache it after the action ran, and delete the file in a final `if: always()` step. For other commands, prefer the install script with `VULNETIX_API_KEY` in `env:`, which writes nothing.

## Permissions

| Permission | Needed for |
|---|---|
| `contents: read` | Checkout |
| `security-events: write` | `github/codeql-action/upload-sarif` |
| `actions: read` | `gha upload` and the action's `gha` task, to list the run's artifacts |
| `pull-requests: read`, `issues: read` | `analyze` |
| `pull-requests: write` | The action's `config-plan` task, to comment the plan |
| `contents: write` | `gh release upload`, in its own job |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `GITHUB_TOKEN environment variable is required` | Add `env: { GITHUB_TOKEN: ${{ github.token }} }` to the step running `gha upload` or the action's `gha` task |
| The SARIF upload step fails on a clean scan | The file is written only when there are findings: guard with `hashFiles(...)` or `if-no-files-found: warn` |
| `gha upload` finds nothing | It sees only artifacts already uploaded in this run: put it in a job that `needs:` every producer, with `if: always()` |
| Results look unauthenticated | A secret name is wrong or the secret is not available to forks. Assert the source: [Precedence](/cli/authentication/precedence/#asserting-the-source-in-a-pipeline) |
| The install step fails | The runner must reach `cli.vulnetix.com` and `github.com` release downloads. Behind a proxy, set `HTTPS_PROXY` at job level. |
