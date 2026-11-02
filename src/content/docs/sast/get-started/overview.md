---
title: SAST overview
nav: Overview
description: What vulnetix sast scans, which rules it runs, what it writes, and how it relates to vulnetix scan and the other Rego-engine commands.
order: 1
sources: [cli/cmd/specialized_scans.go, cli/cmd/scan.go, cli/internal/sast/engine.go, cli/internal/sast/kinds.go, cli/internal/sast/input.go, cli/internal/sast/language_filter.go, cli/internal/sast/loader.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

`vulnetix sast` runs static analysis on the source files in a directory. It evaluates the CLI's built-in Rego rules, plus any rule packs you load with `--rule`, on your machine, using the Open Policy Agent engine compiled into the binary. It does not look up dependencies, licences, secrets, containers or IaC.

```bash
vulnetix sast                       # scan the current directory
vulnetix sast --fail-on high        # exit 1 on any high or critical finding
vulnetix sast -o results.sarif      # also write SARIF where you choose
```

## What runs

The CLI embeds 1,899 rules (see the [rules index](/sast/rules/)). Each rule declares a `kind` in its metadata, and each command runs one kind:

| Command | Rule kind | Built-in rules |
|---|---|---|
| `vulnetix sast` | `sast` | 793 |
| `vulnetix secrets` | `secrets` | 1,092 |
| `vulnetix containers` | `oci` (and `container` from external packs) | 7 |
| `vulnetix iac` | `iac` | 7 |
| `vulnetix scan` | every kind, plus SCA and licences | all |

The kind lock applies to `--rule` packs too: `vulnetix sast --rule org/pack` runs only the pack's `sast` rules. A rule with no `kind` is `sast`.

Before compiling, the engine drops every rule whose declared languages are all absent from the scanned tree, judged by file extension and well-known file names. A Python-only repository compiles about 370 rules, not 793. Rules that declare no language, `generic`, or a language the filter does not know are always kept. See [Supported languages](/sast/reference/languages/).

## What is read

| Input | Rule |
|---|---|
| Files | Text files under `--path`, at most `--depth` levels deep (default 3). |
| Size cap | 1 MiB of text per file. Larger, unreadable and binary files are listed in the run's notifications as not content-scanned. |
| Always skipped | `.git`, `node_modules`, `.hg`, `__pycache__`, `.tox` and the other build and cache directories in `internal/sast/input.go`. |
| `.gitignore` | Respected. `--include-ignored` (or `--sast-include-ignored`) reads ignored paths too. |
| `--exclude` | `.gitignore`-syntax pattern, repeatable, relative to `--path`. |

> [!CAREFUL] The default depth skips most of a Java or monorepo tree
> `--depth 3` counts the file itself: `a/b/main.py` is scanned, `a/b/c/main.py` is not, and nothing says so. `src/main/java/App.java` is already depth 4. Pass `--depth 10` (or higher) for any project that nests source more than two directories down.

## What it writes

| Path | When |
|---|---|
| `<path>/.vulnetix/sast.sarif` | SARIF 2.1.0, written when there is at least one finding. A clean run deletes the file. |
| `<path>/.vulnetix/memory.yaml` | Every run: counts, finding history, and suppressions recorded from `nosec` comments. |
| `-o <file>.sarif` | SARIF at a path you choose. |

Signed in, the run also uploads the findings as a SAST snapshot in the Vulnetix console and prints its URL. Without credentials the community fallback is used and nothing is stored for you. See [Output formats](/sast/reference/output-formats/).

## Sections

| Page | For |
|---|---|
| [Quickstart](/sast/get-started/quickstart/) | First scan, a CI gate, SARIF upload. |
| [Reading the results](/sast/guides/reading-results/) | The terminal report, `--explain`, test-code and vendored groups. |
| [Suppressing findings](/sast/guides/suppressing-findings/) | `nosec` comments, ignore rules, `--suppress-test-code`. |
| [Custom rules](/sast/guides/custom-rules/) | Write Rego rules and load them with `--rule`. |
| [Flags](/sast/reference/flags/) | Every flag, environment variable and exit code. |
| [Supported languages](/sast/reference/languages/) | Language keys, file extensions and rule counts. |
| [Output formats](/sast/reference/output-formats/) | SARIF fields, JSON report, the upload. |
| [Rules index](/sast/rules/) | Every built-in rule, filterable. |

## Platform IaC

SAST has no config-as-code today: rule selection, packs and gates are command-line flags. The scan gate can come from the organisation's quality gate, which is a `QualityGate` document checked by `vulnetix config validate` and set with `vulnetix config set quality-gate` (see [/quality-gates/](/quality-gates/)). Config-as-code for SAST rule packs and suppressions is planned and is described on [/platform-iac/](/platform-iac/).
