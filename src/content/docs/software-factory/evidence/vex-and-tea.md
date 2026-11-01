---
title: VEX and TEA publishing
nav: VEX and TEA
description: How the security crew's verdicts become OpenVEX documents, and how releases are published to the Transparency Exchange.
order: 11
sources: [belai/internal/vex, vdb-site/docs/factory.md, vdb-site/docs/factory-engine.md]
checked: [belai@35506b9, vdb-site@284f1d6]
updated: 28 Oct 2026
---

## VEX

When the security crew decides a finding, its verdict becomes an OpenVEX 0.2.0 statement. Belai writes it under the repository's `.vulnetix/vex` directory, one document per finding.

- The harness composes every byte of the document. The model's verdict and an allowed justification choose the status.
- Every text the model supplied (the impact, the action, the author) is cleaned to one bounded line first.
- The finding id names the file and must be a plain identifier, so a verdict can never choose a path.

A workflow's `vex` output writes `evidence/vex.openvex.json` to the run's evidence. The audit ledger records each one as `vex.written`.

## TEA

The Transparency Exchange (TEA) publishes your releases with their SBOMs and attestations, so consumers can check what they run.

| Setting or key | Values | Default | Effect |
|---|---|---|---|
| `tea.publish` | `on_release_tag`, `on_merge_main`, `never` | `on_release_tag` | When the factory publishes |
| A repository's **TEA publish** switch | on, off | | Whether this repository publishes at all |
| A `tea_publish` output's `when` | the same values | | Overrides the tenant setting for that workflow |
| A `tea_publish` output's `visibility` | `private`, `public` | | Who can read the release |

TEA releases appear in a run's evidence, in the scanner matrix with how stale each is, and as `tea` events. The `sf:sbom` label builds the SBOM at HEAD and publishes it.

## Related

- [Output node](/software-factory/workflows/nodes/output/)
- [Trust and SLSA](/software-factory/evidence/trust-and-slsa/)
