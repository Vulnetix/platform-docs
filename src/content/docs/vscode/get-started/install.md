---
title: Install
description: Install `vulnetix.vulnetix` from Open VSX or a downloaded VSIX, choose the stable or pre-release line, and verify the file you installed.
order: 2
sources: [vulnetix-vscode/package.json, vulnetix-vscode/.github/workflows/release.yml, vulnetix-vscode/CHANGELOG.md]
checked: [vulnetix-vscode@9ad08fa]
updated: 02 Nov 2026
status: available
---

The extension identifier is `vulnetix.vulnetix`. It is published to [Open VSX](https://open-vsx.org/extension/vulnetix/vulnetix) only.

> [!CAREFUL] Not on the Visual Studio Marketplace yet
> The release workflow can publish to the Visual Studio Marketplace, but skips it while no `VSCE_PAT` secret is set, and the Marketplace has no `vulnetix.vulnetix` listing today. Searching the Extensions view in Microsoft's VS Code finds nothing. Install the VSIX instead.

## VS Code

Download the VSIX from Open VSX and install it:

```sh
curl -fL -o vulnetix.vsix \
  https://open-vsx.org/api/vulnetix/vulnetix/latest/file/vulnetix.vulnetix-latest.vsix
code --install-extension vulnetix.vsix
```

Or, in the editor, open the Command Palette and run **Extensions: Install from VSIX**, then pick the file.

## Cursor, Windsurf, VSCodium and other forks

Forks use Open VSX as their registry, so the Extensions view finds **Vulnetix** by name. From a terminal:

```sh
cursor      --install-extension vulnetix.vulnetix
windsurf    --install-extension vulnetix.vulnetix
codium      --install-extension vulnetix.vulnetix
code-server --install-extension vulnetix.vulnetix
```

Per-editor notes are in [Supported editors](/vscode/editors/supported-editors/).

## Stable and pre-release

The version's minor number picks the channel, because the Visual Studio Marketplace rejects semver pre-release suffixes.

| Minor | Channel | Published versions |
|---|---|---|
| Even (`0.2.x`) | Stable | `0.2.0` |
| Odd (`0.3.x`) | Pre-release | `0.3.0` |

Open VSX's `latest` alias currently resolves to `0.3.0`, the pre-release, because it is the newest upload. To install a specific version:

```sh
curl -fL -o vulnetix-0.2.0.vsix \
  https://open-vsx.org/api/vulnetix/vulnetix/0.2.0/file/vulnetix.vulnetix-0.2.0.vsix
code --install-extension vulnetix-0.2.0.vsix
```

Pinning the extension does not pin the CLI it downloads; see [The CLI binary](/vscode/configuration/cli-binary/) for that.

## Verify the download

The release workflow builds one VSIX, publishes it to Open VSX and attaches the same file, with a `.sha256` beside it, to the GitHub release `v<version>` in `Vulnetix/vulnetix-vscode`. Compare digests:

```sh
sha256sum vulnetix.vsix
```

> [!CAREFUL] The GitHub repository is private
> `Vulnetix/vulnetix-vscode` and its releases are private, so the `.sha256` files and the issue tracker are only reachable with access to the organisation. Open VSX is the public source.

## After installing

Open a folder. The extension offers to download the CLI on first use; [First run](/vscode/get-started/first-run/) walks through it. Updating the extension is handled by your editor like any other extension.
