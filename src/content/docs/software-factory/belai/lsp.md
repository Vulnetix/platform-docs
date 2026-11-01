---
title: Language servers
description: Diagnostics on the same turn as an edit, so the model can fix a syntax error at once. Supported languages, their servers and fallbacks, and the switches.
order: 14
sources: [belai/docs/lsp.md]
checked: [belai@35506b9]
updated: 28 Oct 2026
---

After a `Write` or `Edit`, Belai checks the edited file with a language server and hands any diagnostics back on the same tool result. There is no extra round trip, so the model can fix a syntax error at once.

| Language | Server | Fallback |
|---|---|---|
| Go | `gopls` | `gofmt -e` |
| TypeScript, JavaScript | `typescript-language-server` | `node --check` for `.js` |
| Python | `pyright-langserver`, `ruff` or `pylsp` | `python3 -m py_compile` |
| Rust | `rust-analyzer` | `rustfmt --check` |
| C, C++, Objective-C | `clangd` | `clang -fsyntax-only` |
| C# | `csharp-ls` or `omnisharp` | none |
| Java | `jdtls` | none |
| Dart, Flutter | `dart language-server` | `dart analyze` |
| Swift | `sourcekit-lsp` | `swiftc -parse` |
| Ruby | `ruby-lsp` or `solargraph` | `ruby -c` |
| Shell | `bash-language-server` | `bash -n` |
| Zig | `zls` | `zig ast-check` |

A server must already be installed. Belai never installs one on its own; the `/lsp` screen shows a missing server's install command and runs it only when you press `i`. When no server is found, the fallback runs.

## Switches

`/lsp on|off [language]` switches diagnostics for this session. In settings, `lsp.enabled` switches them overall and `lsp.languages` switches each language by its id, such as `go` and `ts`.

## Related

- [Tests and lint](/software-factory/belai/tests-and-lint/)
- [Hooks](/software-factory/belai/hooks/), for checks of your own after an edit.
