---
title: First run
description: "What happens when a folder opens: finding or downloading the CLI, starting the server, and where findings and status appear."
order: 4
sources: [vulnetix-vscode/src/extension.ts, vulnetix-vscode/src/cli/resolve.ts, vulnetix-vscode/src/cli/download.ts, vulnetix-vscode/src/lsp/client.ts, vulnetix-vscode/src/shared/diagnostics.ts, cli/internal/lsp/server.go]
checked: [vulnetix-vscode@9ad08fa, cli@4c8c3b7]
updated: 02 Nov 2026
---

The extension activates on `onStartupFinished`, and also when the workspace contains a manifest, a Dockerfile, a `.tf` file or `.vulnetix/memory.yaml`. With no folder open it only shows **Vulnetix** in the status bar with the tooltip "Open a folder to scan it".

## 1. Find a CLI

When the first workspace folder is available, the extension looks for a usable `vulnetix` binary in this order:

| Step | Candidate | If it fails |
|---|---|---|
| 1 | [`vulnetix.cli.path`](/vscode/reference/settings/), if set | Error notification with **Open Settings**. No fallback to another binary. |
| 2 | `vulnetix` (or `vulnetix.exe`) on `PATH` | Skipped silently, next step |
| 3 | The newest copy previously downloaded into the extension's global storage (`<globalStorage>/cli/<tag>/vulnetix`) | Skipped silently, next step |
| 4 | None found | Prompt to download |

A candidate is usable when it is executable and `vulnetix lsp --version` prints a handshake with protocol version `1`. A binary on `PATH` that is too old to have `lsp` is skipped, not reported.

## 2. Download, if needed

The prompt reads "Vulnetix needs the Vulnetix CLI to scan. Download it now?" with three buttons:

| Button | Effect |
|---|---|
| **Download** | Fetches `checksums.txt`, then the asset for your platform from `https://github.com/Vulnetix/cli/releases/download/v3.100.0/`, verifies SHA-256, and moves it into place |
| **Set Path** | Opens a file picker and writes the chosen file to `vulnetix.cli.path` in user settings |
| **Not Now** | Does nothing. The status bar tooltip says "The Vulnetix CLI is not installed". Run **Vulnetix: Install CLI** later. |

The download shows progress in a notification and can be cancelled. A checksum mismatch, a missing entry in `checksums.txt`, or an unparseable line in it discards the file and shows an error. There is no setting to skip verification.

## 3. Start the server

The extension runs:

```sh
vulnetix lsp --debounce-ms=400 --memory-limit-mb=2048 --no-analytics
```

with the values from `vulnetix.scan.debounceMs` and `vulnetix.lsp.memoryLimitMb`, in the workspace folder. On `initialize` the server indexes the workspace, compiles the rules it runs while you type, then checks every dependency manifest it found. Until the rules are loaded, opened files get no code findings rather than an empty list, so a file never reads as clean before it was checked.

Only the first workspace folder is analysed. Multi-root workspaces are not supported yet.

## 4. Read the results

**Problems panel.** Findings are split into one diagnostic collection per family, so you can filter with `@source:<name>`:

| Source | Family | Emitted today |
|---|---|---|
| `vulnetix-sca` | Dependencies | Yes |
| `vulnetix-sast` | Code rules, and anything with an unknown source | Yes |
| `vulnetix-secrets` | Secret rules | Yes |
| `vulnetix-iac` | Infrastructure rules | Yes |
| `vulnetix-containers` | Dockerfile and image rules | Yes |
| `vulnetix-license` | Licences | No, reserved |
| `vulnetix-malware` | Malware | No, reserved |

**Status bar.** The item on the left shows the state:

| Text | Meaning |
|---|---|
| `Vulnetix` with tooltip "No findings · CLI 3.x.y" | Server running, nothing found |
| `Vulnetix` plus an error count and a warning count | Server running; info findings are counted in the tooltip only |
| `Vulnetix`, tooltip "The language server is turned off in settings" | `vulnetix.lsp.enabled` is `false` |
| Error icon, "The configured CLI cannot be used" | `vulnetix.cli.path` failed; see the notification |
| Error icon, "The language server could not start" | See **Vulnetix: Show Output** |

Clicking the status bar item runs **Vulnetix: Show Output**. The log records the extension version, the protocol and CLI range it expects, the binary it chose and where it came from, and every server message.

## Next

- [When analysis runs](/vscode/findings/when-analysis-runs/)
- [Fix a vulnerable dependency](/vscode/guides/fix-a-dependency/)
