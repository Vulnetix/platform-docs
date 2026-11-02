---
title: Not available yet
description: Features, commands and settings the earlier extension docs described that are not in the extension or the language server today, and what to use instead.
order: 4
sources: [vulnetix-vscode/package.json, vulnetix-vscode/README.md, vulnetix-vscode/website/content/docs/, cli/internal/lsp/server.go]
checked: [vulnetix-vscode@9ad08fa, cli@4c8c3b7]
updated: 02 Nov 2026
---

The earlier site at docs.code.vulnetix.com documented the planned design alongside what had shipped. None of the items below exist in extension `0.3.1` or in `vulnetix lsp` at `cli@4c8c3b7`. If you set one of the settings, VS Code ignores it.

## Features

| Feature | Use instead |
|---|---|
| Sign in from the editor (device flow), sign out, account switching | `vulnetix auth login` in a terminal; the server reads the CLI's credentials. See [Privacy and network use](/vscode/configuration/privacy/#credentials). |
| Whole-workspace scan command, scan file, scan folder, cancel scan | `vulnetix scan` in a terminal ([CLI](/cli/)) |
| Sidebar views: posture, findings tree, dependencies, remediation | The Problems panel, filtered by `@source:vulnetix-sca` and the other sources |
| Licence findings (`vulnetix-license`) | `vulnetix license` ([SCA](/sca/)) |
| Malware findings in the editor (`vulnetix-malware`) | `vulnetix scan` ([Malware](/malware/)) |
| SBOM, CBOM, AI BOM and VEX generation | `vulnetix scan` and `vulnetix vex`: see [SBOM](/sbom/) and [VEX](/vex/) |
| Suppress and Triage commands, VEX statements from triage | `.vulnetix/memory.yaml` or `vulnetix.suppressions` ([Suppressions](/vscode/findings/suppressions/)) |
| `nosec` comments honoured in the editor | Honoured by `vulnetix scan` only |
| Organisation quality gate, package firewall and AI firewall in the editor | [Quality gates](/quality-gates/), [Package firewall](/package-firewall/), [AI firewall](/ai-firewall/) |
| Threat intelligence browser, look up selection | The Resolve console, or the [browser extension](/browser-extension/) for identifiers on web pages |
| Reachability analysis | `vulnetix scan` signed in |
| Lockfile-regeneration task after a fix, package-manager overrides | Run your package manager yourself ([Fix a vulnerable dependency](/vscode/guides/fix-a-dependency/)) |
| Custom rule packs | `vulnetix sast` with rule packs ([SAST](/sast/)) |
| A reduced mode for vscode.dev and github.dev | [Browser-only editors](/vscode/editors/browser-only/) |
| Default keybindings (`Ctrl+Shift+V` chords) | Bind commands yourself ([Commands](/vscode/reference/commands/#keybindings)) |
| Automatic CLI updates | Install a newer CLI on `PATH` or set `vulnetix.cli.path` |
| Multi-root workspaces | Only the first folder is analysed |

## Settings that do not exist

`vulnetix.cli.channel`, `vulnetix.scan.features`, `vulnetix.scan.exclude`, `vulnetix.scan.depth`, `vulnetix.scan.respectGitignore`, `vulnetix.sast.rules`, `vulnetix.sast.ruleRegistry`, `vulnetix.sast.disableDefaultRules`, `vulnetix.sast.suppressTestCode`, `vulnetix.sast.snippetContext`, `vulnetix.secrets.ignoreBinaries`, `vulnetix.sca.diagnosticGranularity`, `vulnetix.decorations.gutterIcons`, `vulnetix.decorations.overviewRuler`, `vulnetix.codeLens.enabled`, `vulnetix.inlayHints.enabled`, `vulnetix.qualityGate.severity`, `vulnetix.qualityGate.exploits`, `vulnetix.auth.preferEditorSession`, `vulnetix.auth.allowCommunityFallback`, `vulnetix.lsp.maxCpu`, `vulnetix.lsp.idleShutdownMinutes`, `vulnetix.license.allow`, `vulnetix.license.mode`.

## Settings that exist but do nothing yet

`vulnetix.cli.autoUpdate`, `vulnetix.scan.onStartup`, `vulnetix.scan.onSave`, `vulnetix.scan.onType`, `vulnetix.secrets.onType`, `vulnetix.secrets.gitHistory`. They are contributed in `package.json`, so they appear in the Settings UI, but nothing reads them. See [Settings](/vscode/reference/settings/).
