---
title: Supported editors
description: Which VS Code-based editors run the extension, where each installs it from, and the install command for each.
order: 1
sources: [vulnetix-vscode/package.json, vulnetix-vscode/website/content/docs/editors/]
checked: [vulnetix-vscode@9ad08fa]
updated: 02 Nov 2026
---

Support depends on one thing: whether the extension host is a Node process with a real filesystem. Anywhere it is, everything works, on a laptop or on a server. The editor's name does not matter, as long as it implements the VS Code extension API at 1.96 or later and can install from Open VSX or a VSIX.

| Editor | Installs from | Extension host | Works |
|---|---|---|---|
| VS Code | VSIX from Open VSX (not on the Marketplace yet) | Local, or remote over SSH, WSL, containers | Yes |
| Cursor | Open VSX | Local | Yes |
| Windsurf | Open VSX | Local | Yes |
| VSCodium | Open VSX | Local | Yes |
| Kiro | Open VSX | Local | Yes |
| Positron | Open VSX | Local | Yes |
| Trae | Open VSX | Local | Yes |
| Eclipse Theia | Open VSX, or a plugins directory | Local or server | Yes |
| code-server | Open VSX | The server | Yes |
| OpenVSCode Server | Open VSX | The server | Yes |
| Gitpod | Open VSX | The workspace | Yes |
| Coder | Open VSX, or a private registry | The workspace | Yes |
| Firebase Studio | Open VSX | The workspace VM | Yes |
| vscode.dev, github.dev | n/a | Browser only | No: see [Browser-only editors](/vscode/editors/browser-only/) |

The server-hosted editors are covered on [Remote workspaces and containers](/vscode/editors/remote-and-containers/), with image and template snippets.

## Install commands

| Editor | Command |
|---|---|
| VS Code | `code --install-extension vulnetix.vsix` after downloading it ([Install](/vscode/get-started/install/)) |
| Cursor | `cursor --install-extension vulnetix.vulnetix` |
| Windsurf | `windsurf --install-extension vulnetix.vulnetix` |
| VSCodium | `codium --install-extension vulnetix.vulnetix` |
| code-server | `code-server --install-extension vulnetix.vulnetix` |
| OpenVSCode Server | `/home/.openvscode-server/bin/openvscode-server --install-extension vulnetix.vulnetix` (path in the official image) |
| Kiro, Positron, Trae | Extensions view, search **Vulnetix**, or **Extensions: Install from VSIX** |

When an editor has search disabled, download the VSIX and use **Extensions: Install from VSIX**:

```sh
curl -fL -o vulnetix.vsix \
  https://open-vsx.org/api/vulnetix/vulnetix/latest/file/vulnetix.vulnetix-latest.vsix
```

## Editor notes

### Cursor, Windsurf, Kiro, Trae

Agent edits are written to files like any other edit, so the server checks them as they land. Scanning is rule evaluation in a local process: it uses no model quota and sends nothing to a model provider.

### VSCodium

VSCodium's telemetry is off by default. The extension adds nothing on top: it always starts the server with `--no-analytics`, and when the editor's telemetry is off it also sets `VULNETIX_NO_ANALYTICS=1` and `DO_NOT_TRACK=1`. See [Privacy and network use](/vscode/configuration/privacy/).

### Eclipse Theia

Theia loads VSIX files from a plugins directory:

```sh
mkdir -p plugins
curl -fL -o plugins/vulnetix.vsix \
  https://open-vsx.org/api/vulnetix/vulnetix/latest/file/vulnetix.vulnetix-latest.vsix
```

Start Theia with `--plugins=local-dir:./plugins`, or declare it in the application's `package.json`:

```json
{
  "theiaPluginsDir": "plugins",
  "theiaPlugins": {
    "vulnetix.vulnetix": "https://open-vsx.org/api/vulnetix/vulnetix/latest/file/vulnetix.vulnetix-latest.vsix"
  }
}
```

The extension uses a small API surface (diagnostics, a status bar item, an output channel, a language client), so Theia builds with partial VS Code API coverage are unlikely to be a problem.

### Positron

Python and R manifests are checked like any other. Code inside `.ipynb` cells is not analysed: the server only checks documents with the `file` scheme, and notebook cells are not.

## An editor not listed

If it is a VS Code fork at 1.96 or newer and can install from Open VSX, it will almost certainly work. Check the base version under **Help > About**.
