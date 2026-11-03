---
title: VEX and suppression
nav: Overview
description: The VEX formats the Vulnetix CLI reads and writes, where VEX statements change scan results, and how ignore rules, nosec comments and VEX suppress findings today.
order: 1
sources: [cli/cmd/vex.go, cli/cmd/vex_ingest.go, cli/cmd/suppress.go, cli/cmd/suppress_report.go, cli/internal/vex/read.go, cli/internal/vex/merge.go, cli/internal/triage/vex.go, cli/internal/suppress/suppress.go, vdb-api/internal/handler/v2_cli_vex_ingest.go]
checked: [cli@v4.2.0, vdb-api@4145f0a]
updated: 02 Nov 2026
---

A VEX statement says whether a product is affected by a vulnerability. The CLI writes VEX for its own triage decisions, reads VEX that anyone else wrote, applies it to SBOMs and scans, and sends it to Vulnetix, where false-positive and won't-fix statements become suppression rules.

Two mechanisms hide findings, and they are reported differently:

| Mechanism | Who asserts it | Scope | Reported as |
|---|---|---|---|
| [VEX statements](/vex/scans/vex-file/) (`--vex-file`, `--vex`, declared `VexSource` documents, `vex apply`) | The document's author, often an upstream vendor | Vulnerabilities in an SBOM | "VEX not affected" or "VEX fixed" |
| [Ignore rules](/vex/suppression/ignore-rules/) (`vulnetix ignore`) and [nosec comments](/vex/suppression/nosec-and-test-code/) | Your team | Findings of every scanner | "suppressed by ignore rules" or "by nosec comments" |

## Formats

| Format | Read | Written |
|---|---|---|
| OpenVEX 0.2.0 | yes, recognised by an `@context` on `openvex.dev` | `vex merge`, `bom enrich` companion file, `triage --vex-format openvex`, scan reconciliation files under `.vulnetix/` |
| CycloneDX VEX | yes, any document with `bomFormat: CycloneDX`. Only `vulnerabilities[]` entries with an `analysis` block are statements. | `triage` (default `--vex-format cdx`), `vex apply --out`, `bom enrich` |
| CSAF 2.0 VEX | yes, recognised by a `document.category` containing `vex` | no |

All three are normalised into one statement model, so matching and application work the same whichever format the author used. The CLI validates against the vendored `openvex-0.2.0` and `cyclonedx-1.7` schemas in `cli/schemas/third_party/`.

### Status mapping

| OpenVEX status | CycloneDX `analysis.state` | CSAF product status | Suppresses in `vex apply` and scans |
|---|---|---|---|
| `not_affected` | `not_affected`, `false_positive` | `known_not_affected` | yes |
| `fixed` | `resolved`, `resolved_with_pedigree` | `fixed` | yes |
| `affected` | `exploitable` | `known_affected` | no, adds an action statement |
| `under_investigation` | `in_triage` | `under_investigation` | no |

## Commands

| Command | Does |
|---|---|
| [`vulnetix vex apply`](/vex/commands/apply/) | Apply statements to an SBOM and report total, suppressed and effective counts |
| [`vulnetix vex ls`, `validate`, `merge`](/vex/commands/ls-validate-merge/) | Review, check and combine VEX documents |
| [`--vex-file` and `--vex`](/vex/scans/vex-file/) on `scan`, `sca`, `sast`, `secrets`, `containers`, `iac` | Apply VEX from files, directories and https URLs before the quality gates. `--vex` needs CLI v4.2.0. |
| [`vulnetix ignore`](/vex/suppression/ignore-rules/) (alias `suppress`) | Add, list, remove and sync ignore rules |
| `vulnetix vdb vex get`, `vdb vex list` | Read VEX that Vulnetix holds for a CVE. See [VDB API](/vdb-api/). |

## What reaches Vulnetix

When a command is authenticated, the VEX it read or wrote is sent to `POST /v2/cli.vex-ingest`, and the findings ignore rules and nosec comments hid are reported to `cli.finalize`. See [VEX sent to Vulnetix](/vex/suppression/sent-to-vulnetix/).

A standing source of suppression rules, read from a TEA server, an S3 bucket, a git repository or URLs, is the `VexSource` kind. Since CLI v4.2.0 a scan also reads the `path` and `urls` sources declared under `.vulnetix/config` itself; see [Declared VexSource documents](/vex/scans/vex-file/#declared-vexsource-documents) and [VEX documents as suppression rules](/platform-iac/guides/vex-sources/).

## GitHub Actions

Validate, list, merge or apply VEX documents in a workflow with the [vex GitHub Action](/vex/github-actions/vex/).

## Platform IaC

Suppression rules you write are [`Suppression`](/platform-iac/kinds/suppression/) documents. A standing source of VEX, read from a TEA server, an S3 bucket, a git repository or URLs, is a [`VexSource`](/platform-iac/kinds/vex-source/); see [VEX documents as suppression rules](/platform-iac/guides/vex-sources/). Rules from a local `.vulnetix/memory.yaml` and `vulnetix ignore` stay as they are. See the [kind catalogue](/platform-iac/kinds/catalogue/).
