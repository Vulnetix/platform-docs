---
title: Requirements
description: Editor version, the platforms the CLI is published for, workspace trust, network access and accounts.
order: 3
sources: [vulnetix-vscode/package.json, vulnetix-vscode/src/cli/assets.ts, cli/internal/lsp/sca.go, cli/pkg/auth/credentials.go]
checked: [vulnetix-vscode@9ad08fa, cli@4c8c3b7]
updated: 02 Nov 2026
status: available
---

## Editor

| Requirement | Value | Where it is declared |
|---|---|---|
| VS Code API | `^1.96.0`: VS Code 1.96 or a fork built on it or newer | `engines.vscode` |
| Extension host | Node, with a real filesystem and permission to start a process | `extensionKind: ["workspace"]` |
| Workspace trust | Required. Untrusted workspaces are not supported. | `capabilities.untrustedWorkspaces.supported: false` |
| Virtual workspaces | Declared `limited`, but scanning needs files on disk, so nothing is analysed | `capabilities.virtualWorkspaces` |

> [!WHY] Why trust is required
> The extension runs a binary against your files and honours workspace-scoped rule configuration such as `.vulnetix/memory.yaml`. In an untrusted folder that would let a cloned repository influence what runs.

## CLI platforms

The extension downloads a CLI release asset that matches `process.platform` and `process.arch`. These are the eight published builds:

| OS | Architecture (`process.arch`) | Release asset |
|---|---|---|
| Linux | `x64` | `vulnetix-linux-amd64` |
| Linux | `arm64` | `vulnetix-linux-arm64` |
| Linux | `arm` | `vulnetix-linux-arm` |
| Linux | `ia32` | `vulnetix-linux-386` |
| macOS | `arm64` | `vulnetix-darwin-arm64` |
| macOS | `x64` | `vulnetix-darwin-amd64` |
| Windows | `x64` | `vulnetix-windows-amd64.exe` |
| Windows | `arm64` | `vulnetix-windows-arm64.exe` |

Linux builds are statically linked against musl, so one binary runs on Alpine and glibc distributions. On any other platform, such as FreeBSD or 32-bit Windows, the extension logs `Vulnetix does not publish a CLI for <platform>/<arch>` and stops. Build the CLI from source (it needs CGO for the tree-sitter grammars) and set [`vulnetix.cli.path`](/vscode/reference/settings/).

## CLI version

| Contract | Value | Effect when not met |
|---|---|---|
| LSP protocol version | exactly `1` | The binary is refused: "too old, update the CLI" or "too new, update the extension" |
| CLI version range | `>=3.100.0 <4.0.0` | The binary is used, with a warning in the log |
| Version the extension downloads | `v3.100.0` | Fixed per extension release |

## Network

| Host | Used for | Needed for |
|---|---|---|
| `github.com` (or your mirror) | Downloading the CLI and `checksums.txt` | First run, unless the CLI is already installed |
| `api.vdb.vulnetix.com` | Dependency lookups | Dependency findings only |

Code, secret, infrastructure and container rules run with no network at all. Details are on [Privacy and network use](/vscode/configuration/privacy/).

## Account

None. When no credential is found the server uses the CLI's built-in [community](https://www.vulnetix.com/features/community) credentials. If you have already run `vulnetix auth login`, or set `VULNETIX_API_TOKEN` or `VULNETIX_API_KEY` with `VULNETIX_ORG_ID` in the editor's environment, the server uses that instead; the order is on [Privacy and network use](/vscode/configuration/privacy/#credentials). Ranked Safe Harbour versions, which quick fixes and `→ <version>` hints need, are gated by plan; on the community tier the hover card says the fix data was withheld rather than reporting that no fix exists.
