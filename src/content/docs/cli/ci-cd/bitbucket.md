---
title: Bitbucket Pipelines
nav: Bitbucket
description: Run Vulnetix in Bitbucket Pipelines with secured repository variables, parallel scanner steps, gates and artifacts.
order: 6
sources: [cli/internal/config/config.go, cli/install.sh, cli/cmd/scan.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

## Variables

Under **Repository settings > Repository variables**, add `VULNETIX_ORG_ID` and `VULNETIX_API_KEY`, with **Secured** ticked for the key. Workspace variables cover every repository; deployment variables cover one environment. All are exported to the step's shell.

## Quick start

`bitbucket-pipelines.yml`:

```yaml
image: alpine:3.20

definitions:
  steps:
    - step: &vulnetix
        name: Vulnetix scan
        script:
          - apk add --no-cache curl ca-certificates git
          - curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
          - export PATH="$HOME/.local/bin:$PATH"
          - vulnetix auth verify
          - mkdir -p dist
          - vulnetix scan --fail-on high -o dist/sbom.cdx.json -o dist/results.sarif
        artifacts:
          - dist/**

pipelines:
  default:
    - step: *vulnetix
  pull-requests:
    '**':
      - step: *vulnetix
```

## Parallel scanners

```yaml
pipelines:
  default:
    - parallel:
        steps:
          - step:
              name: SCA
              script:
                - apk add --no-cache curl ca-certificates git
                - curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
                - export PATH="$HOME/.local/bin:$PATH"
                - vulnetix sca --fail-on high -o sbom.cdx.json
          - step:
              name: SAST
              script:
                - apk add --no-cache curl ca-certificates git
                - curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
                - export PATH="$HOME/.local/bin:$PATH"
                - vulnetix sast --fail-on high -o sast.sarif
```

## Pipeline context

The CLI detects Bitbucket from `BITBUCKET_BUILD_NUMBER` or `BITBUCKET_COMMIT` and reads `BITBUCKET_REPO_FULL_NAME`, `BITBUCKET_REPO_OWNER`, `BITBUCKET_COMMIT`, `BITBUCKET_BRANCH`, `BITBUCKET_TAG`, `BITBUCKET_PR_ID`, `BITBUCKET_PR_DESTINATION_BRANCH`, `BITBUCKET_PIPELINE_UUID` and `BITBUCKET_STEP_UUID` to attribute results.

## Gates

A gate exits `1` and fails the step. To report a breach without failing the pipeline, catch the code:

```yaml
          - vulnetix scan --fail-on high -o dist/sbom.cdx.json || echo "gate breached (exit $?)"
```

Exit `3` from `--jail` means the gate could not decide; see [Exit codes](/cli/reference/exit-codes/).

## Third-party reports

`vulnetix upload --file <report>` in the step that produced it; see [upload](/cli/commands/upload/).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Results look unauthenticated | The variables are not available to that pipeline (deployment variables reach only steps with a matching `deployment:`). Check with `vulnetix auth status`. |
| Step runs out of memory on a large repository | Use `size: 2x` on the step; the CLI sets a soft Go memory limit at 75% of the container limit |
| `vulnetix: not found` | Each step is a fresh container: install in every step, or build an image with the CLI |
