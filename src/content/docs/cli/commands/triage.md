---
title: "vulnetix triage"
nav: triage
description: Triage GitHub security alerts or your own scan findings against the VDB, record a decision for each, and write the decisions as VEX.
order: 13
sources: [cli/cmd/gh_dependabot.go, cli/internal/triage/vex.go]
checked: [cli@v4.13.1]
updated: 04 Nov 2026
---

`vulnetix triage` takes a list of vulnerabilities, adds what the VDB knows about each, and records a decision. It has two sources, chosen with `--provider`:

| Provider | Reads | Writes |
|---|---|---|
| `vulnetix` (default) | Vulnerability ids from the arguments, standard input, or the open findings in `.vulnetix/memory.yaml` | A VEX document and the decision in memory |
| `github` | The repository's Dependabot, code scanning and secret scanning alerts, through the GitHub API | A report |

```bash
vulnetix triage [vuln-id...] [flags]
vulnetix triage status [flags]
```

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `-p`, `--provider` | string | `vulnetix` | `github` or `vulnetix` |
| `--tool` | string | `all` | Which findings to triage, comma-separated. `github`: `dependabot`, `codeql`, `secrets`. `vulnetix`: `sca`, `sast`, `iac`, `secrets`, `container`, `quality`, `license`. |
| `--repo` | string | detected | Repository as `owner/repo` |
| `--severity` | string | | Only alerts at or above `low`, `medium`, `high` or `critical` |
| `--all` | bool | `false` | Include dismissed alerts as well as open ones |
| `--concurrency` | int | `5` | Concurrent VDB lookups |
| `--format` | string | `tui` | `tui`, `json` or `text`, for the `github` provider |
| `--include-guidance` | bool | `true` | Add CWE remediation guidance |
| `--vex-format` | string | `cdx` | `vulnetix` provider: `openvex`, `cdx` or `json` |
| `--vex-output` | string | `.vulnetix/sbom.cdx.json` | Where the VEX is written |
| `--memory-dir` | string | `.vulnetix` | The memory directory to read and update |
| `--disable-memory` | bool | `false` | Do not update memory |
| `--pkg`, `--version`, `--ecosystem` | string | | The package, installed version and ecosystem, for a vulnerability that is not in memory |
| `--vex-status` | string | | Decide without prompting: `not_affected`, `affected`, `fixed`, `under_investigation` |
| `--vex-justification` | string | | With `not_affected`: `component_not_present`, `vulnerable_code_not_present`, `vulnerable_code_not_in_execute_path`, `vulnerable_code_cannot_be_controlled_by_adversary`, `inline_mitigations_already_exist` |

`--version` and `--disable-memory` on `triage` are its own flags and shadow the global ones of the same name.

## The VEX it writes

With `--vex-format cdx`, the decisions are written as CycloneDX VEX at spec version 1.5. The document names `Vulnetix` in `metadata.authors` and claims the `operations` lifecycle phase. With `openvex` it writes OpenVEX 0.2.0. See [Files the VEX commands write](/vex/reference/files-written/) for both shapes, and [CycloneDX authoring](/sbom/author/overview/) to set the authorship of an SBOM instead.

## triage status

Checks that what a provider needs is installed and signed in: for `github`, the `gh` CLI. The `vulnetix` provider needs nothing and always reports ready.

| Flag | Type | Default | Description |
|---|---|---|---|
| `--format` | string | `text` | `text` or `json` |

## Examples

```bash
# Dependabot alerts, enriched from the VDB
vulnetix triage -p github --tool dependabot

# Every GitHub security signal at once
vulnetix triage -p github --tool all

# Decide two CVEs without prompting, and write OpenVEX
vulnetix triage CVE-2021-44228 CVE-2022-22965 \
  --vex-status not_affected --vex-justification vulnerable_code_not_in_execute_path \
  --vex-format openvex --vex-output .vulnetix/triage.openvex.json

# Is gh ready?
vulnetix triage status -p github
```
