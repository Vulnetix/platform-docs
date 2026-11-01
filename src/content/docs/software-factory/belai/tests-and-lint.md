---
title: Tests, lint and build detection
nav: Tests and lint
description: How Belai finds a repository's tests, linters and build, runs tests when work ends, sweeps for lint drift, and never edits a rule file.
order: 18
sources: [belai/docs/testing.md, belai/docs/lint.md, belai/internal/testdetect, belai/internal/lintdetect, belai/internal/builddetect]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

Belai detects a repository's test suites, linters and build from file names alone, never from reading a rule file or script body, and tells the model how the project tests itself.

## Tests after a turn

The post-end test pass runs the detected suites when work ends. A pass gets a short report; a failure gets a bounded diagnose-and-fix loop. It is off until you turn it on.

| Setting | Values |
|---|---|
| `tests.post_end` | `off`, `session`, `goal`, `goal_plan`: when the pass runs |
| `tests.on_fail` | `off`, `diagnose`, `fix`: what to do when it fails |
| `tests.command` | A command to run instead of the detected suites |

A factory crew step sets these per step with `testsPostEnd` and `testsOnFail`.

## Lint

Belai detects the linters a repository has set up (`.golangci.yml`, `ruff.toml`, `rustfmt.toml`, `clippy.toml`, `.rubocop.yml`, an ESLint config and others) and tells the model how to run them. A lint sweep looks for drift against the checked-in rules. **The repository's rule file is the authority, and Belai never edits it.**

## Build checks

Build checks come from a fixed table of marker files: `go.mod` (`go build`, `go vet`), `Cargo.toml` (`cargo build`), a .NET solution or project (`dotnet build`), Gradle and Maven wrappers, `tsconfig.json` (`tsc --noEmit`) and a `build` script in `package.json`. Belai never installs dependencies, so the Node checks run only where `node_modules` exists. The merge conflict resolver uses the same checks.

## Related

- [Default workflows](/software-factory/workflows/default-workflows/): the test and lint sweeps.
- [Language servers](/software-factory/belai/lsp/)
