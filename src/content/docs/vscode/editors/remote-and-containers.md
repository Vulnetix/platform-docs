---
title: Remote workspaces and containers
nav: Remote and containers
description: Pre-install the Vulnetix extension and CLI in Remote-SSH, WSL, Dev Containers, Codespaces, code-server, OpenVSCode Server, Gitpod, Coder and Firebase Studio.
order: 2
sources: [vulnetix-vscode/package.json, vulnetix-vscode/src/cli/resolve.ts, vulnetix-vscode/src/shared/launch.ts, cli/install.sh, cli/pkg/cache/cache.go, cli/pkg/auth/credentials.go]
checked: [vulnetix-vscode@9ad08fa, cli@4c8c3b7]
updated: 02 Nov 2026
status: available
---

The extension declares `extensionKind: ["workspace"]`. In a remote session it is installed and runs on the remote side, next to the files, and so does the CLI it starts. Scanning there is as complete as on a laptop.

| Mode | Where the CLI runs | Notes |
|---|---|---|
| Remote - SSH | The SSH host | Downloaded into the remote extension storage on first use |
| WSL | The WSL distribution | The Linux build is static and runs on any distribution |
| Dev Containers | The container | Downloaded again after every rebuild unless it is in the image |
| GitHub Codespaces | The codespace | A 2-core machine takes longer for the first rule load |
| code-server, OpenVSCode Server | The server process | The browser is only the UI |
| Gitpod, Coder, Firebase Studio | The workspace | Workspaces are often ephemeral; bake the CLI in |

## Pre-install the CLI

Without a CLI on `PATH`, every new container or workspace downloads one on first use. Installing it at build time removes that wait. The extension picks up `vulnetix` on `PATH` as long as it speaks LSP protocol 1 (CLI 3.100.0 or later).

```sh
curl -fsSL https://cli.vulnetix.com/install.sh | sh
```

`install.sh` installs to `/usr/local/bin` by default (`--install-dir DIR` or `INSTALL_DIR` to change it) and falls back to `~/.local/bin` when the directory is not writable.

> [!CAREFUL] The install directory must be on the extension host's PATH
> The extension searches `PATH` as the extension host process sees it, which is often not a login shell's `PATH`. The Gitpod, Coder and Firebase Studio snippets below install to `~/.local/bin`. If the extension still offers to download, set `vulnetix.cli.path` to the full path in machine or user settings.

The CLI keeps its dependency lookup cache in `~/.vulnetix/cache/vdb/` and credentials in `~/.vulnetix/credentials.json`. Persist `~/.vulnetix` to keep both across rebuilds.

## Dev Containers

```jsonc
// .devcontainer/devcontainer.json
{
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "postCreateCommand": "curl -fsSL https://cli.vulnetix.com/install.sh | sudo sh",
  "mounts": [
    "source=vulnetix-home,target=/home/vscode/.vulnetix,type=volume"
  ],
  "customizations": {
    "vscode": { "extensions": ["vulnetix.vulnetix"] }
  }
}
```

## code-server

```dockerfile
FROM codercom/code-server:latest
USER root
RUN curl -fsSL https://cli.vulnetix.com/install.sh | sh
USER coder
RUN code-server --install-extension vulnetix.vulnetix
```

On a host with many users, each extension host has its own storage and would download its own copy. Install the CLI once and set the machine-scoped path for everyone:

```jsonc
// Machine settings (on code-server: ~/.local/share/code-server/Machine/settings.json)
{ "vulnetix.cli.path": "/usr/local/bin/vulnetix" }
```

Cap server memory per user with `vulnetix.lsp.memoryLimitMb` (128 to 16384, default 2048).

## OpenVSCode Server

```dockerfile
FROM gitpod/openvscode-server:latest
USER root
RUN curl -fsSL https://cli.vulnetix.com/install.sh | sh
USER openvscode-server
RUN /home/.openvscode-server/bin/openvscode-server --install-extension vulnetix.vulnetix
```

If a container is created per session, install both in the image. Otherwise every session pays for an extension install and a CLI download.

## Gitpod

```yaml
# .gitpod.yml
vscode:
  extensions:
    - vulnetix.vulnetix

tasks:
  - name: vulnetix
    init: curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir "$HOME/.local/bin"
```

For a shared workspace, give the server a service-account credential through the environment instead of a personal login:

```sh
gp env VULNETIX_API_TOKEN=<token>
```

## Coder

Install the extension through the template, and the CLI through the image or a startup script:

```hcl
module "vscode-web" {
  source         = "registry.coder.com/modules/vscode-web/coder"
  agent_id       = coder_agent.main.id
  extensions     = ["vulnetix.vulnetix"]
  accept_license = true
}

resource "coder_script" "vulnetix_cli" {
  agent_id     = coder_agent.main.id
  display_name = "Install Vulnetix CLI"
  run_on_start = true
  script       = "curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir $HOME/.local/bin"
}
```

Pass a credential as an agent environment variable (`env = { VULNETIX_API_TOKEN = ... }` on `coder_agent`). For air-gapped deployments, see [The CLI binary](/vscode/configuration/cli-binary/#mirrors-and-air-gapped-networks).

## Firebase Studio

```nix
# .idx/dev.nix
{ pkgs, ... }: {
  packages = [ pkgs.curl ];
  idx = {
    extensions = [ "vulnetix.vulnetix" ];
    workspace.onCreate = {
      install-vulnetix = "curl -fsSL https://cli.vulnetix.com/install.sh | sh -s -- --install-dir $HOME/.local/bin";
    };
  };
}
```

`onCreate` runs once per workspace, so the CLI persists rather than being fetched on every start. On small workspace tiers, lower `vulnetix.lsp.memoryLimitMb`.

## Credentials in remote workspaces

The server process inherits the extension host's environment, and the CLI resolves credentials in its usual order: `VULNETIX_API_TOKEN`, then `VULNETIX_API_KEY` with `VULNETIX_ORG_ID`, then `.vulnetix/credentials.json` and `~/.vulnetix/credentials.json` on the remote side, then the community fallback. An environment variable is visible to every process in the workspace, so use a service-account credential for shared workspaces.
