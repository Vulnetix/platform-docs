---
title: gha upload, status and setup
nav: gha upload and status
description: Publish every scanner report a GitHub Actions run produced, check what was recorded, and generate the scanner workflow.
order: 4
sources: [cli/cmd/gha.go, cli/cmd/gha_submit.go, cli/cmd/gha_setup.go, cli/internal/ghasetup/render.go, cli/internal/github]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

The posture subcommands (`gha workflows`, `actions`, `settings`, `org`, `audit`) are on [GitHub posture commands](/cli/commands/gha/).

## gha upload

```sh
vulnetix gha upload [--org-id <uuid>] [flags]
```

Lists the current run's artifacts, downloads and extracts each, classifies every file as SARIF, CycloneDX or SPDX, validates it, and publishes it to Vulnetix in the category the report implies, under the tool that produced it (a gosec report is recorded as gosec). It then prints the ingestion snapshot for each file.

| Flag | Default | Effect |
|---|---|---|
| `--org-id <uuid>` | the credential's org | Organisation to publish to. With no credential and no flag: `--org-id is required (no stored credentials found)`. |
| `--json` | off | One JSON result per file: `name`, `file`, `status` (`uploaded`, `duplicate`, `skipped`, `error`), `reason`, `format`, `category`, `tool`, `toolVersion`, `findings`, `snapshotUuid`, `snapshotUrl` |
| `--dry-run` | off | Classify and validate, publish nothing |
| `--strict` | off | Count skipped files (unrecognised formats) as failures |
| `--fail-on-empty` | off | Fail when the run produced no publishable artifact. Without it, an empty run succeeds. |
| `--no-github-api` | off | Do not call the GitHub REST API to enrich the CI context |

It reads `GITHUB_TOKEN` (required), `GITHUB_REPOSITORY`, `GITHUB_RUN_ID` and `GITHUB_API_URL` from the environment. Reports written by Vulnetix's own scanners are skipped: the command that wrote them published them when it ran.

**It exits `1` if any file fails to publish.** A file that cannot be published says why, for example an empty SARIF left by a shell redirect that captured nothing.

### Permissions and placement

```yaml
  publish:
    runs-on: ubuntu-latest
    needs: [gosec, trivy-fs]       # every job that uploads an artifact
    if: always()                   # one failing scanner must not stop the others publishing
    permissions:
      contents: read
      actions: read                # to list the run's artifacts
    env:
      VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
      VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
    steps:
      - name: Install Vulnetix CLI
        run: |
          curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"
      - name: Publish scanner reports
        env:
          GITHUB_TOKEN: ${{ github.token }}
        run: vulnetix gha upload --org-id "$VULNETIX_ORG_ID" --json --no-banner --no-progress
```

`needs` and `if: always()` both matter, and both fail silently when wrong: a job missing from `needs` may finish after the publish job and is never sent, and without `always()` one failed scanner stops every other report being published.

### Re-runs

Each report is keyed by run, attempt and tool. Re-running the publish job reuses the existing scan instead of recording it twice; a new run attempt is a new scan.

## gha status

```sh
vulnetix gha status                        # the current run, inside a workflow
vulnetix gha status --run-id 30155614396
vulnetix gha status --run-id 30155614396 --attempt 2 --json
vulnetix gha status --uuid <ingestion-snapshot-uuid>
```

Reports every tool the run published, its version, the category it was filed under and how many findings it contributed. A tool you set up that is missing from the list did not publish: run this after changing a pipeline rather than trusting a green check.

| Flag | Default | Effect |
|---|---|---|
| `--run-id <id>` | `GITHUB_RUN_ID` | Workflow run to report on |
| `--attempt <n>` | `GITHUB_RUN_ATTEMPT` | One attempt only |
| `--uuid <uuid>` | | One ingestion snapshot instead of a run |
| `--json` | off | JSON output |

## gha setup

```sh
vulnetix gha setup --list
vulnetix gha setup --detect
vulnetix gha setup gosec trivy-fs checkov
vulnetix gha setup --all --dry-run
```

Writes or updates `.github/workflows/vulnetix-scanners.yml`: one job per scanner that uploads its report as an artifact, and the publish job above. Running it again for another tool adds that tool and keeps the others. The CLI is installed unpinned in the generated workflow; the scanners are pinned.

| Flag | Default | Effect |
|---|---|---|
| `[tool...]` | | Scanner IDs from `--list` |
| `--list` | | List the catalogue |
| `--detect` | | Pick the scanners this repository can feed (a Go module gets gosec and govulncheck, a Dockerfile gets hadolint and the image scanners, language-agnostic ones always). Tools that need a credential or a live target (Snyk, ZAP, Nuclei) are never picked. |
| `--all` | | Every scanner in the catalogue |
| `--on <events>` | `push,workflow_dispatch` | Triggers: `push`, `pull_request`, `schedule`, `workflow_dispatch` |
| `--cron <expr>` | a weekly slot derived from the repository name | Schedule, when `--on` includes `schedule` |
| `--runs-on <labels>` | `ubuntu-latest` | Runner labels, e.g. `self-hosted,Linux,X64` |
| `--dry-run` | | Print the workflow instead of writing it |
| `--force` | | Replace an existing workflow not written by this command |

Every scanner, and the exact job it adds, is on [Third-party scanners](/cli/ci-cd/third-party-scanners/).

## gha init

```sh
vulnetix gha init [path] [--check] [--dry-run] [--force] [--ref <ref>] [--triggers pr|push|belai] [--runner <label>]
```

Writes a repository's managed `.github/workflows/vulnetix.yml` from what it contains and `.vulnetix/workflow.yaml`, using the [granular actions](/cli/ci-cd/granular-actions/). `--check` writes nothing and exits 1 when the workflow has drifted from the policy. `--triggers` and `--runner` apply when there is no policy file yet.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `GITHUB_TOKEN environment variable is required` | Add `GITHUB_TOKEN: ${{ github.token }}` to the step's `env`; it is not in the environment by default |
| `no artifacts found` | The publish job ran before the scanners finished, or they are missing from `needs`. Add `--fail-on-empty` to make this fail the job. |
| A tool is missing from `gha status` | Its artifact was absent, empty or not SARIF, CycloneDX or SPDX. `gha upload --json` names the file and the reason. |
| `--org-id is required` | Set `VULNETIX_ORG_ID` and `VULNETIX_API_KEY` on the job |
