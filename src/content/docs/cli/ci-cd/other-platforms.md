---
title: Other CI systems
description: Working pipeline snippets for the Vulnetix CLI on CircleCI, Buildkite, Tekton, Argo Workflows, AWS CodeBuild, Google Cloud Build and other CI systems.
order: 11
sources: [cli/install.sh, cli/cmd/scan.go, cli/internal/config/config.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

Every snippet runs the same four lines. The rest is how each platform supplies `VULNETIX_ORG_ID` and `VULNETIX_API_KEY` from its secret store.

```sh
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$PATH"
vulnetix auth verify
vulnetix scan --fail-on high -o dist/sbom.cdx.json -o dist/results.sarif
```

On most of these platforms the CLI reads no platform-specific pipeline context and attributes results from the git checkout (repository, commit, branch). Pods (Tekton, Argo) are detected as `kubernetes`, and Gitea and Forgejo runners as GitHub Actions. Use `--project`, `--environment` and `--tag key=value`, or the `VULNETIX_*` variables, for anything else. The images below are examples: any image with `sh`, `curl` and CA certificates works. Exit codes, gates and output files are on [CI/CD](/cli/ci-cd/overview/).

## CircleCI

Project environment variables or a context.

```yaml
version: 2.1
jobs:
  vulnetix:
    docker:
      - image: cimg/base:current
    steps:
      - checkout
      - run:
          name: Vulnetix
          command: |
            curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
            export PATH="$HOME/.local/bin:$PATH"
            vulnetix auth verify
            mkdir -p dist
            vulnetix scan --fail-on high -o dist/sbom.cdx.json -o dist/results.sarif
      - store_artifacts:
          path: dist
workflows:
  security:
    jobs:
      - vulnetix:
          context: vulnetix
```

## Buildkite

Agent environment hook or a secrets plugin.

```yaml
steps:
  - label: ":shield: Vulnetix"
    command: |
      curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
      export PATH="$HOME/.local/bin:$PATH"
      vulnetix auth verify
      mkdir -p dist
      vulnetix scan --fail-on high -o dist/sbom.cdx.json -o dist/results.sarif
    artifact_paths: "dist/*"
```

## Travis CI

Repository settings, environment variables, with "Display value in build log" off.

```yaml
language: minimal
script:
  - curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
  - export PATH="$HOME/.local/bin:$PATH"
  - vulnetix auth verify
  - vulnetix scan --fail-on high
```

## Drone

Repository secrets, mapped with `from_secret`. Secrets are not given to pull requests from forks unless the repository allows it.

```yaml
kind: pipeline
type: docker
name: security
steps:
  - name: vulnetix
    image: alpine:3.20
    environment:
      VULNETIX_ORG_ID: { from_secret: vulnetix_org_id }
      VULNETIX_API_KEY: { from_secret: vulnetix_api_key }
    commands:
      - apk add --no-cache curl ca-certificates git
      - curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
      - export PATH="$HOME/.local/bin:$PATH"
      - vulnetix auth verify
      - vulnetix scan --fail-on high
```

## Woodpecker

Repository or organisation secrets, mapped with `from_secret`.

```yaml
steps:
  - name: vulnetix
    image: alpine:3.20
    environment:
      VULNETIX_ORG_ID: { from_secret: vulnetix_org_id }
      VULNETIX_API_KEY: { from_secret: vulnetix_api_key }
    commands:
      - apk add --no-cache curl ca-certificates git
      - curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
      - export PATH="$HOME/.local/bin:$PATH"
      - vulnetix auth verify
      - vulnetix scan --fail-on high
```

## Tekton

A `Secret` read with `secretKeyRef`. The task expects the source in a workspace named `source`.

```yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: vulnetix-scan
spec:
  workspaces:
    - name: source
  steps:
    - name: scan
      image: alpine:3.20
      workingDir: $(workspaces.source.path)
      env:
        - name: VULNETIX_ORG_ID
          valueFrom: { secretKeyRef: { name: vulnetix, key: org-id } }
        - name: VULNETIX_API_KEY
          valueFrom: { secretKeyRef: { name: vulnetix, key: api-key } }
      script: |
        apk add --no-cache curl ca-certificates git
        curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
        export PATH="$HOME/.local/bin:$PATH"
        vulnetix auth verify
        vulnetix scan --fail-on high
```

## Argo Workflows

A `Secret` read with `secretKeyRef`. Each template runs in its own pod: install in the template that scans, or use an image with the CLI ([Containers](/cli/ci-cd/containers/)).

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: vulnetix-scan-
spec:
  entrypoint: scan
  templates:
    - name: scan
      inputs:
        artifacts:
          - name: source
            path: /src
            git: { repo: "https://github.com/acme/api.git", depth: 1 }
      container:
        image: alpine:3.20
        workingDir: /src
        command: [sh, -c]
        args:
          - |
            apk add --no-cache curl ca-certificates git
            curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
            export PATH="$HOME/.local/bin:$PATH"
            vulnetix auth verify
            vulnetix scan --fail-on high
        env:
          - name: VULNETIX_ORG_ID
            valueFrom: { secretKeyRef: { name: vulnetix, key: org-id } }
          - name: VULNETIX_API_KEY
            valueFrom: { secretKeyRef: { name: vulnetix, key: api-key } }
```

## AWS CodeBuild

Secrets Manager or Parameter Store, referenced from `env`. CodeBuild echoes commands, so keep keys out of command lines.

```yaml
version: 0.2
env:
  secrets-manager:
    VULNETIX_ORG_ID: vulnetix:org-id
    VULNETIX_API_KEY: vulnetix:api-key
phases:
  install:
    commands:
      - curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
  build:
    commands:
      - export PATH="$HOME/.local/bin:$PATH"
      - vulnetix auth verify
      - mkdir -p dist
      - vulnetix scan --fail-on high -o dist/sbom.cdx.json -o dist/results.sarif
artifacts:
  files: ["dist/**/*"]
```

`vulnetix:org-id` is `<secret name>:<JSON key>`.

## Google Cloud Build

Secret Manager, through `availableSecrets` and `secretEnv`. In the script, write `$$VAR` so Cloud Build does not substitute it.

```yaml
steps:
  - name: alpine:3.20
    entrypoint: sh
    args:
      - -c
      - |
        apk add --no-cache curl ca-certificates git
        curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir /workspace/.bin
        export PATH="/workspace/.bin:$$PATH"
        vulnetix auth verify
        vulnetix scan --fail-on high
    secretEnv: [VULNETIX_ORG_ID, VULNETIX_API_KEY]
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/vulnetix-org-id/versions/latest
      env: VULNETIX_ORG_ID
    - versionName: projects/$PROJECT_ID/secrets/vulnetix-api-key/versions/latest
      env: VULNETIX_API_KEY
```

## Harness CI

Harness secrets, referenced with `<+secrets.getValue("...")>` in the step's `envVariables`.

```yaml
- step:
    type: Run
    name: Vulnetix
    identifier: vulnetix
    spec:
      shell: Sh
      envVariables:
        VULNETIX_ORG_ID: <+secrets.getValue("vulnetix_org_id")>
        VULNETIX_API_KEY: <+secrets.getValue("vulnetix_api_key")>
      command: |
        curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
        export PATH="$HOME/.local/bin:$PATH"
        vulnetix auth verify
        vulnetix scan --fail-on high
```

## Codefresh

Pipeline variables marked encrypted, or shared configuration.

```yaml
version: "1.0"
steps:
  vulnetix:
    title: Vulnetix
    image: alpine:3.20
    working_directory: "${{main_clone}}"
    commands:
      - apk add --no-cache curl ca-certificates git
      - curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
      - export PATH="$HOME/.local/bin:$PATH"
      - vulnetix auth verify
      - vulnetix scan --fail-on high
```

## TeamCity

Parameters of type password, named `env.VULNETIX_ORG_ID` and `env.VULNETIX_API_KEY` so they reach the environment. A Command Line build step:

```sh
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$PATH"
vulnetix auth verify
mkdir -p dist
vulnetix scan --fail-on high -o dist/sbom.cdx.json -o dist/results.sarif
```

Set **Artifact paths** to `dist => vulnetix`.

## Bamboo

Plan variables whose names contain `password` or `secret` are masked. Bamboo exports variables as `bamboo_<name>`, so map them in a Script task:

```sh
export VULNETIX_ORG_ID="$bamboo_vulnetix_org_id"
export VULNETIX_API_KEY="$bamboo_vulnetix_api_key_password"
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$PATH"
vulnetix auth verify
vulnetix scan --fail-on high
```

## Gitea Actions and Forgejo Actions

Repository or organisation secrets, with GitHub Actions syntax. The workflow lives in `.gitea/workflows/` (Gitea) or `.forgejo/workflows/` (Forgejo).

```yaml
name: Vulnetix
on: [push, pull_request]
jobs:
  scan:
    runs-on: ubuntu-latest
    env:
      VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
      VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - run: |
          curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
          export PATH="$HOME/.local/bin:$PATH"
          vulnetix auth verify
          vulnetix scan --fail-on high
```

Their runners set the `GITHUB_*` variables, so the CLI detects them as GitHub Actions. `gha upload` is built on the GitHub artifacts API; to publish other tools' reports here, use `vulnetix upload --file`.

## Spacelift

Environment variables on the stack or a context, marked secret (write-only). As a `before_plan` hook, so a breach stops the run before `terraform plan`:

```sh
curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
export PATH="$HOME/.local/bin:$PATH"
vulnetix auth verify
vulnetix iac --fail-on high
```

## Semaphore

A secret attached to the block exports its variables.

```yaml
version: v1.0
name: Vulnetix
agent:
  machine:
    type: e1-standard-2
    os_image: ubuntu2204
blocks:
  - name: Security
    task:
      secrets:
        - name: vulnetix
      jobs:
        - name: scan
          commands:
            - checkout
            - curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
            - export PATH="$HOME/.local/bin:$PATH"
            - vulnetix auth verify
            - vulnetix scan --fail-on high
```

## Buddy

Pipeline or workspace variables marked encrypted.

```yaml
- pipeline: Vulnetix
  on: EVENT
  events:
    - type: PUSH
      refs: ["refs/heads/*"]
  actions:
    - action: Vulnetix scan
      type: BUILD
      docker_image_name: library/alpine
      docker_image_tag: "3.20"
      execute_commands:
        - apk add --no-cache curl ca-certificates git
        - curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
        - export PATH="$HOME/.local/bin:$PATH"
        - vulnetix auth verify
        - vulnetix scan --fail-on high
```

## Earthly

`RUN --secret` mounts a value for one command and never stores it in a layer. Pass them with `earthly --secret VULNETIX_ORG_ID --secret VULNETIX_API_KEY +vulnetix-scan`.

```dockerfile
VERSION 0.8
FROM alpine:3.20

vulnetix-scan:
    RUN apk add --no-cache curl ca-certificates git
    RUN curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir /usr/local/bin
    WORKDIR /workspace
    COPY . .
    RUN --secret VULNETIX_ORG_ID --secret VULNETIX_API_KEY vulnetix scan --fail-on high
```

## Dagger

Secrets go in with `with_secret_variable`, which keeps them out of the cache key and logs. Python SDK:

```python
import dagger
from dagger import dag, function, object_type

@object_type
class Vulnetix:
    @function
    async def scan(self, source: dagger.Directory, org_id: dagger.Secret, api_key: dagger.Secret) -> str:
        return await (
            dag.container().from_("alpine:3.20")
            .with_exec(["apk", "add", "--no-cache", "curl", "ca-certificates", "git"])
            .with_exec(["sh", "-c", "curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir /usr/local/bin"])
            .with_secret_variable("VULNETIX_ORG_ID", org_id)
            .with_secret_variable("VULNETIX_API_KEY", api_key)
            .with_directory("/workspace", source)
            .with_workdir("/workspace")
            .with_exec(["vulnetix", "scan", "--fail-on", "high"])
            .stdout()
        )
```

`dagger call scan --source=. --org-id=env:VULNETIX_ORG_ID --api-key=env:VULNETIX_API_KEY`

## Depot

`depot build` accepts BuildKit secrets, so the Earthly-style pattern works in a Dockerfile:

```dockerfile
# syntax=docker/dockerfile:1
FROM alpine:3.20
RUN apk add --no-cache curl ca-certificates git \
 && curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir /usr/local/bin
WORKDIR /workspace
COPY . .
RUN --mount=type=secret,id=vulnetix_org_id --mount=type=secret,id=vulnetix_api_key \
    VULNETIX_ORG_ID="$(cat /run/secrets/vulnetix_org_id)" \
    VULNETIX_API_KEY="$(cat /run/secrets/vulnetix_api_key)" \
    vulnetix scan --fail-on high
```

```sh
depot build --secret id=vulnetix_org_id,env=VULNETIX_ORG_ID --secret id=vulnetix_api_key,env=VULNETIX_API_KEY .
```
