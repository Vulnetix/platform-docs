---
title: Lockfiles, ranges and installed packages
nav: Resolution
description: How vulnetix sca turns declared ranges into exact versions, the build-or-lock rule, JavaScript workspaces, and what happens to a manifest it cannot resolve.
order: 2
sources: [cli/internal/scan/gate.go, cli/internal/scan/npm_installed.go, cli/internal/scan/npm_workspace.go, cli/internal/scan/pip_installed.go, cli/cmd/scan.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

A vulnerability lookup needs an exact version. `^4.17.0` is not one. The scan gets exact versions, in order of preference, from a lockfile, from a manifest that already pins every package, or from the packages installed on disk.

## The build-or-lock rule

The rule applies to npm `package.json` and to Python `requirements.txt`, `requirements.in`, `pyproject.toml` and `Pipfile`.

| Situation | Result |
|---|---|
| A lockfile sits beside the manifest | The lock is scanned. Range entries in the manifest are dropped so a range is never queried as a version. |
| Every Python requirement is pinned with `==` or has `--hash=` | The manifest is scanned as it is. |
| npm: the manifest belongs to a workspace whose root lock is inside `--path` | The root lock is scanned. The member adds nothing of its own, so no package is listed twice. |
| npm: the workspace root's lock is outside `--path` | The manifest is skipped. The note says to scan the workspace root with `--path <root>`. |
| No lock, packages installed | Versions are read from `node_modules/` or from the project virtualenv's `site-packages`. Installed packages that the manifest does not declare are added as transitive. |
| No lock, nothing installed, or a declared package missing | The manifest is skipped from SCA with `Note: ... scanning continues; SCA skips this manifest`. The scan continues and the exit code is not changed. |

Sibling lock names: `package-lock.json`, `npm-shrinkwrap.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lock` for npm; `uv.lock`, `poetry.lock`, `Pipfile.lock`, `pylock.toml` for Python.

> [!CAREFUL] A skipped manifest is not a clean manifest
> A manifest dropped by this rule contributes no packages, so it cannot fail a gate. The SAST rules VNX-NODE-001, VNX-PHP-001 and VNX-RUBY-001 report a missing lockfile as a finding when SAST runs (`vulnetix scan`). In CI, commit the lockfile or install dependencies before `vulnetix sca`.

For Python without a project virtualenv, the global and user `site-packages` are used only to check that the declared packages are installed. They are never added to the SBOM as project dependencies.

A pip requirements file detected only by its content and made of bare package names is used only if its names match installed packages. Otherwise it is ignored without a note.

## JavaScript workspaces

The lock lives at the workspace root. The root is the nearest ancestor whose `package.json` `workspaces`, `lerna.json` `packages`, or `pnpm-workspace.yaml` `packages` globs include the member. Every dependency a workspace member declares is reported as direct.

## Direct and transitive

A package is direct when the manifest in the same directory declares it, and transitive when only a lockfile or the installed tree brings it in. `--show paths` prints the chain from the manifest to each transitive package for npm, Python, Rust, Ruby, PHP and Go. `--filter direct` and `--filter transitive` narrow the output.

## Packages from pipelines and scripts

Install commands in CI files and scripts add packages that no manifest declares. See [Pipelines and scripts](/sca/scanning/ecosystems/#pipelines-and-scripts). Switch these sources off with `--no-ci-package-analysis` and `--no-shell-package-analysis`.

## Discovery limits

| Flag | Default | Effect |
|---|---|---|
| `--path` | `.` | Root of the walk |
| `--depth` | `3` | Directory levels below the root |
| `--exclude` | none | Glob to skip, repeatable |
| `--include-ignored` | `false` | Has no effect on `sca`, which always reads gitignored paths |
