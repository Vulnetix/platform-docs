---
title: Architecture
description: "The three parts behind the extension: the extension itself, the `vulnetix lsp` language server from the CLI, and the Vulnetix vulnerability database, and how each fails."
order: 5
sources: [vulnetix-vscode/package.json, vulnetix-vscode/src/extension.ts, vulnetix-vscode/src/lsp/client.ts, cli/cmd/lsp.go, cli/internal/lsp/server.go, cli/internal/lsp/sca.go]
checked: [vulnetix-vscode@c32c4a1, cli@0b41bb394]
updated: 02 Nov 2026
status: available
---

## The pieces

| Part | What it does |
|---|---|
| The extension | Finds or downloads the CLI, starts the server, forwards settings and watched-file changes, and shows the status bar. It contains no scanning logic. |
| The language server | `vulnetix lsp`, a mode of the same `vulnetix` binary you run in CI. It reads the workspace, evaluates the rules and publishes diagnostics, hovers, inlay hints and quick fixes over the Language Server Protocol on stdin and stdout. |
| The vulnerability database (VDB) | Answers what the local engine cannot: which advisories affect a package version, exploit activity, and safe versions to move to. Only dependency checks call it. |

```
editor (extension host)  --LSP over stdio-->  vulnetix lsp  --reads-->  workspace files
                                                   |
                                                   +--HTTPS (package coordinates only)--> api.vdb.vulnetix.com
```

There is no sign-in in the editor. The server uses the CLI's own credentials (`vulnetix auth login`), or the community key when there are none. See [Privacy and network use](/vscode/configuration/privacy/#credentials).

## Why a language server

- **State.** The rule engine compiles about 1,900 policy modules when it starts. A process started for each check would pay that every time; a long-running server pays it once.
- **Incremental checks.** The server tracks which documents are open and which changed, and re-evaluates the edited file instead of walking the repository. See [When analysis runs](/vscode/findings/when-analysis-runs/).
- **Any editor.** LSP is a standard, so Neovim, Zed, Emacs and other LSP clients can run the same server. See [The `vulnetix lsp` server](/vscode/reference/lsp-server/).

## Why the same binary as CI

Two engines give two answers, and once the editor and the pipeline disagree the editor stops being trusted. The server is the `vulnetix` binary, with the same embedded rule set and the same VDB as `vulnetix scan`, so a finding CI blocks on is one the editor could already show. [Match the editor to CI](/vscode/guides/ci-parity/) lists the differences that remain.

## Where it runs

The extension declares `extensionKind: ["workspace"]`. In a remote session (Remote-SSH, WSL, Dev Containers, Codespaces, code-server) the extension and the server run on the machine that holds the files, not on your laptop. See [Remote workspaces and containers](/vscode/editors/remote-and-containers/).

Browser-only editors (vscode.dev, github.dev) have no process to run, so the extension does not work there. See [Browser-only editors](/vscode/editors/browser-only/).

## Failure behaviour

| Failure | What happens |
|---|---|
| The server exits | The extension restarts it. After more than three exits within three minutes it stops restarting, shows **The Vulnetix language server keeps crashing. Scanning is disabled for this session.** and offers **Show Log** and **Restart**. |
| A server error that does not exit | Written to the **Vulnetix** output channel; the server keeps running |
| The VDB cannot be reached, or the lookup fails | The error is written to the log as `sca: dependency lookup failed: ...` and no dependency diagnostics are published. Code, secret, infrastructure and container rules are local and keep working. |

> [!CAREFUL] No dependency findings is not the same as no vulnerable dependencies
> The editor does not yet show a failed dependency lookup any differently from a clean one. If a manifest you expect to have findings shows none, open the log (click the status bar item, or run **Vulnetix: Show Output**) and look for `sca:` lines. See [No dependency findings](/vscode/guides/troubleshooting/#no-dependency-findings).
