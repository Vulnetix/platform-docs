---
title: "Planned: VEX documents as suppression rules"
nav: VEX sources
description: Planned, not available. A VexSource kind that reads OpenVEX and CycloneDX VEX documents from TEA, S3, git, a path or URLs and turns their statements into suppressions.
order: 5
sources: [config-schemas/schemas/common.schema.json, cli/cmd/vex.go, cli/cmd/bom_enrich.go]
checked: [config-schemas@9bda9e1, cli@4c8c3b7]
updated: 02 Nov 2026
---

> [!CAREFUL] Planned
> There is no `VexSource` kind, and VEX documents do not become organization suppressions in the console or in CI gates. `vulnetix scan` has no `--vex` flag. What exists today is local: `vulnetix vex apply|ls|validate|merge` and `vulnetix bom enrich --vex` read VEX files, and some commands keep their own `.vulnetix/vex-*.openvex.json` (see [VEX](/vex/)). The justification vocabulary is already in `common.schema.json` as `vexJustification`.

The planned `VexSource` kind reads OpenVEX 0.2.0 and CycloneDX VEX (1.4 to 1.7) documents and keeps a set of suppressions in step with them.

| VEX status | Planned effect |
|---|---|
| `not_affected`, or CycloneDX `not_affected` or `false_positive` | A suppression with the statement's justification, timestamp and author. |
| `fixed`, `resolved` | The finding is marked remediated for that product and version. |
| `affected`, `in_triage`, `exploitable` | Recorded as triage context. Never suppresses. |
| `under_investigation` | An annotation only. |

Statements are matched to findings by purl (also CPE, TEI and `bom-ref`), and a later statement wins. A suppression created from a source belongs to it: it goes when the statement is removed, and cannot be deleted by hand.

Planned source types, exactly one per `VexSource`:

| Type | Reads from |
|---|---|
| `tea` | A TEA product, product release or collection, on Vulnetix's TEA publisher or any TEA server. |
| `s3` | A bucket and prefix, through a cross-account role, or an S3-compatible endpoint (R2, MinIO). |
| `git` | Paths in any git repository over HTTPS, with a credential from the vault. |
| `path` | A local path, read by the CLI at scan time and uploaded as a snapshot on apply. |
| `urls` | HTTPS URLs, fetched with ETag, with an optional `sha256` pin. |

Other planned `spec` fields: `format` (`openvex`, `cyclonedx`, `auto`), `scope`, `trust` (require a signature, allowed authors), `refresh`, and `onError` (`keep-last` or `clear`).

`path`, `urls` and `git` are planned first, with `s3` and `tea` later. `vulnetix scan` is planned to read every `VexSource` for the organization and accept `--vex <path|url>`, so CI gates honour the same suppressions. The [VEX](/vex/) and [Vulnerability management](/vulnerability-management/) segments will document it when it ships.
