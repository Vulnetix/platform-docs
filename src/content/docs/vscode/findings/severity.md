---
title: Severity and filtering
description: How Vulnetix severities map to editor diagnostic levels, and the settings that hide low findings or demote them to hints.
order: 5
sources: [cli/internal/lsp/diagnostics.go, cli/internal/lsp/settings.go, cli/internal/lsp/server.go, vulnetix-vscode/src/shared/severity.ts, vulnetix-vscode/package.json]
checked: [cli@4c8c3b7, vulnetix-vscode@9ad08fa]
updated: 02 Nov 2026
---

The mapping matches the CLI's SARIF levels, so an Error in the editor is what `vulnetix scan` reports as `error`.

| Vulnetix severity | CLI label | SARIF level | Editor level | Problems panel |
|---|---|---|---|---|
| `critical` | Dangerous | `error` | Error | Yes |
| `high` | Risky | `error` | Error | Yes |
| `medium` | Quality | `warning` | Warning | Yes |
| `low` | Style | `note` | Information, or Hint | Yes, or no for Hint |
| `info` and unscored | Tentative | `note` | Information, or Hint | Yes, or no for Hint |

A dependency finding takes the severity of its worst advisory.

## Settings

| Setting | Values | Default | Effect |
|---|---|---|---|
| `vulnetix.diagnostics.minimumSeverity` | `critical`, `high`, `medium`, `low`, `info` | `low` | Findings below this level are not published. Applied to the editor level, see below. |
| `vulnetix.diagnostics.mapLowTo` | `information`, `hint` | `information` | `hint` renders low and info findings as a faint underline with no Problems panel entry |
| `vulnetix.diagnostics.showSuppressed` | boolean | `false` | Publish suppressed findings as Hints instead of dropping them |

The floor is compared with the editor level a finding was given, not its original label, so it has three effective settings:

| `minimumSeverity` | Shown |
|---|---|
| `critical` or `high` | Errors only. A high finding is an Error like a critical one, so `critical` does not hide it. |
| `medium` | Errors and Warnings |
| `low` (default) or `info` | Everything, including info and unscored findings |

> [!WHY] An unknown value shows more, not less
> A `minimumSeverity` the server does not recognise is logged and ignored, so every finding is shown. A typo that hid every finding in the workspace would be the one failure a security tool must not have.

Changes apply at once: the server republishes every open file from its cache without rescanning.

## Status bar counts

The status bar counts Errors and Warnings, with Information and Hint findings in the tooltip as notes. Findings filtered out by `minimumSeverity`, and suppressed findings that are not shown, are not counted.
