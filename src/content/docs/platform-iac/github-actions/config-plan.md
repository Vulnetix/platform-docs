---
title: "Vulnetix/cli/config-plan action"
nav: "config-plan"
description: "The Vulnetix/cli/config-plan GitHub Action: inputs, outputs, permissions and a complete workflow with artifact upload and attestation."
order: 1
sources: [cli/config-plan/action.yml, cli/tools/actiongen/spec.go, cli/action-lib/run.sh, cli/action-lib/finish.sh, cli/docs/github-actions/config-plan.md]
checked: [cli@v4.0.0]
updated: 03 Nov 2026
---

Installs the CLI, plans the [Platform IaC](/platform-iac/) documents against the config engine, writes the plan to the job summary and, on a pull request, to one comment. With `validate-only: true` it runs [`vulnetix config validate`](/platform-iac/cli/validate/) offline instead.

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: Vulnetix/cli/config-plan@v4
    with:
      org-id: ${{ secrets.VULNETIX_ORG_ID }}
      api-key: ${{ secrets.VULNETIX_API_KEY }}
```

Runs `vulnetix config plan -o json [-f <config-path>]... [--manager] [--prune]`. The credential is the ApiKey of a `developer` or `owner` service account (`org-id` and `api-key`), or an Authentik access token in `api-token`. They reach the CLI only as environment variables. See [Credentials](/cli/ci-cd/github-actions/#credentials).

## Inputs

| Input | Description | Default |
|---|---|---|
| `version` | Release of the Vulnetix CLI to install: an exact tag (v4.0.0), a major channel (v4, the newest v4 release) or latest | `v4` |
| `binary-path` | Path to an already-built vulnetix binary to use instead of downloading a release | - |
| `org-id` | Vulnetix organization ID (UUID), used with api-key. Optional: without credentials the CLI runs in community mode | - |
| `api-key` | Vulnetix API key. Passed to the CLI as VULNETIX_API_KEY, never on the command line | - |
| `api-token` | Vulnetix API token; the server resolves the organization. Passed as VULNETIX_API_TOKEN | - |
| `artifact-name` | Upload every file the command wrote as a workflow artifact with this name | - |
| `fail-on-findings` | Fail the step when the command exits non-zero (findings over a gate, a breach, an error): true or false. The artifact, attestation and publish steps run either way | `true` |
| `github-token` | Token for GitHub publishing, release assets and pull request comments | `${{ github.token }}` |
| `attest` | Attest the written files with GitHub artifact attestations (needs id-token: write and attestations: write): true or false | `false` |
| `release-tag` | Attach every file the command wrote to the GitHub release with this tag (needs contents: write) | - |
| `config-path` | Config documents, one file or directory per line (default: .vulnetix/config) | - |
| `config-manager` | Manager the documents are declared by (default: gitops:<owner/repo> of this repository) | - |
| `config-prune` | Delete objects this manager owns that the documents no longer declare: true or false | `false` |
| `validate-only` | Validate the documents offline (vulnetix config validate) instead of planning: true or false | `false` |

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
- `pull-requests: write` to comment the plan on a pull request

## Example workflow

```yaml
name: Config plan
on:
  pull_request:
    paths: ['.vulnetix/**']
jobs:
  plan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write     # the plan comment
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/config-plan@v4
        id: plan
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
      - name: Show the counts
        if: ${{ !cancelled() }}
        env:
          RESULT: ${{ steps.plan.outputs.result }}
          SUMMARY: ${{ steps.plan.outputs.summary }}
        run: echo "$RESULT: $SUMMARY"
```

`artifact-name` uploads every file the command wrote as one workflow artifact. `attest: true` attests those files with GitHub artifact attestations.

## Behaviour

- The credential is `org-id` and `api-key` (the ApiKey of a `developer` or `owner` service account), or `api-token`, passed as environment variables and never on the command line. A `member` service account is refused with HTTP 403.
- `config-path` is one file or directory per line, each passed as `-f`. With none, no `-f` is passed and the CLI reads its defaults: `.vulnetix/config` and, with CLI v4, the well-known files. `config-manager` defaults to `gitops:<owner/repo>`, lowercased, from `GITHUB_REPOSITORY`.
- The job summary gets the plan as a table, then blocking conditions and warnings, then the counts. On `pull_request` the same text goes to one comment that starts with `<!-- vulnetix-config-plan -->`; each push updates that comment instead of adding another. A fork's read-only token cannot comment: that is a warning and the summary still has the plan.
- `result` is `success`, `blocked` (exit code 3, the plan has blocking conditions) or `failure`. `summary` is the plan's counts, for example `0 to create, 1 to update, 0 to delete, 0 unchanged`.
- Which files are read: [Which files are Platform IaC documents](/platform-iac/cli/validate/#which-files-are-platform-iac-documents). With no `config-path`, `plan` reads `.vulnetix/config` and the well-known files from CLI v4.0.0 (v3 read `.vulnetix/config` only). Any `config-path` is passed as `-f`, which reads only what it names. See [Migrating from v3 to v4](/cli/get-started/migrating-to-v4/).
- The action needs `jq` on the runner.

## See also

- [config plan](/platform-iac/cli/plan/)
- [config-apply action](/platform-iac/github-actions/config-apply/)
- [config validate](/platform-iac/cli/validate/)
- [All Vulnetix actions](/cli/ci-cd/github-actions/#an-action-for-each-command)
- [Versions and release channels](/cli/ci-cd/versions-and-channels/)
