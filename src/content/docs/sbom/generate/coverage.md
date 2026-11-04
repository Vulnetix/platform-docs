---
title: Discovery coverage
description: The CI/CD files, shell scripts, recipe files and binary formats vulnetix cdx reads for packages, and how container binaries are attributed to their package.
order: 2
nav: Discovery coverage
sources: [cli/cmd/cdx.go, cli/internal/scan/detector.go, cli/internal/binpkg/binpkg.go, cli/internal/binpkg/jar.go, vdb-sca-match/parse/local_extra.go]
checked: [cli@4c8c3b71c, vdb-sca-match@ec6757e]
updated: 02 Nov 2026
---

## CI/CD pipeline files

Pipeline files are parsed for package-manager install commands. GitHub Actions family workflows also contribute their `uses:` pins as `github-actions` packages. Skip all of this with `--no-ci`.

| Matched by | Files |
|---|---|
| Exact name | `.gitlab-ci.yml`/`.yaml`, `.travis.yml`/`.yaml`, `azure-pipelines.yml`/`.yaml`, `bitbucket-pipelines.yml`/`.yaml`, `buildspec.yml`/`.yaml` (AWS CodeBuild), `cloudbuild.yml`/`.yaml` (Google Cloud Build), `codefresh.yml`/`.yaml`, `appveyor.yml`/`.yaml`, `semaphore.yml`/`.yaml`, `.semaphore.yml`, `.drone.yml`/`.yaml`, `.woodpecker.yml`/`.yaml`, `.cirrus.yml`/`.yaml`, `.buddy.yml`/`.yaml`, `wercker.yml`/`.yaml`, `shippable.yml`, `bitrise.yml`, `codemagic.yaml`, `codeship-steps.yml`, `screwdriver.yaml`/`.yml`, `zuul.yaml`/`.zuul.yaml`, `.prow.yaml`, `harness.yaml`, `skaffold.yaml`/`.yml`, `garden.yml`, `render.yaml`, `heroku.yml`, `vercel.json`, `netlify.toml`, `cloud-init.yaml`, `user-data.yaml`, `.gitpod.yml`/`.yaml`, `devcontainer.json`/`.devcontainer.json`, `Taskfile.yml`/`.yaml`, `.build.yml`/`.yaml` (SourceHut), `.space.kts` (JetBrains Space), `Jenkinsfile`, `Jenkinsfile.groovy`, `Jenkinsfile.declarative`, `Earthfile` |
| Directory | `.circleci/`, `.buildkite/`, `.semaphore/`, `.teamcity/`, `.woodpecker/`, `.drone/`, `.azure/`, `.azure-pipelines/`, `.pipelines/`, `.ci/`, `ci/`, `.gitlab/ci/`, `.gitlab-ci/`, `.tekton/`, `tekton/`, `.argo/`, `.argo-workflows/`, `.concourse/`, `concourse/`, `.harness/`, `bamboo-specs/`, `.cirrus/`, `.codefresh/`, `.buddy/`, `.zuul.d/`, `.prow/`, `prow/`, `.builds/`, `.dagger/`, `.jenkins/`, `.spinnaker/`, `.screwdriver/`, `.bitbucket/`, `.codeship/`, `.devcontainer/`, `.earthly/`, `.garden/`, `.skaffold/`, `.gocd/`, `.appveyor/`, `.bitrise/`, `.codemagic/`, `.travis/`, `.nomad/`, `.gitpod/`. Inside them: `.yml`, `.yaml`, `.json`, `.kts`, `.groovy` or an extensionless `config`. |
| Name suffix | `*-pipeline.yml`/`.yaml`, `*-pipelines.yml`/`.yaml`, `*.gitlab-ci.yml`/`.yaml`, `pipeline.yml`/`.yaml`, `ci.yml`/`.yaml`, `workflow.yml`/`.yaml`, `*-workflow.yml`/`.yaml` |
| Actions family | `.github/workflows/`, `.github/actions/`, `.gitea/workflows/`, `.forgejo/workflows/`, any `action.yml`/`action.yaml` |

- Multi-document YAML is read in full, so a Tekton `Task` or Argo `Workflow` that is not the first document is still read.
- Command keys recognised include `run`, `script`, `commands`, `cmds`, `steps`, `entrypoint`, `content`, `args`, `before_install`, `build_script`, `runcmd`, `installCommand` and `postCreateCommand`.
- A line-based shell pass also runs over every pipeline file. It catches commands under keys no vendor list knows, and Kotlin, Groovy and TOML files that happen to parse as YAML.
- A compose file or Kubernetes manifest inside a CI directory keeps its own classification.

## Shell scripts and recipes

Skip with `--no-shell`.

| Matched by | Files |
|---|---|
| Extension | `.sh`, `.bash`, `.zsh`, `.ksh`, `.ash`, `.dash`, `.fish`, `.bats`, `.command`, `.mk`, `.ps1`, `.psm1`, `.cmd`, `.bat` |
| Exact name | `Makefile`, `makefile`, `GNUmakefile`, `justfile`, `Justfile`, `.justfile`, `Vagrantfile` |
| Shebang | Any extensionless file whose first line is a `sh`, `bash` or `zsh` shebang |

Line continuations are joined first, so a multi-line `apt-get install \` block is one command.

| Package managers recognised | |
|---|---|
| Linux distribution | `apk`, `apt`, `dpkg`, `yum`, `dnf`, `zypper`, `rpm`, `pacman` |
| Language | `npm`, `yarn`, `pnpm`, `bun`, `pip`, `uv`, `poetry`, `pipenv`, `gem`, `composer`, `cargo`, `go`, `nuget`, `dotnet`, `mvn`, `gradle`, `conda` |
| Windows | `choco`, `scoop`, `winget` |

## Packages inside binaries

Compiled artefacts are read for the package metadata their build tool embedded. Nothing is executed. Skip with `--no-binary-analysis`, or keep file components but drop the packages with `--no-binary-packages`.

| Source | What is recovered |
|---|---|
| Go build info (ELF, PE, Mach-O, XCOFF) | The main module, every linked module with its `go.sum` H1 hash, replacement modules, the toolchain as `stdlib` (how Go advisories are indexed), and build settings including `vcs.revision` |
| Rust `cargo auditable` (`.dep-v0` ELF section) | Every crate with version and source, build and dev crates scoped as development, and the crate dependency graph |
| JVM archives (`.jar`, `.war`, `.ear`, `.hpi`, `.jpi`) | Maven coordinates from `META-INF/maven/**/pom.properties`, then `MANIFEST.MF` attributes, then the file name. Jars nested one level inside a fat or Spring Boot jar are read too. |

## Binaries in a container

When you pass `--container-rootfs` or `--container-archive`, the file lists in the `dpkg`, `apk` and `pacman` databases are read, so each binary is attributed to the package that installed it:

| Result | Recorded as |
|---|---|
| The owning package is the binary's parent in the dependency graph | CycloneDX `dependencies` |
| The owner | `vulnetix:binary/owner-package`, `vulnetix:binary/owner-ecosystem` on the file component |
| No package claims the binary | `vulnetix:binary/unpackaged` |

RPM databases are Berkeley DB or SQLite and need a native library to read file lists. RPM-based images get package components but no per-file attribution, so their binaries are never flagged unpackaged.

`vulnetix containers` runs the same binary discovery and merges the packages into `.vulnetix/sbom.cdx.json`. Turn it off there with `--no-binary-package-analysis`.
