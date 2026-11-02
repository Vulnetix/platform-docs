---
title: Reachability internals
nav: Internals
description: The tree-sitter binding, how release binaries are built with CGo, how the engine runs a query, and where the code lives.
order: 5
sources: [cli/internal/reachability/engine.go, cli/internal/reachability/scanner.go, cli/internal/reachability/discovery.go, cli/internal/reachability/symbol_match.go, cli/internal/treesitter/languages.go, cli/cmd/vdb_reachability.go, cli/cmd/cli_sca.go, cli/.github/workflows/release.yml]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

For people packaging the CLI or checking how a verdict was reached.

## Code map

| Path | Role |
|---|---|
| `cmd/vdb.go`, `cmd/vdb_reachability.go` | `--reachability` on `vdb`; query fetch, scan, memory write, `x_reachability` |
| `cmd/cli_sca.go` | Reachability for scan findings, the semantic fallback, verdict labels |
| `internal/treesitter/languages.go` | Language registry: ID to grammar, extension to ID, aliases |
| `internal/reachability/engine.go` | Parser pool and query execution |
| `internal/reachability/scanner.go` | File walk and parallel analysis |
| `internal/reachability/discovery.go` | Install directory lookup and skipped directories |
| `internal/reachability/symbol_match.go` | Name-matching fallback when no query exists |
| `internal/memory/` | `reachability_evidence` in `memory.yaml` |

## Binding and build

The CLI uses `github.com/smacker/go-tree-sitter`, which ships each grammar's C source as a Go package. Lua comes from a vendored grammar under `third_party/treesitter-lua`. Release builds use `CGO_ENABLED=1`; grammars are linked statically, so the binary needs no tree-sitter or toolchain at run time.

| Target | Built with |
|---|---|
| `linux/amd64`, `linux/arm64`, `linux/arm`, `linux/386` | `zig cc` for musl |
| `windows/amd64`, `windows/arm64` | `zig cc` for `windows-gnu` |
| `darwin/amd64`, `darwin/arm64` | native clang on a macOS runner |

## How one query runs

1. A parser for the language comes from a per-language pool.
2. The file is parsed. A failed or cancelled parse closes the parser instead of returning it to the pool, because a half-finished parse would resume on the next file with the wrong byte offsets. A tree whose root spans more bytes than the source is rejected.
3. The S-expression is compiled against the grammar. A compile error skips that query for that file.
4. A query cursor runs it and `#eq?`, `#match?` and `#any-of?` predicates are applied. A `#match?` regex that panics while compiling is recovered and reported as an error for that query only.
5. Each surviving match becomes `start_line` to `end_line`: the first and last line any capture touches, 1-indexed.

## How a scan runs

1. Queries are grouped by language and deduplicated by query hash, so a query shared by several CVEs runs once.
2. Direct mode: the package's install directory is found and walked.
3. Transitive mode: the project root is walked with the install directory and the skipped directories pruned.
4. The walk collects files first, in a fixed order, then analyses them in parallel (`VULNETIX_REACHABILITY_CONCURRENCY`, default `GOMAXPROCS`, 1 to 32). Files over 4 MiB are skipped.
5. CVEs still without a verdict and with affected routine, file or module names from the VDB go through the semantic fallback, which builds one literal regex per file extension and walks the same tree.

Parse and permission errors are not fatal; the run continues with the other files.
