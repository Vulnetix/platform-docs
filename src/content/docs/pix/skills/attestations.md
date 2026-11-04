---
title: SBOM and VEX skills
description: The sbom-generate skill writes CycloneDX and SPDX SBOMs, optionally cosign-signed, and vex-publish turns memory.yaml decisions into OpenVEX or CycloneDX VEX.
order: 6
sources: [pix-ai-coding-assistant/skills/sbom-generate/SKILL.md, pix-ai-coding-assistant/skills/vex-publish/SKILL.md]
checked: [pix-ai-coding-assistant@7aebf02]
updated: 02 Nov 2026
---

For a full audit deliverable (SBOM, licences, SARIF and VEX with a checksum manifest) use the [`compliance-bundler`](/pix/agents/overview/#compliance-bundler) subagent. For the formats themselves see [SBOM](/sbom/) and [VEX](/vex/).

## sbom-generate

| | |
|---|---|
| Arguments | `[--format cyclonedx\|spdx\|both] [--sign] [--output PATH]` |
| Runs | `vulnetix scan -o json-cyclonedx` (CycloneDX 1.7), `vulnetix license -o json-spdx` (SPDX 2.3) |
| Optional tools | `cosign` for `--sign`; `syft` for a cross-check |
| Writes | `.vulnetix/sboms/<YYYYMMDDTHHMMSSZ>/sbom.cdx.json`, `sbom.spdx.json`, `sbom.cdx.json.sig.bundle`, `sbom.syft.cdx.json` |

Every run makes a new timestamped directory and never overwrites. `--output` sets the directory instead.

- `--sign` runs `cosign sign-blob --yes <sbom> --bundle <sbom>.sig.bundle`. Without cosign it prints an install hint and skips signing.
- With `syft` installed it also writes `syft <dir> -o cyclonedx-json` and reports the component-count difference, so you can spot what either tool missed.

For a container image SBOM, use [`container-scan`](/pix/skills/scanners/#container-scan) with `--image`.

## vex-publish

| | |
|---|---|
| Arguments | `[--format openvex\|cyclonedx] [--upload]` |
| Runs | `vulnetix triage --provider vulnetix --vex-format <format> -o json`; `vulnetix upload --file <vex>` with `--upload`; `gh pr comment` inside a pull request |
| Writes | `.vulnetix/vex/<timestamp>.vex.json` and a Markdown summary |

It publishes every finding whose `decision.choice` is set to something other than `investigating`, mapping decisions to VEX status as the CLI does (table on [Vulnerability skills](/pix/skills/vulnerabilities/#decision-values)). Entries still `under_investigation` are left out unless you pass `--include-investigating`.

| Flag | Default | Effect |
|---|---|---|
| `--format` | `openvex` | `cyclonedx` emits CycloneDX VEX |
| `--upload` | off | Uploads the statement to Vulnetix; otherwise only the local path is reported |

With `gh` available and a pull request in scope (`GITHUB_REF`, or `gh pr view --json number`), it posts the summary as a PR comment. The report counts statements by status.
