---
title: Azure Pipelines
nav: Azure DevOps
description: Run Vulnetix in Azure Pipelines with secrets from a variable group or Key Vault mapped into the step, gates, SARIF artifacts and soft failure.
order: 7
sources: [cli/internal/config/config.go, cli/install.sh, cli/cmd/scan.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

## Secrets

Create a variable group (**Pipelines > Library**), for example `vulnetix`, with `VULNETIX_ORG_ID` and `VULNETIX_API_KEY`, the key marked secret. A group can also be linked to Azure Key Vault.

> [!CAREFUL] Secret variables are not in the environment
> Azure Pipelines does not export secret variables to scripts. Map each one with `env:` on the step, or the CLI runs as community and nothing is published.

## Quick start

`azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include: [main]
pr:
  branches:
    include: ['*']

pool:
  vmImage: ubuntu-latest

variables:
  - group: vulnetix

steps:
  - checkout: self
  - bash: |
      curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
      echo "##vso[task.prependpath]$HOME/.local/bin"
    displayName: Install Vulnetix CLI
  - bash: |
      vulnetix auth verify
      mkdir -p "$(Build.ArtifactStagingDirectory)/vulnetix"
      vulnetix scan --fail-on high \
        -o "$(Build.ArtifactStagingDirectory)/vulnetix/sbom.cdx.json" \
        -o "$(Build.ArtifactStagingDirectory)/vulnetix/results.sarif"
    displayName: Vulnetix scan
    env:
      VULNETIX_ORG_ID: $(VULNETIX_ORG_ID)
      VULNETIX_API_KEY: $(VULNETIX_API_KEY)
  - task: PublishBuildArtifacts@1
    condition: always()
    inputs:
      PathtoPublish: $(Build.ArtifactStagingDirectory)/vulnetix
      ArtifactName: CodeAnalysisLogs
```

An artifact named `CodeAnalysisLogs` holding `.sarif` files is what the Microsoft Security DevOps **SARIF SAST Scans Tab** extension reads, if you have it installed.

On Windows agents (`vmImage: windows-latest`) the `bash` step runs Git Bash. The install script there saves the Windows binary as `vulnetix`, without `.exe`, which Git Bash runs but PowerShell and cmd do not; for those, download `vulnetix-windows-amd64.exe` from the release (see [Install](/cli/get-started/install/#release-assets)).

## Soft failure

```yaml
  - bash: vulnetix scan --fail-on high
    displayName: Vulnetix gate (report only)
    continueOnError: true
    env:
      VULNETIX_ORG_ID: $(VULNETIX_ORG_ID)
      VULNETIX_API_KEY: $(VULNETIX_API_KEY)
```

The step shows as succeeded with issues; the run is not failed.

## Pipeline context

The CLI detects Azure Pipelines from `TF_BUILD=True`, `AZURE_HTTP_USER_AGENT` or `SYSTEM_TEAMFOUNDATIONCOLLECTIONURI`, and reads `BUILD_REPOSITORY_NAME`, `SYSTEM_TEAMPROJECT`, `BUILD_BUILDID`, `BUILD_BUILDNUMBER`, `BUILD_SOURCEVERSION`, `BUILD_SOURCEBRANCHNAME`, `SYSTEM_PULLREQUEST_SOURCEBRANCH`, `SYSTEM_PULLREQUEST_TARGETBRANCH` and `BUILD_REASON` to attribute results.

## A reusable template

`templates/vulnetix.yml`:

```yaml
parameters:
  - name: command
    type: string
    default: scan --fail-on high

steps:
  - bash: |
      curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
      echo "##vso[task.prependpath]$HOME/.local/bin"
    displayName: Install Vulnetix CLI
  - bash: vulnetix ${{ parameters.command }}
    displayName: vulnetix ${{ parameters.command }}
    env:
      VULNETIX_ORG_ID: $(VULNETIX_ORG_ID)
      VULNETIX_API_KEY: $(VULNETIX_API_KEY)
```

```yaml
variables:
  - group: vulnetix
steps:
  - template: templates/vulnetix.yml
    parameters:
      command: sca --fail-on high,kev
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `auth verify` fails with no credentials | The secrets are not mapped with `env:` on that step |
| `vulnetix: command not found` in a later step | `##vso[task.prependpath]` applies to later steps only, not the step that sets it |
| Behind a proxy | Set `HTTPS_PROXY` and `NO_PROXY` as pipeline variables |
