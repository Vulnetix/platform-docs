---
title: Conda
description: Point conda channels at the Package Firewall, which streams repodata unchanged and gates package downloads.
order: 11
sources: [package-firewall/internal/ecosystem/conda/conda.go, package-firewall/internal/ecosystem/ecosystem.go, cli/pkg/packagefirewall/ecosystem.go]
checked: [package-firewall@333285f, cli@4c8c3b7]
updated: 02 Nov 2026
---

| | |
|---|---|
| Channel URL | `https://packages.vulnetix.com/conda/<channel>` |
| Ecosystem ID | `conda` |
| Plan | Pro |
| Mode | gate: `repodata.json` is streamed unchanged; `.conda` and `.tar.bz2` downloads are checked |
| Cooldown | no (gate mode) |
| Default mirror | `https://conda.anaconda.org` |
| Automatic setup | none: `vulnetix package-firewall conda` exits 1 |

> [!WHY] Why Conda is gated, not filtered
> conda-forge's `noarch/repodata.json` is about 184 MB. Filtering means holding and policy-checking the whole document, which timed out at the proxy. Gating serves the index as it is and refuses a blocked version when conda downloads it.

A resolve can therefore pick a blocked version; the install then fails on that package's download with the block status. Pin an allowed version and re-run.

## Configuration

`~/.condarc`:

```yaml
channels:
  - https://packages.vulnetix.com/conda/conda-forge
default_channels:
  - https://packages.vulnetix.com/conda/main
channel_alias: https://packages.vulnetix.com/conda
```

The channel path is appended to the mirror, so `/conda/conda-forge` fetches `https://conda.anaconda.org/conda-forge`. conda authenticates with `~/.netrc`, so run any `vulnetix package-firewall <ecosystem>` once, or write the [netrc entry](/package-firewall/get-started/authentication/#what-the-cli-writes) yourself.

## Use and verify

```bash
conda config --show channels
conda clean -i
conda install numpy
```
