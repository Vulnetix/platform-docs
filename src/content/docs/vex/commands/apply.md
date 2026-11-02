---
title: vulnetix vex apply
description: Apply OpenVEX, CycloneDX VEX and CSAF VEX statements to an SBOM, annotate each matched vulnerability, and gate CI on the count that survives VEX.
order: 1
sources: [cli/cmd/vex.go, cli/internal/vex/apply.go, cli/cmd/vex_ingest.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

```bash
vulnetix vex apply --vex <file|dir> --bom <file> [flags]
```

```bash
vulnetix vex apply --vex vendor.openvex.json --bom sbom.cdx.json
vulnetix vex apply --vex ./vex/ --bom sbom.cdx.json --out annotated.cdx.json
vulnetix vex apply --vex csaf.json --bom sbom.spdx.json -o json
vulnetix vex apply --vex ./vex/ --bom sbom.cdx.json --fail-on-effective 0
```

## Flags

| Flag | Default | Description |
|---|---|---|
| `--vex` | | VEX file or directory. Repeatable. Required. |
| `--bom` | | The SBOM to apply statements to. Required. CycloneDX, SPDX or an in-toto envelope, read like [`bom import`](/sbom/read/import-and-validate/). |
| `--out` | | Write the annotated CycloneDX document here |
| `--fail-on-effective` | `-1` | Exit `1` when more than this many vulnerabilities survive VEX. `-1` disables; `0` means none may survive. |
| `--upload` | `false` | Send the VEX documents to Vulnetix, which turns their false-positive and won't-fix statements into suppression rules. Needs an authenticated CLI. |
| `-o`, `--output` | `pretty` | `pretty` (alias `table`) or `json` |

A directory is read one level deep. Every `.json` file in it is tried, and files that are not VEX are skipped and listed rather than failing the run, so `--vex .vulnetix/` works.

## What changes in the SBOM

Nothing is removed. Each vulnerability a statement reaches gains a CycloneDX `analysis` block with the status and, for `not_affected`, the justification, plus these properties:

| Property | Value |
|---|---|
| `vulnetix:vex/source` | The document that asserted it |
| `vulnetix:vex/author` | Who published it |
| `vulnetix:vex/match-basis` | Which [match basis](/vex/get-started/matching/) applied |
| `vulnetix:vex/explain` | A sentence saying why it matched |
| `vulnetix:vex/document-id` | The document's own identifier |

## Counts

```text
Vulnerabilities  Count  Meaning
Total                4  every entry in the document
VEX not affected     2  closed by a not_affected or fixed statement
Annotated            1  statement attached, still live
Effective            2  what remains to act on
```

Only `not_affected` and `fixed` suppress. An `affected` statement attaches its action statement but closes nothing. `--fail-on-effective` gates on Effective, the count that survives VEX.

The run also reports how many statements matched no finding.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Applied, and Effective is within `--fail-on-effective` |
| `1` | `--fail-on-effective` exceeded, `--vex` or `--bom` missing, a document unreadable, or a flag invalid |

A failed `--upload` is a warning and does not change the exit code.
