---
title: How fixes are applied
nav: Applying fixes
description: The four fix methods, what is written to each manifest type, the package manager command that runs, and how workspaces and shared parents are handled.
order: 3
sources: [cli/internal/fix/plan.go, cli/internal/fix/transitive.go, cli/internal/fix/edit.go, cli/internal/fix/commands.go, cli/cmd/fix_autofix.go, vdb-manifest/README.md, vdb-manifest/formats.go]
checked: [cli@4c8c3b7, vdb-manifest@137ad07]
updated: 02 Nov 2026
---

Manifest edits are text edits made by the shared `vdb-manifest` module (v0.1.0), the same code the language server and the console use, so a fix produces the same bytes wherever it is made. Lockfiles are never edited by hand: the package manager regenerates them, and the confirmation scan checks the result.

## Methods

A direct dependency is bumped. A transitive one is fixed by the method with the smallest blast radius that works:

| Method | When | What changes |
|---|---|---|
| `direct-bump` | The vulnerable package is declared in the manifest | Its version in the manifest. The range operator is kept: `^1.2.0` becomes `^1.2.3`, an exact pin stays exact. |
| `parent-update` | npm: the safe child already satisfies the parent's declared range | Nothing in the manifest. `npm update <parent>` re-resolves the lock. |
| `parent-upgrade` | The VDB recommends a version of the direct parent whose range admits the safe child | The parent's version in the manifest |
| `override` | Neither of the above | A pin in the ecosystem's override section (below) |

**One version per parent.** When several vulnerable children share a parent, each can need a different parent version. Every upgrade of one parent in one manifest is raised to the highest of them, and to a direct bump of that parent when there is one, so a later install does not undo an earlier one. The plan says when a target was raised.

## What is written

| Manifest | Direct bump, parent upgrade | Override |
|---|---|---|
| `package.json` | Dependency blocks (`dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`) | `overrides` for npm and bun, `pnpm.overrides` for pnpm, `resolutions` for yarn. Spliced into the text: key order, indentation, CRLF and the trailing newline are kept. |
| `composer.json` | `require` blocks | Adds the package to `require` with `^<version>`. This rewrites the file with sorted keys and four-space indentation. |
| `go.mod` | `require` lines | Bumps or adds an `// indirect` require |
| `requirements.txt`, `*.in` | Pin or bump to `==` | Appends `name==version` |
| `pyproject.toml` | Poetry table and PEP 621 arrays | uv projects: `[tool.uv] override-dependencies`. Others: only when the package is already declared. |
| `Cargo.toml` | String and inline-table versions | Not written. `cargo update -p <crate> --precise <version>` moves the pin in `Cargo.lock`. |
| `pom.xml` | `<version>`, unless it is a `${property}` | A `<dependencyManagement>` entry |
| `Gemfile` | `gem "name", "range"` | Pins or appends a gem line |

Manifests with no writer (Pipfile, `setup.py`, `setup.cfg`, Gradle, sbt, .NET, Swift, Dart, Elixir, Clojure, Conda) are left unchanged. Their fixes are listed as manual, with a command where one exists.

## The command that runs

Commands run in the manifest's own directory, batched once per directory.

| Ecosystem | Command |
|---|---|
| npm family | The lock's package manager: `npm install`, `pnpm install`, `yarn install`, `bun install`. `npm update <parent>` for a parent update. |
| PyPI with `uv.lock` | `uv sync` |
| PyPI with `poetry.lock`, `pdm.lock`, `Pipfile.lock` | `poetry update <pkg>`, `pdm update <pkg>`, `pipenv update <pkg>` |
| PyPI, requirements file | `pip install -r <file>` |
| PyPI, `pyproject.toml`, `setup.py`, `setup.cfg` | `pip install .` |
| PyPI, `Pipfile` | `pipenv install` |
| Go | `go get m1@vX m2@vY ... && go mod tidy`, one command per directory |
| Cargo | `cargo update -p <crate> --precise <version>` |
| RubyGems | `bundle update <gem> --conservative` |
| Composer | `composer update <pkg> --with-dependencies` |
| Maven | `mvn -q -DskipTests dependency:resolve` |

The npm package manager is the one that wrote the lock: `package-lock.json` and `npm-shrinkwrap.json` mean npm, `yarn.lock` yarn (Berry when the lock or `packageManager` says so), `pnpm-lock.yaml` pnpm, `bun.lock` or `bun.lockb` bun. When it is not on `PATH`, another installed resolver for the ecosystem is used. With none, the fix is marked manual and nothing runs.

## Workspaces

In a JavaScript monorepo the lock is at the workspace root.

- A member `package.json` with no lock of its own uses the root's package manager, so a second lockfile is never written.
- A direct bump or parent upgrade edits every member manifest that declares the package. The root then only re-resolves (for example `bun install`), so the package does not become a new root dependency.
- A transitive pin goes into the root `package.json`, where npm, pnpm, yarn and bun read overrides.
- For Bun, dependency edges come from `bun.lock` even when `node_modules/` exists, because Bun installs workspaces in isolated mode.

## Depth by ecosystem

| Ecosystem | Direct | Transitive |
|---|---|---|
| npm | yes | parent update, parent upgrade, override |
| pnpm, yarn, bun | yes | parent upgrade, override |
| PyPI, Maven, Composer, RubyGems | yes | parent upgrade, pin in the manifest |
| Go | yes | `go get` of the child at the safe version |
| Cargo | yes | `cargo update --precise` |
| Others | manual | manual |
