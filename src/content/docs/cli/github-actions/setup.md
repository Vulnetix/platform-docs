---
title: "Vulnetix/cli/setup action"
nav: "setup"
description: "The Vulnetix/cli/setup GitHub Action: inputs, outputs, permissions and a complete workflow with artifact upload and attestation."
order: 1
sources: [cli/setup/action.yml, cli/tools/actiongen/spec.go, cli/action-lib/run.sh, cli/action-lib/finish.sh, cli/docs/github-actions/setup.md]
checked: [cli@3e6fd831d]
updated: 03 Nov 2026
---

Installs the Vulnetix CLI and adds it to `PATH` for the later steps of the job. It runs no command, takes no credentials and writes no files. Use it when a step needs a `vulnetix` command that none of the per-command actions covers, or when several `run:` steps share one install.

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: Vulnetix/cli/setup@v3
```

Runs no command.

## Inputs

| Input | Description | Default |
|---|---|---|
| `version` | Release of the Vulnetix CLI to install: an exact tag (v3.158.0), a major channel (v3, the newest v3 release) or latest | `v3` |
| `binary-path` | Path to an already-built vulnetix binary to use instead of downloading a release | - |

## Outputs

| Output | Description |
|---|---|
| `version` | The installed CLI version |

## Permissions

- `contents: read` to check out the repository

## Example workflow

```yaml
name: Vulnetix
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
  id-token: write
  attestations: write
jobs:
  scan:
    runs-on: ubuntu-latest
    env:
      VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
      VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
    steps:
      - uses: actions/checkout@v5
      - uses: Vulnetix/cli/setup@v3
      - run: vulnetix auth verify
      - name: Scan
        run: |
          mkdir -p dist
          vulnetix scan --fail-on high -o dist/sbom.cdx.json -o dist/results.sarif
      - uses: actions/upload-artifact@v7
        if: ${{ !cancelled() }}
        with:
          name: vulnetix
          path: dist/
          if-no-files-found: warn
      - uses: actions/attest-build-provenance@v4
        if: ${{ hashFiles('dist/sbom.cdx.json') != '' }}
        with:
          subject-path: dist/sbom.cdx.json
```

## Behaviour

- The binary goes to `$RUNNER_TEMP/vulnetix-bin`, which is appended to `$GITHUB_PATH`. The action sets `VULNETIX_CLI_INSTALLED` in `$GITHUB_ENV`, so a second Vulnetix action in the same job that asks for the same `version` skips the download.
- `version` takes an exact tag (`v3.164.1`), a major channel (`v3`, the newest v3 release) or `latest`. The default is `v3`. See [Versions and release channels](/cli/ci-cd/versions-and-channels/).
- `binary-path` copies a binary you built earlier in the job instead of downloading a release.
- The installer is the `install.sh` shipped at the action's ref. It verifies the binary against the release checksums.
- Credentials are not inputs here. Give them to the steps that run commands, as `env:`, so they exist only where they are used.

## See also

- [GitHub Actions](/cli/ci-cd/github-actions/): the root action and the install-script pattern
- [CI/CD overview](/cli/ci-cd/overview/)
- [All Vulnetix actions](/cli/ci-cd/github-actions/#an-action-for-each-command)
- [Versions and release channels](/cli/ci-cd/versions-and-channels/)
