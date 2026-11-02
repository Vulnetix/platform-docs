---
title: Commands and keybindings
nav: Commands
description: The five commands in `contributes.commands`, what each does, the context keys the extension sets, and how to bind a key.
order: 2
sources: [vulnetix-vscode/package.json, vulnetix-vscode/src/extension.ts, vulnetix-vscode/src/constants.ts, vulnetix-vscode/src/context.ts]
checked: [vulnetix-vscode@9ad08fa]
updated: 02 Nov 2026
---

All commands are in the Command Palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>, <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> on macOS) under the **Vulnetix** category.

| Palette title | Command ID | What it does |
|---|---|---|
| Vulnetix: Show Output | `vulnetix.lsp.showOutput` | Opens the Vulnetix output channel: extension version, CLI resolution, server log and traces. Also runs when you click the status bar item. |
| Vulnetix: Restart Language Server | `vulnetix.lsp.restart` | Stops and starts the server with the same binary, and resets the crash counter. Shows "Vulnetix is not running." when no CLI has been resolved. |
| Vulnetix: Install CLI | `vulnetix.cli.install` | When no CLI has been resolved in this window, downloads and verifies the pinned CLI (`v3.100.0`) without prompting, then starts the server. When one has, it starts the server with that binary again and downloads nothing. |
| Vulnetix: Set CLI Path | `vulnetix.cli.setPath` | File picker. Writes the chosen file to `vulnetix.cli.path` in user settings and restarts with it. |
| Vulnetix: Show CLI Version | `vulnetix.cli.showVersion` | Shows `Vulnetix CLI <version> (protocol v<n>) from <source>: <path>`, or "No Vulnetix CLI has been resolved yet." |

No command is hidden by a `when` clause, and none has a menu or context-menu entry.

## Keybindings

The extension contributes no keybindings. Bind any command in **Preferences: Open Keyboard Shortcuts (JSON)**:

```jsonc
// keybindings.json
[
  { "key": "ctrl+alt+v r", "command": "vulnetix.lsp.restart", "when": "vulnetix.hasCli" },
  { "key": "ctrl+alt+v o", "command": "vulnetix.lsp.showOutput" }
]
```

## Context keys

The extension sets these with `setContext`, so you can use them in `when` clauses.

| Key | Set to | Meaning |
|---|---|---|
| `vulnetix.mode` | `node` | Always `node` today; `web` is reserved |
| `vulnetix.hasCli` | `true` once a usable CLI has passed the handshake | |
| `vulnetix.hasSca` | `true` when the CLI's handshake reports `sca` | Dependency analysis available |
| `vulnetix.hasScanned` | `false` | Reserved, never set to `true` yet |
| `vulnetix.scanning` | `false` | Reserved, never set to `true` yet |
| `vulnetix.authenticated` | `false` | Reserved, never set to `true` yet |

## Quick fixes

Dependency version bumps are code actions offered by the server, not commands. Open them with **Quick Fix** (<kbd>Ctrl</kbd>+<kbd>.</kbd>) on a vulnerable dependency line: see [Dependencies](/vscode/findings/dependencies/#quick-fixes).
