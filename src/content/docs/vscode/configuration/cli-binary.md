---
title: The CLI binary
description: How the extension chooses, downloads and verifies the `vulnetix` binary, and how to use a vetted binary, an internal mirror, a proxy or a shared install.
order: 1
sources: [vulnetix-vscode/src/cli/resolve.ts, vulnetix-vscode/src/cli/download.ts, vulnetix-vscode/src/cli/checksums.ts, vulnetix-vscode/src/cli/assets.ts, vulnetix-vscode/src/cli/version.ts, vulnetix-vscode/src/constants.ts, vulnetix-vscode/package.json, cli/cmd/lsp.go, cli/pkg/vdb/client.go]
checked: [vulnetix-vscode@9ad08fa, cli@4c8c3b7]
updated: 02 Nov 2026
---

The extension needs a `vulnetix` binary that answers `vulnetix lsp --version` with LSP protocol `1`. It never runs `vulnetix update`: the CLI's self-updater would replace the binary under a running server.

## Resolution order

| Order | Candidate | Source shown in the log | On failure |
|---|---|---|---|
| 1 | `vulnetix.cli.path` | "the vulnetix.cli.path setting" | Error, no fallback |
| 2 | `vulnetix` on `PATH` | "your PATH" | Next candidate |
| 3 | `<globalStorage>/cli/<tag>/vulnetix`, newest tag by version | "a previously downloaded copy" | Next candidate |
| 4 | Download | "a fresh download" | Error notification with **Show Log** |

A configured path that does not exist, is not executable, does not answer `lsp --version` within 10 seconds, or speaks another protocol version fails with `The Vulnetix CLI configured at "<path>" cannot be used: <reason>`. The extension does not quietly use a different binary, because a configured path is usually one your organisation vetted.

## Compatibility

`vulnetix lsp --version` prints one line of JSON on stdout (the banner, on a terminal, goes elsewhere):

```sh
vulnetix lsp --version 2>/dev/null
```

```json
{"protocolVersion":1,"cliVersion":"v3.154.0","commit":"d84e157c4","buildDate":"2026-11-01T21:04:27Z","goVersion":"go1.25.0","platform":"linux/amd64","capabilities":["sast","secrets","iac","containers","sca"],"rulesEmbedded":0}
```

| Check | Rule | Result |
|---|---|---|
| `protocolVersion` | Must equal `1` | Lower: "Update the CLI". Higher: "Update the extension". The binary is refused. |
| `cliVersion` | Should satisfy `>=3.100.0 <4.0.0` | Outside the range: used, with a warning in the log. A non-numeric version (development build) is not checked. |
| `capabilities` | Should include `sca` | Missing: dependency analysis is unavailable and the log says so |

## The managed download

| Item | Value |
|---|---|
| Version | `v3.100.0`, fixed per extension release (`vulnetix.cliPinnedVersion` in `package.json`) |
| Base URL | `https://github.com/Vulnetix/cli/releases/download`, or `vulnetix.cli.downloadBaseUrl` |
| Asset URL | `<base>/<tag>/<asset>`, for example `.../v3.100.0/vulnetix-linux-amd64` |
| Checksums URL | `<base>/<tag>/checksums.txt` |
| Installed to | `<globalStorage>/cli/v3.100.0/vulnetix` (`vulnetix.exe` on Windows) |

The order is the security property:

1. Fetch `checksums.txt`. Every non-blank line must be `<64 lowercase hex> <filename>` (GNU `sha256sum` format); any other line aborts.
2. Look up the exact asset name. A missing entry aborts: `Refusing to install an unverified binary`.
3. Stream the asset to a temporary file under `.tmp/`, hashing as it is written.
4. Compare. A mismatch deletes the file and reports expected and actual digests.
5. `chmod 755`, then rename into place, so no process sees a partial binary.

There is no option to skip verification. **Vulnetix: Install CLI** runs this download without the prompt, but only when no binary has been resolved in the window yet.

To use a newer CLI than `v3.100.0`, install it yourself on `PATH` (it wins over the managed copy) or set `vulnetix.cli.path`.

## Use a vetted binary

```jsonc
// User or machine settings. A workspace cannot set this.
{ "vulnetix.cli.path": "/opt/vulnetix/3.154.0/vulnetix" }
```

**Vulnetix: Set CLI Path** writes the same setting through a file picker. A binary set this way is never updated by the extension.

## Mirrors and air-gapped networks

A mirror must serve the release layout, including `checksums.txt`:

```
https://artifacts.internal/vulnetix/v3.100.0/checksums.txt
https://artifacts.internal/vulnetix/v3.100.0/vulnetix-linux-amd64
```

```jsonc
{ "vulnetix.cli.downloadBaseUrl": "https://artifacts.internal/vulnetix" }
```

With no route to `api.vdb.vulnetix.com`, code, secret, infrastructure and container findings still work, because they are local rule evaluation. Dependency findings do not appear.

## Proxies

Two different processes make requests:

| Request | Made by | Proxy support |
|---|---|---|
| CLI download | The extension host (`fetch`) | Whatever proxy support your editor applies to extension `fetch` calls. If it fails, use a mirror or `vulnetix.cli.path`. |
| Dependency lookups | The `vulnetix lsp` process | `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` from its environment (Go `http.ProxyFromEnvironment`) |

The server inherits the editor's environment. On macOS and Linux, launch the editor from a shell that sets the proxy variables; an editor started from the Dock or an application menu does not read your shell profile.

## Shared machines

On a multi-user host every user's extension host has its own storage and downloads its own copy. Install once and set `vulnetix.cli.path` in machine settings for everyone.

> [!WHY] Why these settings are machine-scoped
> `vulnetix.cli.path`, `vulnetix.cli.downloadBaseUrl` and `vulnetix.cli.autoUpdate` decide which code runs. Machine scope means a repository's committed `.vscode/settings.json` cannot point the extension at a binary of its choosing.

## Updates

`vulnetix.cli.autoUpdate` (`never`, `prompt`, `auto`; default `prompt`) is contributed but nothing reads it yet. The extension does not check for newer CLI releases.
