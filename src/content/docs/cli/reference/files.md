---
title: Files and directories
nav: Files
description: Everything the CLI reads from and writes to a project's .vulnetix/ directory and the user's ~/.vulnetix/ directory, and which command owns each file.
order: 4
sources: [cli/cmd/scan.go, cli/cmd/malscan.go, cli/cmd/cbom.go, cli/cmd/aibom.go, cli/cmd/analyze.go, cli/cmd/defend.go, cli/cmd/fix_autofix.go, cli/cmd/jail_artifacts.go, cli/cmd/license_policy.go, cli/cmd/config_documents.go, cli/cmd/config_ai_firewall.go, cli/internal/agent/policy.go, cli/internal/agent/capabilities.go, cli/internal/attest/roots.go, cli/pkg/auth/credentials.go, cli/internal/update/state.go, cli/pkg/cache/cache.go, cli/pkg/vdb/token_store.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

## Project: `.vulnetix/`

Created in the scanned directory (`--path`, or the current directory). Results are rewritten on each run. Add `.vulnetix/` to `.gitignore` unless you commit the input files below on purpose; if you do, ignore the outputs and `credentials.json` explicitly.

### Outputs

| File | Written by | Contents |
|---|---|---|
| `sbom.cdx.json` | `scan`, `sca`, `containers`, `license`, `cdx` | CycloneDX SBOM with vulnerabilities and VEX analysis. Read by `report`. |
| `sast.sarif` | `scan`, `sast`, `secrets`, `iac` | SARIF for rule findings; only when there are findings |
| `sca.sarif` | every scan that runs SCA | SARIF for dependency findings. Written even when clean. See [SARIF reference](/cli/reference/sarif/). |
| `license.sarif` | `license` | SARIF for licence findings. Written even when clean. |
| `code-scanning/<kind>.sarif` | `gha publish code-scanning` | The per-kind SARIF that was uploaded to GitHub |
| `containers.sarif` | `containers`, `scan --only containers` | SARIF for container file findings |
| `malscan.sarif` | `malscan`, the malscan pass of `scan` | SARIF for malware findings |
| `cbom.cdx.json` | `cbom` (and `scan` unless `--no-cbom`) | CycloneDX CBOM |
| `ai-bom.cdx.json` | `aibom` (and `scan` unless `--no-aibom`) | CycloneDX AIBOM |
| `analyze.report.json` | `analyze` | The analysis report |
| `memory.yaml` | `scan` and the scanners, `ignore` | Scan state, history and local suppression rules. Skipped with `--disable-memory`. |
| `detection-rules.rules` | `scan` | IDS rules returned for findings with no fix |
| `vex-autofix.json` | `fix`, `scan --fix` | VEX for findings an applied fix resolved |
| `vex-risk-accepted.json` | `fix` | VEX for findings accepted as risk |
| `vex-compensating-controls.json`, `controls.json` | `defend` | Recorded controls and their VEX |
| `jail.sarif`, `jail.vex.json` | `jail` | The jail verdict as SARIF and VEX |

### Inputs you may commit

| File | Read by | Documented in |
|---|---|---|
| `config/` (`*.yaml`, `*.yml`, `*.json`) | `config validate`, `config plan`, `config apply` | [Platform IaC](/platform-iac/) |
| `ai-firewall.yaml` | `config validate`, `ai-firewall apply`, `ai-firewall export` | [AI Firewall](/ai-firewall/) |
| `license-policy.yaml`, `license-exceptions.yaml` | `config validate`, `license`, `scan` | [SCA](/sca/), [LicenseExceptions](/platform-iac/kinds/license-exceptions/) |
| `agent.yaml` | `agent hook` | [Pix](/pix/) |
| `capabilities.yaml` | `agent capabilities` (written) | [Pix](/pix/) |
| `trusted-root.pem` | `attest` | [Attestation](/attestation/) |

### Credentials

| File | Written by |
|---|---|
| `credentials.json` | `auth login --store project`, and the GitHub Action when given `api-key`. Never commit it; see [Storage](/cli/authentication/storage/#project-file). |

## User: `~/.vulnetix/`

| Path | Contents |
|---|---|
| `credentials.json` | Home credential, or keychain metadata (mode `0600`). Moved by `VULNETIX_CREDENTIALS_DIR`. |
| `state/` | Time of the last update check |
| `cache/vdb/<version>/` | VDB response cache, one directory per CLI version; old versions are removed at start |
| `cache/tokens/` | SigV4 token cache (`VULNETIX_NO_TOKEN_CACHE` turns it off) |
| `cache/licenses/` | Licence lookups (`VULNETIX_NO_LICENSE_CACHE`) |
| `cache/binaries/` | Binary version detections (`VULNETIX_NO_BINARY_CACHE`) |
| `memory.yaml` | Used by `env` when the current directory is not in a git repository |

## User cache directory

Under the OS user cache directory (`~/.cache` on Linux, `~/Library/Caches` on macOS, `%LocalAppData%` on Windows):

| Path | Contents | Moved by |
|---|---|---|
| `vulnetix/sast/` | SAST rule results for unchanged files | `VULNETIX_SAST_CACHE_DIR` |
| `vulnetix/graph/` | Per-file graph facts | `VULNETIX_GRAPH_CACHE_DIR` |
| `vulnetix/malscan/definitions/` | Malscan threat-intel definitions | `VULNETIX_MALSCAN_DEFS_DIR` |

## Other files

| Path | Written by |
|---|---|
| `~/.netrc` (`%USERPROFILE%\_netrc`) | `package-firewall <ecosystem>`: the `machine packages.vulnetix.com` entry. See [netrc](/cli/authentication/netrc/). |
| `.github/workflows/vulnetix-scanners.yml` | `gha setup` |
