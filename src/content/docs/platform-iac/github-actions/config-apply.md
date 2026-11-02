---
title: "Vulnetix/cli/config-apply action"
nav: "config-apply"
description: "The Vulnetix/cli/config-apply GitHub Action: inputs, outputs, permissions and a complete workflow with artifact upload and attestation."
order: 2
sources: [cli/config-apply/action.yml, cli/tools/actiongen/spec.go, cli/action-lib/run.sh, cli/action-lib/finish.sh, cli/docs/github-actions/config-apply.md]
checked: [cli@3e6fd831d]
updated: 03 Nov 2026
---

Installs the CLI and applies [Platform IaC](/platform-iac/) documents through the config engine with `--auto-approve`, writing the output to the job summary.

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: Vulnetix/cli/config-apply@v3
    with:
      config-token: ${{ secrets.VULNETIX_CONFIG_TOKEN }}
```

Runs `vulnetix config apply --auto-approve [-f <config-path>]... [--manager] [--prune]`. The credential is `config-token`, which reaches the CLI only as the environment variable `VULNETIX_CONFIG_TOKEN`; see [Credentials](/cli/ci-cd/github-actions/#credentials).

## Inputs

| Input | Description | Default |
|---|---|---|
| `version` | Release of the Vulnetix CLI to install: an exact tag (v3.158.0), a major channel (v3, the newest v3 release) or latest | `v3` |
| `binary-path` | Path to an already-built vulnetix binary to use instead of downloading a release | - |
| `org-id` | Vulnetix organization ID (UUID), used with api-key. Optional: without credentials the CLI runs in community mode | - |
| `api-key` | Vulnetix API key. Passed to the CLI as VULNETIX_API_KEY, never on the command line | - |
| `api-token` | Vulnetix API token; the server resolves the organization. Passed as VULNETIX_API_TOKEN | - |
| `artifact-name` | Upload every file the command wrote as a workflow artifact with this name | - |
| `fail-on-findings` | Fail the step when the command exits non-zero (findings over a gate, a breach, an error): true or false. The artifact, attestation and publish steps run either way | `true` |
| `github-token` | Token for GitHub publishing, release assets and pull request comments | `${{ github.token }}` |
| `attest` | Attest the written files with GitHub artifact attestations (needs id-token: write and attestations: write): true or false | `false` |
| `release-tag` | Attach every file the command wrote to the GitHub release with this tag (needs contents: write) | - |
| `config-token` | Config management token (vmt_...). Passed to the CLI as VULNETIX_CONFIG_TOKEN, never on the command line | - |
| `config-path` | Config documents, one file or directory per line (default: .vulnetix/config) | - |
| `config-manager` | Manager the documents are declared by (default: gitops:<owner/repo> of this repository) | - |
| `config-prune` | Delete objects this manager owns that the documents no longer declare: true or false | `false` |

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
name: Config apply
on:
  push:
    branches: [main]
    paths: ['.vulnetix/**']
concurrency:
  group: vulnetix-config
  cancel-in-progress: false
jobs:
  apply:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/config-apply@v3
        with:
          config-token: ${{ secrets.VULNETIX_CONFIG_TOKEN }}
          config-prune: false
```

`artifact-name` uploads every file the command wrote as one workflow artifact. `attest: true` attests those files with GitHub artifact attestations.

## Behaviour

- Each run plans again and applies only that fresh plan, so a push that races another push fails with a 409 instead of applying something nobody planned.
- `config-prune: true` deletes objects this manager owns that the documents no longer declare. Review a plan with it on before applying.
- Exit code 3 means the plan has blocking conditions and nothing was applied: `result` is `blocked`. The exit codes are those of [apply](/platform-iac/cli/apply/#exit-codes).
- Use `config-plan` on pull requests and this action on the default branch.
- The action needs `jq` on the runner.

## See also

- [config apply](/platform-iac/cli/apply/)
- [config-plan action](/platform-iac/github-actions/config-plan/)
- [All Vulnetix actions](/cli/ci-cd/github-actions/#an-action-for-each-command)
- [Versions and release channels](/cli/ci-cd/versions-and-channels/)
