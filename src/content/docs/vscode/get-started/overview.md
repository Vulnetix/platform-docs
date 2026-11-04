---
title: VS Code extension
nav: Overview
description: The Vulnetix extension for VS Code and its forks runs the `vulnetix lsp` server to show dependency, code, secret, IaC and container findings in the editor.
order: 1
sources: [vulnetix-vscode/package.json, vulnetix-vscode/src/extension.ts, vulnetix-vscode/src/lsp/client.ts, vulnetix-vscode/CHANGELOG.md, cli/cmd/lsp.go, cli/internal/lsp/server.go, belai/internal/profiles/builtin/vulnetix-review.json, pix-ai-coding-assistant/vulnetix/agents/pr-security-reviewer.md]
checked: [vulnetix-vscode@9ad08fa, cli@4c8c3b7]
updated: 04 Nov 2026
status: available
---

The extension is for developers who want Vulnetix findings while they edit, on the line that causes them, instead of after a push. It runs the same CLI and rules as `vulnetix scan`, so use it for feedback as you type and keep `vulnetix scan` in CI as the check that gates a build.

The extension `vulnetix.vulnetix` has no scanner of its own. It finds or downloads the Vulnetix CLI, starts `vulnetix lsp` as a child process, and talks to it over the Language Server Protocol on stdin and stdout. The server evaluates the CLI's embedded rule set against the files you have open and checks your dependency manifests against the Vulnetix vulnerability database (VDB). Findings arrive as ordinary diagnostics: squiggles in the editor and entries in the Problems panel.

The extension is early. The published builds are 0.2.0 (stable) and 0.3.0 (pre-release) on [Open VSX](https://open-vsx.org/extension/vulnetix/vulnetix); `main` is at 0.3.1.

## What works today

| Area | What you get | Page |
|---|---|---|
| Dependencies | One diagnostic per vulnerable package on the line that declares it, a hover card, inline `✓` / `→ <version>` hints, and quick fixes that bump the version in the manifest | [Dependencies](/vscode/findings/dependencies/) |
| Code (SAST) | Rule findings as you type, local only | [Code, secrets and infrastructure](/vscode/findings/code-secrets-iac/) |
| Secrets | Rule findings on save | [Code, secrets and infrastructure](/vscode/findings/code-secrets-iac/) |
| Infrastructure and containers | Terraform, Kubernetes, Dockerfile and similar rules as you type | [Code, secrets and infrastructure](/vscode/findings/code-secrets-iac/) |
| Suppressions | `nosec` comments, `.vulnetix/memory.yaml`, and editor-only rules in `vulnetix.suppressions` | [Suppressions](/vscode/findings/suppressions/) |
| CLI management | Resolve, download and checksum-verify the CLI; mirrors and pinned binaries | [The CLI binary](/vscode/configuration/cli-binary/) |
| Status bar | Error and warning counts, CLI version, a click opens the log | [First run](/vscode/get-started/first-run/) |

There are five commands, no keybindings, no sidebar views and no sign-in command. The [commands reference](/vscode/reference/commands/) lists them, and [Not available yet](/vscode/reference/not-available-yet/) lists what the old docs described that is not built.

## How it fits together

```
editor (extension host)  --LSP over stdio-->  vulnetix lsp  --reads-->  workspace files
                                                   |
                                                   +--HTTPS (package coordinates only)--> api.vdb.vulnetix.com
```

- The extension declares `extensionKind: ["workspace"]`, so in a remote session (SSH, WSL, Dev Containers, code-server) it and the server run next to the files.
- Code, secret, infrastructure and container rules are evaluated in the server process and never use the network.
- Dependency checks send package name, version and ecosystem to the VDB. Responses are cached on disk.
- The server is the same `vulnetix` binary you run in CI, so the rules match `vulnetix scan`.

> [!WHY] Why a language server and not a library
> The rule engine compiles about 1,900 policy modules. A long-running server pays that once and then evaluates an edited file in milliseconds. It also means any LSP client can use it: see [The `vulnetix lsp` server](/vscode/reference/lsp-server/).

## Find the page for your task

| I want to | Read |
|---|---|
| Install it in VS Code, Cursor, VSCodium or another fork | [Install](/vscode/get-started/install/) |
| Check the editor version, platforms, network access and accounts it needs | [Requirements](/vscode/get-started/requirements/) |
| Pre-install it in a Dev Container, Gitpod or code-server image | [Remote workspaces and containers](/vscode/editors/remote-and-containers/) |
| Use an internally vetted CLI binary or a mirror | [The CLI binary](/vscode/configuration/cli-binary/) |
| Move a vulnerable dependency to a safe version | [Fix a vulnerable dependency](/vscode/guides/fix-a-dependency/) |
| Silence a finding for me only, or for the team | [Suppressions](/vscode/findings/suppressions/) |
| Know what leaves my machine | [Privacy and network use](/vscode/configuration/privacy/) |
| Look up a setting | [Settings](/vscode/reference/settings/) |
| Work out why nothing appears | [Troubleshooting](/vscode/guides/troubleshooting/) |

## Related tools

Belai's `/vulnetix review` and the Pix `pr-security-reviewer` agent review code with the same scanners and VDB. Neither needs the extension, and the extension does not start them. See [Related tools](/vscode/reference/related-tools/), and [Architecture](/vscode/reference/architecture/) for how the extension, the server and the VDB fit together.

## Platform IaC

The extension has no config-as-code of its own: it is configured through VS Code settings, and resource-scoped settings can be committed in `.vscode/settings.json`. The organisation documents the CLI validates with `vulnetix config validate` are described in [Platform IaC](/platform-iac/), with a page for every kind in the [kind catalogue](/platform-iac/kinds/catalogue/). Validating `.vulnetix/config/*.yaml` as you type through `vulnetix lsp` is planned.
