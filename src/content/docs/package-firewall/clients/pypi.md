---
title: PyPI, pip, uv and Poetry
nav: PyPI
description: Configure pip, uv and Poetry to resolve through the Package Firewall's PyPI Simple index.
order: 4
sources: [cli/pkg/packagefirewall/config.go, package-firewall/internal/ecosystem/pypi/pypi.go, package-firewall/internal/ecosystem/ecosystem.go]
checked: [cli@4c8c3b7, package-firewall@333285f]
updated: 02 Nov 2026
---

| | |
|---|---|
| Index URL | `https://packages.vulnetix.com/pypi/simple/` |
| Ecosystem ID | `pypi` |
| Plan | Pro |
| Mode | filter: blocked files are removed from the Simple index |
| Cooldown | yes |
| Default mirror | `https://pypi.org` |

## Automatic setup

```bash
vulnetix package-firewall pypi
```

| File | Read by |
|---|---|
| `~/.config/pip/pip.conf` | pip, pipenv, pip-tools |
| `~/.config/uv/uv.toml` | uv, which ignores `pip.conf` |

`pip.conf` gets a managed block:

```ini
[global]
index-url = https://YOUR_ORG_UUID:YOUR_API_KEY@packages.vulnetix.com/pypi/simple/
```

`uv.toml` gets:

```toml
[[index]]
url = "https://YOUR_ORG_UUID:YOUR_API_KEY@packages.vulnetix.com/pypi/simple/"
default = true
```

`default = true` makes the firewall uv's only index, with no fallback to pypi.org. The CLI percent-encodes the credentials in the URL.

## Poetry

Poetry reads neither file. Add a primary source and its credentials:

```bash
poetry source add --priority=primary vulnetix https://packages.vulnetix.com/pypi/simple/
poetry config http-basic.vulnetix "$VULNETIX_ORG_ID" "$VULNETIX_API_KEY"
```

## Use and verify

```bash
pip config list
pip cache purge
pip install flask
uv pip install flask
```

## Notes

- A `--index-url` or `--extra-index-url` on the command line, or `PIP_INDEX_URL` in the environment, overrides `pip.conf`. An extra index is a way around the firewall.
- `requirements.txt` with `--hash` pins that name a blocked file fail at download. Update the pin.
