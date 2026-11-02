---
title: VEX the CLI writes
nav: VEX files written
description: Every VEX file the Vulnetix CLI writes under .vulnetix, the triage flags that write VEX, and the authorship fields those documents carry.
order: 1
sources: [cli/cmd/reconcile.go, cli/cmd/malscan.go, cli/cmd/cbom.go, cli/cmd/aibom.go, cli/cmd/fix_autofix.go, cli/cmd/jail_artifacts.go, cli/cmd/defend.go, cli/cmd/gh_dependabot.go, cli/internal/triage/vex.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

## Files under `.vulnetix/`

| Path | Written by | Contents |
|---|---|---|
| `vex.openvex.json` | scan reconciliation | Resolutions for SAST, secrets, IaC and container findings |
| `vex-malscan.openvex.json` | `malscan`, reconciliation | Malware findings |
| `vex-cbom.openvex.json` | `cbom`, reconciliation | Crypto assets no longer found |
| `vex-aibom.openvex.json` | `aibom`, reconciliation | AI components no longer found |
| `vex-risk-accepted.json` | `fix` autofix | Risks accepted during autofix |
| `vex-compensating-controls.json` | `defend` | Compensating controls |
| `jail.vex.json` | `jail` | The jail verdict |
| `sbom.cdx.json` | `triage` (default `--vex-output`) | CycloneDX VEX analysis on the SBOM's vulnerabilities |

`vulnetix vex apply --vex .vulnetix/ --bom .vulnetix/sbom.cdx.json` reads all of them. Non-VEX JSON files in the directory are skipped.

## Writing VEX from triage

`vulnetix triage --provider vulnetix` records a decision about a vulnerability and writes it as VEX.

| Flag | Default | Description |
|---|---|---|
| `--vex-format` | `cdx` | `openvex`, `cdx` or `json` |
| `--vex-output` | `.vulnetix/sbom.cdx.json` | Where the VEX is written |
| `--vex-status` | | Non-interactive status: `not_affected`, `affected`, `fixed`, `under_investigation` |
| `--vex-justification` | | For `not_affected`: `component_not_present`, `vulnerable_code_not_present`, `vulnerable_code_not_in_execute_path`, `vulnerable_code_cannot_be_controlled_by_adversary`, `inline_mitigations_already_exist` |

```bash
vulnetix triage CVE-2024-0001 --provider vulnetix --vex-format openvex --vex-output .vulnetix/triage.openvex.json \
  --vex-status not_affected --vex-justification vulnerable_code_not_in_execute_path
```

The rest of `triage` is documented with [vulnerability management](/vulnerability-management/).

## What the documents say about themselves

| Format | Field | Value |
|---|---|---|
| OpenVEX | `@context` | `https://openvex.dev/ns/v0.2.0` |
| OpenVEX | `author` | `Vulnetix CLI` unless the caller names one |
| OpenVEX | `tooling` | `vulnetix-cli` |
| OpenVEX | statement `timestamp` | When the decision was made, where known, not when the file was written |
| CycloneDX VEX | `metadata.authors` | Vulnetix |
| CycloneDX VEX | `metadata.tools.components` | `vulnetix-vex` at the CLI version |
| CycloneDX VEX | `metadata.lifecycles` | `operations` |

OpenVEX statements keep to the 0.2.0 schema: an `affected` statement says what to do in `action_statement`; a justification is written only on `not_affected` and only from the OpenVEX list, with any other reason in `status_notes`; a product is its versioned purl in `@id`; `fixed` stays `fixed`.
