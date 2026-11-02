---
title: The vulnetix lsp server
nav: vulnetix lsp
description: Flags, the version handshake, the LSP methods and capabilities the server implements, settings it accepts, exit codes, and how to run it from Neovim or another LSP client.
order: 3
sources: [cli/cmd/lsp.go, cli/cmd/root.go, cli/internal/lsp/server.go, cli/internal/lsp/settings.go, cli/internal/lsp/protocol/types.go, cli/internal/lsp/protocol/version.go, cli/internal/lsp/protocol/vulnetix.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

`vulnetix lsp` runs the Vulnetix CLI as a Language Server Protocol server over stdin and stdout. The VS Code extension starts it for you; any other LSP client can start it the same way.

Nothing is written to stdout except protocol messages. Logs go to stderr, or to `--log-file`.

## Flags

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--version` | bool | `false` | Print the handshake as one line of JSON and exit |
| `--log-file` | string | `""` | Append server logs to this file (created `0600`) instead of stderr |
| `--debounce-ms` | int | `400` | Quiet period after a change before analysis runs |
| `--memory-limit-mb` | int | `2048` | Soft memory ceiling, applied as the Go runtime memory limit and as the cap on document content held. `0` disables it. |
| `--no-analytics` | bool | `false` | Global flag. Disables CLI analytics. The VS Code extension always passes it. |

The server skips the CLI's update check, so it never polls GitHub.

## Handshake

```sh
vulnetix lsp --version 2>/dev/null
```

```json
{"protocolVersion":1,"cliVersion":"v3.154.0","commit":"d84e157c4","buildDate":"2026-11-01T21:04:27Z","goVersion":"go1.25.0","platform":"linux/amd64","capabilities":["sast","secrets","iac","containers","sca"],"rulesEmbedded":0}
```

| Field | Meaning |
|---|---|
| `protocolVersion` | Contract version for the `vulnetix/*` methods. Bumped only on a breaking change; added fields never bump it. A client should require an exact match. |
| `capabilities` | Analysis families this build supports |
| `rulesEmbedded` | `0` in the handshake; `vulnetix/serverInfo` reports the real count and `ruleKinds` once rules are loaded |

## Methods

| Method | Direction | Notes |
|---|---|---|
| `initialize` | client to server | Reads the first workspace folder (or `rootUri`) and `initializationOptions` as settings. Returns promptly; rules load in the background. |
| `initialized`, `shutdown`, `exit`, `$/setTrace` | client to server | Standard |
| `textDocument/didOpen`, `didChange`, `didSave`, `didClose` | client to server | Full-document sync. Save notifications without text. |
| `textDocument/publishDiagnostics` | server to client | Findings from every family, merged per document after filtering and suppression |
| `textDocument/hover` | client to server | Dependency card in manifests. Advertised only when `sca.enabled` is true at `initialize`. |
| `textDocument/codeAction` | client to server | `quickfix` version bumps. Same condition. |
| `textDocument/inlayHint` | client to server | Dependency status hints. Same condition. |
| `workspace/didChangeConfiguration` | client to server | Settings, either under a `vulnetix` key or bare |
| `workspace/didChangeWatchedFiles` | client to server | Manifest and `memory.yaml` changes. The client must register the watchers. |
| `vulnetix/serverInfo` | client to server | Handshake fields plus `rulesEmbedded` and `ruleKinds` |
| `vulnetix/scanWorkspace` | client to server | Full scan with optional `features`, `refresh` and `gitHistory`. Cancellable with `$/cancelRequest`. No VS Code command calls it yet. |

Position encoding is `utf-16`. A request before `initialize` gets `-32002` (server not initialized); an unknown request gets `-32601`; a cancelled workspace scan gets `-32800`.

## Settings

The server reads the same keys as the extension's settings, without the `vulnetix.` prefix, nested (`{"sca": {"enabled": true}}`) or dotted (`{"sca.enabled": true}`):

| Key | Type | Default | Valid range |
|---|---|---|---|
| `scan.debounceMs` | int | `400` | 0 to 5000 |
| `lsp.memoryLimitMb` | int | `2048` | 128 to 16384 |
| `diagnostics.minimumSeverity` | string | none (show all) | `critical`, `high`, `medium`, `low`, `info` |
| `diagnostics.mapLowTo` | string | `information` | `information`, `hint` |
| `diagnostics.showSuppressed` | bool | `false` | |
| `sca.enabled` | bool | `true` | |
| `sca.safeHarbourStrategy` | string | `safest` | `safest`, `stable`, `latest`, `rolling` |
| `sca.maxMajorBump` | int | `0` | 0 to 100 |
| `sca.annotateLockfiles` | bool | `true` | |
| `memory.path` | string | `.vulnetix` | |
| `suppressions` | array of `{ruleId, findingId, path, reason}` | none | at least one of the first three |

Invalid values are logged and replaced with the default.

## Exit and crashes

| Situation | Behaviour |
|---|---|
| `exit` after `shutdown` | Exit code `0` |
| Panic in a handler | Stack trace to the log, a breadcrumb at `<user cache dir>/vulnetix/lsp-crash.json` (`~/.cache/vulnetix/lsp-crash.json` on Linux), exit code `70` |

The VS Code extension restarts a crashed server up to three times in three minutes, then stops and offers **Show Log** and **Restart**.

## Use from Neovim

Neovim 0.10 or later, with `vulnetix` on `PATH`:

```lua
-- init.lua
vim.api.nvim_create_autocmd('FileType', {
  pattern = { 'json', 'yaml', 'toml', 'go', 'gomod', 'python', 'javascript', 'typescript', 'dockerfile', 'terraform' },
  callback = function(args)
    vim.lsp.start({
      name = 'vulnetix',
      cmd = { 'vulnetix', 'lsp', '--no-analytics' },
      root_dir = vim.fs.root(args.buf, { '.git' }),
      init_options = { sca = { safeHarbourStrategy = 'safest' } },
    })
  end,
})
```

Any other client needs the same three things: the command `vulnetix lsp`, a workspace root, and file watchers on manifests and `.vulnetix/memory.yaml` if you want changes made outside the editor picked up.
