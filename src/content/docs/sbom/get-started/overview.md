---
title: SBOM, CBOM and AI-BOM
nav: Overview
description: The CLI commands that write CycloneDX inventories of packages, cryptography and AI usage, and the commands that read, compare and enrich SBOMs from any tool.
order: 1
sources: [cli/cmd/cdx.go, cli/cmd/bom.go, cli/cmd/bom_corpus.go, cli/cmd/bom_enrich.go, cli/cmd/cbom.go, cli/cmd/aibom.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

The Vulnetix CLI writes three kinds of CycloneDX bill of materials and reads SBOMs that any tool produced. Everything here runs locally. When you are authenticated, `cbom` and `aibom` send their result to Vulnetix, and `bom enrich` queries deps.dev, the package registries and the VDB, and sends the VEX it applied. `cdx` (unless `--sign`) and the other `bom` subcommands make no network calls.

## Commands

| Command | Writes or reads | Default output file | Sends to Vulnetix |
|---|---|---|---|
| [`vulnetix cdx`](/sbom/generate/cdx/) (alias `sbom`) | Writes a package SBOM, with AI and crypto components by default | `.vulnetix/sbom.cdx.json` | No |
| [`vulnetix cbom`](/sbom/cbom/overview/) | Writes a cryptography BOM with post-quantum posture | `.vulnetix/cbom.cdx.json` | Yes, unless `--no-upload` |
| [`vulnetix aibom`](/sbom/aibom/overview/) | Writes an AI BOM: coding agents, SDKs, models, AI infrastructure | `.vulnetix/ai-bom.cdx.json` | Yes, unless `--no-upload` |
| [`vulnetix bom import`, `validate`](/sbom/read/import-and-validate/) | Reads CycloneDX 1.0 to 1.7, SPDX 2.2 and 2.3, in-toto envelopes | none, unless `--out` | No |
| [`vulnetix bom diff`, `merge`, `tree`](/sbom/read/diff-merge-tree/) | Compares, combines and walks documents | stdout or `--out` | No |
| [`vulnetix bom ls`, `where`, `skew`, `search`](/sbom/read/corpus-queries/) | Queries a set of documents on disk | none | No |
| [`vulnetix bom enrich`](/sbom/read/enrich/) | Adds licences, vulnerabilities and VEX to a document | `--out` (required) | VEX it applied, when authenticated |

`vulnetix sbom` produces and `vulnetix bom` inspects. `sbom` is an alias of `cdx`, so it always means CycloneDX.

Every command that writes a document can be told who made it, what it describes and what else belongs in it, from flags, environment variables or an overlay file. See [Author and customise](/sbom/author/overview/).

`vulnetix scan` runs the package, crypto and AI inventory passes as part of a full scan. The standalone commands exist for when you want the file, the terminal table, or a CI gate such as `cbom --fail-on`.

## Quick start

```bash
# Package SBOM of the current directory, written to .vulnetix/sbom.cdx.json
vulnetix cdx

# Just packages, no AI or crypto components
vulnetix cdx --no-aibom --no-cbom

# Read an SBOM somebody else made, and convert SPDX to CycloneDX
vulnetix bom import vendor.spdx.json --out vendor.cdx.json

# Fail a pull request that adds a vulnerable component
vulnetix bom diff base.cdx.json head.cdx.json --fail-on vuln-added

# Gate on quantum-vulnerable cryptography
vulnetix cbom --fail-on quantum-vulnerable
```

## Formats

| Format | Written by | Read by `bom` |
|---|---|---|
| CycloneDX JSON | `cdx`, `cbom`, `aibom`, `bom merge`, `bom enrich`, `bom import --out` | 1.0 to 1.7 |
| CycloneDX spec version written | `--spec-version 1.6` or `1.7` (default `1.7`) | |
| SPDX JSON | not written | 2.2, 2.3 |
| in-toto statement, bare or in a DSSE envelope | `cdx --sign` writes `<file>.intoto.jsonl` | yes, the SBOM is unwrapped from `predicate` |

Every document the CLI writes names itself in `metadata.tools` and names the organisation that ran it in `metadata.manufacturer`. See [Document identity and deployment labels](/sbom/reference/document-metadata/).

## Related segments

- [VEX](/vex/) reads and applies VEX statements to an SBOM.
- [Attestation](/attestation/) signs and verifies SBOMs.
- [TEA](/tea/) publishes SBOMs and VEX for a release.
- [SCA](/sca/) scans the same inventory for vulnerabilities.

## GitHub Actions

Run the generators in a workflow with the [sbom](/sbom/github-actions/sbom/), [cbom](/sbom/github-actions/cbom/) and [aibom](/sbom/github-actions/aibom/) GitHub Actions. The sbom action can sign the SBOM, submit it to the GitHub dependency graph, attest it and attach it to a release.

## Platform IaC

There is no config-as-code kind for SBOM generation. Options are flags and environment variables, and the content you state yourself can live in an [overlay file](/sbom/author/overlay/) committed with the code. See the [kind catalogue](/platform-iac/kinds/catalogue/).
