---
title: "GitLab CI/CD"
nav: "GitLab CI"
description: "Run Vulnetix in GitLab pipelines: credentials as CI/CD variables, a shared job template, gates, artifacts and reports, and the pipeline context the CLI reads."
order: 5
sources: [cli/internal/config/config.go, cli/install.sh, cli/cmd/scan.go, cli/cmd/exit_codes.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

## Variables

Under **Settings > CI/CD > Variables**, add `VULNETIX_ORG_ID` and `VULNETIX_API_KEY`. Mark the key **Masked** and **Protected** (protected variables reach only protected branches and tags; leave it unprotected if merge request pipelines must publish). GitLab exports variables to every job, so no `auth login` step is needed.

## Quick start

`.gitlab-ci.yml`:

```yaml
stages: [security]

vulnetix:
  stage: security
  image: alpine:3.20
  before_script:
    - apk add --no-cache curl ca-certificates git
    - curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
    - export PATH="$HOME/.local/bin:$PATH"
    - vulnetix auth verify
  script:
    - mkdir -p dist
    - vulnetix scan --fail-on high -o dist/sbom.cdx.json -o dist/results.sarif
  artifacts:
    when: always
    expire_in: 7 days
    paths:
      - dist/
```

`artifacts:when: always` keeps the files when the gate fails the job, which is when you need them. The SARIF file exists only when there are findings; a missing path in `paths` produces a warning, not a failure.

## The CLI reads the pipeline context itself

The CLI detects GitLab from `GITLAB_CI` or `CI_JOB_ID` and attributes results from the predefined variables. Nothing needs passing.

| Read | For |
|---|---|
| `CI_PROJECT_PATH`, `CI_PROJECT_NAMESPACE`, `CI_PROJECT_DIR` | Project |
| `CI_PIPELINE_ID`, `CI_PIPELINE_IID`, `CI_JOB_ID`, `CI_PIPELINE_SOURCE` | Pipeline and job |
| `CI_COMMIT_SHA`, `CI_COMMIT_REF_NAME`, `CI_COMMIT_TAG` | Commit, branch, tag |
| `CI_MERGE_REQUEST_SOURCE_BRANCH_NAME`, `CI_MERGE_REQUEST_TARGET_BRANCH_NAME` | Merge request |
| `CI_SERVER_URL`, `CI_SERVER_VERSION` | Instance |
| `CI_ENVIRONMENT_NAME` | `--environment` default |
| `CI_PROJECT_NAME` | `--project` default |

## One job per scanner

```yaml
.vulnetix:
  stage: security
  image: alpine:3.20
  before_script:
    - apk add --no-cache curl ca-certificates git
    - curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
    - export PATH="$HOME/.local/bin:$PATH"
    - mkdir -p dist
  artifacts:
    when: always
    expire_in: 7 days
    paths: [dist/]

sca:
  extends: .vulnetix
  script: [vulnetix sca --fail-on high -o dist/sbom.cdx.json]

sast:
  extends: .vulnetix
  script: [vulnetix sast --fail-on high -o dist/sast.sarif]

secrets:
  extends: .vulnetix
  script: [vulnetix secrets -o dist/secrets.sarif]

iac:
  extends: .vulnetix
  script: [vulnetix iac -o dist/iac.sarif]

license:
  extends: .vulnetix
  script:
    - vulnetix license --allow MIT,Apache-2.0,BSD-3-Clause
    - cp .vulnetix/sbom.cdx.json dist/licenses.cdx.json

cbom:
  extends: .vulnetix
  script: [vulnetix cbom --output-file dist/cbom.cdx.json]
```

Jobs in the same stage run in parallel. `license` takes no file output flag: copy `.vulnetix/sbom.cdx.json`, or print SPDX with `-o json-spdx`. `malscan` needs the installed dependencies, so run it in the job that installs them.

## GitLab reports

CycloneDX files can also be declared as a report for GitLab's own dependency features:

```yaml
sca:
  extends: .vulnetix
  script: [vulnetix sca -o dist/sbom.cdx.json]
  artifacts:
    when: always
    paths: [dist/sbom.cdx.json]
    reports:
      cyclonedx: [dist/sbom.cdx.json]
```

What GitLab does with a `cyclonedx` report depends on your GitLab tier. Keep `paths` as well, which works on every tier. `artifacts:reports:sast` expects GitLab's own report schema, not SARIF: do not point it at a Vulnetix SARIF file.

## Gates and soft failure

```yaml
vulnetix-gate:
  extends: .vulnetix
  script: [vulnetix scan --fail-on high,kev,malware --jail]
  allow_failure:
    exit_codes: [3]
```

`allow_failure: exit_codes: [3]` lets a jail gate that could not decide warn, while a breach (`1`) still fails. Use `allow_failure: true` to report every breach without blocking. See [Exit codes](/cli/reference/exit-codes/).

## Sharing one setup

Put the `.vulnetix` template in a central project and include it:

```yaml
include:
  - project: acme/ci-templates
    ref: main
    file: /vulnetix.gitlab-ci.yml

sca:
  extends: .vulnetix
  script: [vulnetix sca --fail-on high -o dist/sbom.cdx.json]
```

Set `VULNETIX_ORG_ID` and `VULNETIX_API_KEY` once as group-level variables to cover every project in the group.

## Releases

Attach the SBOM to a GitLab release on tag pipelines:

```yaml
release:
  stage: .post
  image: registry.gitlab.com/gitlab-org/release-cli:latest
  rules: [{ if: $CI_COMMIT_TAG }]
  needs: [{ job: sca, artifacts: true }]
  script: [echo "release $CI_COMMIT_TAG"]
  release:
    tag_name: $CI_COMMIT_TAG
    description: "Release $CI_COMMIT_TAG"
    assets:
      links:
        - name: sbom.cdx.json
          url: "$CI_PROJECT_URL/-/jobs/artifacts/$CI_COMMIT_TAG/raw/dist/sbom.cdx.json?job=sca"
```

There is no GitLab equivalent of `gha upload`: to publish another tool's report, run `vulnetix upload --file <report>` in the job that produced it.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `apk: not found` | The image is not Alpine: use `apt-get install -y curl ca-certificates` |
| Results look unauthenticated on merge request pipelines | The variables are Protected and the branch is not. Unprotect them or protect the branch. |
| `vulnetix: not found` in `script` | `export PATH` in `before_script` applies to `script` in the same job only; repeat it in jobs that do not extend the template |
| Artifacts missing after a failed gate | Add `artifacts:when: always` |
