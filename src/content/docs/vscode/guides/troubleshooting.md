---
title: Troubleshooting
description: Messages the extension shows, what causes each, and how to collect a log and a protocol trace for a bug report.
order: 3
sources: [vulnetix-vscode/src/extension.ts, vulnetix-vscode/src/cli/resolve.ts, vulnetix-vscode/src/cli/download.ts, vulnetix-vscode/src/cli/checksums.ts, vulnetix-vscode/src/cli/version.ts, vulnetix-vscode/src/lsp/client.ts, cli/cmd/lsp.go, cli/internal/lsp/server.go]
checked: [vulnetix-vscode@9ad08fa, cli@4c8c3b7]
updated: 02 Nov 2026
---

Start with **Vulnetix: Show Output** (or click the status bar item). The first lines name the extension version, the protocol and CLI range it expects, the binary it chose and where that came from.

For a protocol trace, set `"vulnetix.trace.server": "verbose"`, reproduce the problem, and copy the output channel.

## Messages

| Message | Cause | Fix |
|---|---|---|
| `Vulnetix needs the Vulnetix CLI to scan. Download it now?` | No usable CLI on `PATH` or in storage | **Download**, or **Set Path** to a binary you have |
| `The Vulnetix CLI configured at "<path>" cannot be used: it does not exist or is not executable` | `vulnetix.cli.path` is wrong | Fix the path, or clear it to let the extension manage a binary |
| `... it did not respond to "lsp --version"` | The configured binary is older than 3.100.0, or not the Vulnetix CLI | Use CLI 3.100.0 or later |
| `... speaks protocol v<n>, but this extension needs v1. Update the CLI.` | CLI too old | Update the CLI |
| `... which is newer than this extension understands (v1). Update the extension.` | Extension too old | Update the extension |
| `Vulnetix does not publish a CLI binary for <platform>/<arch>` | No release asset for your machine | Build from source and set `vulnetix.cli.path` |
| `Checksum mismatch for <asset>` | The downloaded bytes do not match `checksums.txt`, usually a rewriting proxy | Use `vulnetix.cli.path` with a vetted binary, or a mirror |
| `checksums.txt has no entry for "<asset>"` | A mirror without that asset in `checksums.txt` | Fix the mirror |
| `checksums.txt line <n>: expected "<64 hex> <filename>"` | A malformed `checksums.txt` | Fix the mirror |
| `fetching <url> returned 404 Not Found` | Wrong `vulnetix.cli.downloadBaseUrl` layout | Serve `<base>/<tag>/<asset>` |
| `The Vulnetix language server keeps crashing. Scanning is disabled for this session.` | More than three crashes in three minutes | **Show Log**; the crash breadcrumb is in `~/.cache/vulnetix/lsp-crash.json` on Linux. **Restart** to try again. |
| `Vulnetix is not running.` | **Restart Language Server** before a CLI was resolved, or with no folder open | Open a folder; install the CLI |

## Nothing appears

| Check | How |
|---|---|
| A folder is open | The extension does nothing without one |
| The workspace is trusted | The extension is disabled in Restricted Mode |
| The server is enabled | `vulnetix.lsp.enabled` is `true`; the status bar tooltip says so when it is off |
| The file is in the first workspace folder | Other folders of a multi-root workspace are not analysed |
| The file is open | Code findings are produced for open files only |
| You saved | Secrets are checked on save only |
| Not filtered | `vulnetix.diagnostics.minimumSeverity` of `critical` or `high` shows Errors only |
| Not suppressed | Set `vulnetix.diagnostics.showSuppressed` to `true` to see hidden findings as Hints |
| The rules have loaded | The log line `compiled the interactive rule set in ...` appears after startup; a 2-core container takes longer |

## No dependency findings

| Check | How |
|---|---|
| SCA is on | `vulnetix.sca.enabled` is `true`, and the log does not say the CLI "does not report dependency analysis" |
| The VDB is reachable | The log shows `sca: ...` errors when the bulk check fails. Behind a proxy, set `HTTPS_PROXY` in the editor's environment. |
| The manifest parses | A manifest with no parseable packages is skipped |
| Depth | Manifests deeper than 4 directories below the workspace root are not discovered |
| Lockfiles | `vulnetix.sca.annotateLockfiles` is `true` if you expect lockfile findings |

## macOS refuses to run a downloaded binary

A CLI you downloaded in a browser carries the quarantine attribute:

```sh
xattr -d com.apple.quarantine /path/to/vulnetix
```

The extension's own download is not quarantined. Clearing `vulnetix.cli.path` lets it manage the binary instead.

## Reporting a problem

Include the output channel with `vulnetix.trace.server` set to `verbose`, the editor and its version (**Help > About**), the OS, and the output of `vulnetix lsp --version 2>/dev/null`. The log contains file paths; redact them if needed.
