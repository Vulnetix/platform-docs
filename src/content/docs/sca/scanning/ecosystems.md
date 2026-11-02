---
title: Supported ecosystems and files
nav: Ecosystems
description: Every manifest, lockfile, SBOM and pipeline file vulnetix sca recognises, the ecosystem it maps to, and whether it has a parser.
order: 1
sources: [cli/internal/scan/detector.go, cli/cmd/scan.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

A file is matched in this order: exact file name, a Dockerfile or Containerfile name variant, file extension, a pip requirements name pattern, content checks (`CMakeLists.txt`, hpack `package.yaml`, Compose and Kubernetes YAML), CI path patterns, shell shebangs, and last a content sniff for arbitrarily named pip requirements files.

"Parsed" means the CLI has a local parser and the packages are sent for lookup. A file that is detected but not parsed is listed as `[not supported]` in the scan output. Whether a parsed package gets vulnerability matches depends on the advisory data the VDB holds for its ecosystem.

## Language ecosystems

| Language | Ecosystem | Manifests | Lockfiles |
|---|---|---|---|
| JavaScript, TypeScript | `npm` | `package.json` | `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock` (Classic and Berry), `pnpm-lock.yaml` (v5 to v9), `bun.lock` |
| Deno | `deno` | `deno.json` | `deno.lock` |
| Python | `pypi` | `pyproject.toml`, `requirements.txt`, `requirements.in`, `setup.py`, `setup.cfg`, `Pipfile` | `Pipfile.lock`, `poetry.lock`, `uv.lock`, `pylock.toml` |
| Python (Conda) | `conda` | `environment.yml`, `environment.yaml` | |
| Go | `golang` | `go.mod` | `go.sum` |
| Ruby | `rubygems` | `Gemfile` | `Gemfile.lock` |
| Rust | `cargo` | `Cargo.toml` | `Cargo.lock` |
| Java | `maven` | `pom.xml`, `build.gradle` | `gradle.lockfile` |
| Kotlin | `maven` | `build.gradle.kts` | |
| Scala (sbt, Mill) | `maven` | `build.sbt`, `build.sc` | `build.lock` |
| Clojure (Leiningen, tools.deps, Babashka) | `clojars` | `project.clj`, `deps.edn`, `bb.edn` | |
| PHP | `composer` | `composer.json` | `composer.lock` |
| .NET (C#, F#, VB) | `nuget` | `*.csproj`, `*.fsproj`, `*.vbproj`, `packages.config`, `paket.dependencies`, `Directory.Packages.props` | `packages.lock.json`, `paket.lock` |
| Swift | `swift` | `Package.swift` | `Package.resolved` |
| Swift, Objective-C (CocoaPods) | `cocoapods` | `Podfile` | `Podfile.lock` |
| Swift (Carthage) | `carthage` | `Cartfile` | `Cartfile.resolved` |
| Dart, Flutter | `pub` | `pubspec.yaml` | `pubspec.lock` |
| Elixir | `hex` | `mix.exs` | `mix.lock` |
| Erlang | `erlang` | `rebar.config` | `rebar.lock` |
| Haskell (Stack) | `stack` | `stack.yaml` | |
| Haskell (Cabal) | `cabal` | `*.cabal` | `cabal.project.freeze` |
| Haskell (hpack) | `hackage` | `package.yaml`, only when it has `dependencies:` and an hpack section such as `library:` | |
| OCaml | `opam` | `opam`, `*.opam` | |
| Julia | `julia` | `Project.toml` | `Manifest.toml` |
| Crystal | `crystal` | `shard.yml` | `shard.lock` |
| R | `cran` | `DESCRIPTION` | `renv.lock` |
| C, C++ (Conan) | `conan` | `conanfile.txt`, `conanfile.py` | `conan.lock` |
| C, C++ (vcpkg) | `vcpkg` | `vcpkg.json` | |
| CMake (CPM) | `cpm` | `CPM.cmake`, `CMakeLists.txt` that contains `CPMAddPackage` | |
| Meson | `meson` | `meson.build` | |
| Zig | `zig` | `build.zig.zon` | |
| Bazel | `bazel` | `WORKSPACE`, `WORKSPACE.bazel`, `MODULE.bazel` | |
| Buck | `buck` | `BUCK`, `BUCK2` | |
| Nix (read by `scan` and `iac`, not `sca`) | `nix` | `flake.nix` | `flake.lock` |
| Terraform (read by `scan` and `iac`, not `sca`) | `terraform` | `*.tf` | |

Pip requirements files with other names are also read:

- by name: any `.txt` or `.in` whose name contains `requirements` or `constraints`, any `.txt` or `.in` inside a `requirements/` or `requires/` directory, and any `.pip` file;
- by content: a `.txt`, `.in`, `.pip`, `.reqs`, `.requirements`, `.list`, `.lst`, `.text` or extensionless file under 256 KiB whose lines are all requirement lines. A file with version operators, `--hash=` or pip directives is treated as confident. A file of bare package names is tentative and is used only if its names match installed packages.

### Detected, not parsed

| File | Why |
|---|---|
| `bun.lockb` | Binary lock from Bun before 1.2. Run `bun install --save-text-lockfile` to write `bun.lock`. |
| `.npmrc`, `.yarnrc`, `.yarnrc.yml`, `settings.gradle`, `settings.gradle.kts` | Registry configuration. Read as a private-registry signal, not as packages. |

## Containers, Kubernetes and Helm

These are read by `vulnetix containers` and by `vulnetix scan`. `vulnetix sca` drops them. See [Containers](/sca/containers/containers/).

| File | Ecosystem | Extracted |
|---|---|---|
| `Dockerfile`, `Containerfile`, `Gockerfile`, `Pkgfile`, any name containing `dockerfile` or `containerfile`, `*.dockerfile`, `*.containerfile` | `docker` | `FROM` images, `RUN`-installed OS packages |
| `compose.yaml`, `compose.yml`, `docker-compose.y(a)ml`, `podman-compose.y(a)ml`, or any YAML with `services:` and an `image:` or `build:` key | `docker` | Service images |
| YAML with top-level `apiVersion:` and `kind:` | `kubernetes` | Pod-template images |
| `Chart.yaml`, `Chart.yml` | `helm` | Chart dependencies and `values.yaml` images |

## SBOM inputs

A `.json` file that is a CycloneDX or SPDX document is read as SCA input, and its packages are scanned like a lockfile's.

| Format | Accepted |
|---|---|
| CycloneDX | `bomFormat: CycloneDX` with a `specVersion` that validates against the embedded schemas |
| SPDX | `spdxVersion` and `SPDXID` present. Only `SPDX-2.3` is supported. |

## Pipelines and scripts

Packages installed by a CI job or a script, with no manifest, are found from the install commands (`apt-get install`, `pip install`, `npm install -g`, `choco`, `scoop`, `winget` and others). Skip them with `--no-ci-package-analysis` and `--no-shell-package-analysis`.

| Source | Ecosystem | Files |
|---|---|---|
| GitHub Actions, Gitea, Forgejo | `github-actions` | `.github/workflows/*`, `.github/actions/*`, `.gitea/workflows/*`, `.forgejo/workflows/*`, `action.yml`, `action.yaml`. `uses:` pins are resolved as packages as well as `run:` commands. |
| Other CI systems | `ci` | `.gitlab-ci.yml`, `.travis.yml`, `.circleci.yml`, `.drone.yml`, `.woodpecker.yml`, `.buddy.yml`, `.cirrus.yml`, `azure-pipelines.yml`, `bitbucket-pipelines.yml`, `buildspec.yml`, `cloudbuild.yml`, `codefresh.yml`, `appveyor.yml`, `semaphore.yml`, `.semaphore.yml`, `wercker.yml`, `bitrise.yml`, `codemagic.yaml`, `codeship-steps.yml`, `screwdriver.yaml`, `zuul.yaml`, `.zuul.yaml`, `harness.yaml`, `skaffold.yaml`, `garden.yml`, `render.yaml`, `cloud-init.yaml`, `user-data.yaml`, `.gitpod.yml`, `devcontainer.json`, `.devcontainer.json`, `shippable.yml`, `.prow.yaml`, `heroku.yml`, `vercel.json`, `netlify.toml`, `.space.kts`, `.build.yml`, `Taskfile.yml`, `Earthfile`, `Jenkinsfile`, `Jenkinsfile.groovy`, `Jenkinsfile.declarative` (`.yaml` spellings included) |
| CI directories | `ci` | YAML, JSON, `.kts`, `.groovy` or an extensionless `config` inside `.circleci`, `.buildkite`, `.semaphore`, `.teamcity`, `.woodpecker`, `.drone`, `.azure`, `.azure-pipelines`, `.pipelines`, `.ci`, `ci`, `.gitlab/ci`, `.gitlab-ci`, `.tekton`, `tekton`, `.argo`, `.argo-workflows`, `.concourse`, `concourse`, `.harness`, `bamboo-specs`, `.cirrus`, `.codefresh`, `.buddy`, `.zuul.d`, `.prow`, `prow`, `.builds`, `.dagger`, `.jenkins`, `.spinnaker`, `.screwdriver`, `.bitbucket`, `.codeship`, `.devcontainer`, `.earthly`, `.garden`, `.skaffold`, `.gocd`, `.appveyor`, `.bitrise`, `.codemagic`, `.travis`, `.nomad`, `.gitpod` |
| CI name patterns | `ci` | YAML named `pipeline`, `pipelines`, `ci`, `workflow`, or ending `-pipeline`, `-pipelines`, `-workflow`, `.gitlab-ci` |
| Make and task runners | `shell` | `Makefile`, `makefile`, `GNUmakefile`, `justfile`, `.justfile`, `Justfile`, `Vagrantfile`, `*.mk` |
| Shell scripts | `shell` | `.sh`, `.bash`, `.zsh`, `.ksh`, `.bats`, `.ash`, `.dash`, `.fish`, `.command`, `.ps1`, `.psm1`, `.cmd`, `.bat`, and extensionless files under 256 KiB starting with a `sh`, `bash` or `zsh` shebang |

## What each scan command reads

| Command | Language manifests | Containers, Kubernetes, Helm | Terraform, Nix | SBOM inputs |
|---|---|---|---|---|
| `vulnetix sca` | yes | no | no | yes |
| `vulnetix containers` | no | yes | no | no |
| `vulnetix iac` | no | no | yes | no |
| `vulnetix scan` | yes | yes | yes | yes |

`sca` reads files that `.gitignore` excludes, because install directories are usually ignored. `containers` and `iac` skip them unless you pass `--include-ignored`.
