---
title: Reachability language coverage
nav: Languages
description: The 17 tree-sitter grammars in the CLI, their file extensions, accepted language spellings, and where each ecosystem's installed packages are looked for.
order: 2
sources: [cli/internal/treesitter/languages.go, cli/internal/reachability/discovery.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

Grammars are compiled into the release binary. Nothing is downloaded at run time.

| Language ID | Extensions | Also accepted as |
|---|---|---|
| `javascript` | `.js`, `.mjs`, `.cjs`, `.jsx` | `js`, `ecmascript` |
| `typescript` | `.ts`, `.mts`, `.cts` | `ts` |
| `tsx` | `.tsx` | |
| `python` | `.py`, `.pyi` | `py` |
| `go` | `.go` | `golang` |
| `java` | `.java` | |
| `ruby` | `.rb`, `.rake`, `.gemspec` | `rb` |
| `rust` | `.rs` | `rs` |
| `c` | `.c`, `.h` | |
| `cpp` | `.cpp`, `.cxx`, `.cc`, `.hpp`, `.hxx`, `.hh` | `c++`, `cxx` |
| `c-sharp` | `.cs` | `csharp`, `c#` |
| `php` | `.php`, `.phtml` | |
| `swift` | `.swift` | |
| `kotlin` | `.kt`, `.kts` | `kt` |
| `scala` | `.scala`, `.sc` | |
| `bash` | `.sh`, `.bash` | |
| `lua` | `.lua` | |

Language names are case-insensitive and trimmed. A query for a language not in this table is skipped without an error.

Each extension maps to exactly one grammar. `.h` is parsed as C, so C++ headers named `.h` are parsed with the C grammar. A `.ts` file is never parsed as TSX: JSX in TypeScript must be in `.tsx` files.

Not covered: Dart, Elixir, Erlang, HCL and other configuration formats, and shells other than Bash (fish, zsh, ksh).

## Where installed packages are looked for

Direct mode needs the package on disk. The lookup reads the file system only; it never runs a package manager.

| Ecosystem | Looked for in |
|---|---|
| npm, yarn, pnpm | `node_modules/<pkg>` (pnpm's top-level symlink). Yarn Plug'n'Play has no `node_modules` and is not supported. |
| PyPI | `.venv/lib/python*/site-packages/<pkg>`, `venv/...`, `env/...` (also with `-` replaced by `_`), then `src/<pkg>` and `<pkg>/` |
| Go | `vendor/<module>`. The module cache is not searched: run `go mod vendor`. |
| Maven, Gradle | `target/dependency` (`mvn dependency:copy-dependencies`), `build/dependencies` |
| Composer | `vendor/<pkg>` |
| RubyGems | `vendor/bundle/ruby/<version>/gems/<gem>-*` |
| Cargo | `vendor/<crate>` (`cargo vendor`) |
| NuGet | not searched |

When the package is not found, direct mode is skipped for that CVE and transitive mode still runs.
