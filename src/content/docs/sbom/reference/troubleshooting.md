---
title: SBOM troubleshooting
nav: Troubleshooting
description: The errors and warnings cdx, aibom, cbom and the bom commands print, what causes each one, and the fix, including CycloneDX validation and overlay rejections.
order: 50
sources: [cli/cmd/cdx.go, cli/cmd/aibom.go, cli/cmd/cbom.go, cli/cmd/bom.go, cli/cmd/bom_enrich.go, cli/cmd/bom_enrich_vdb.go, cli/cmd/bom_corpus.go, cli/cmd/scan.go, cli/internal/cdx/overlay.go, cli/internal/cdx/normalize.go, cli/internal/scanopts/authorship.go, cli/internal/bom/detect.go, cli/internal/bom/read.go, cli/internal/bom/collect.go, vdb-cyclonedx/authorship.go]
checked: [cli@v4.17.1, vdb-cyclonedx@eaf787ce2]
updated: 04 Nov 2026
---

The problems people hit most often when writing an SBOM, AI-BOM or CBOM with the CLI, or reading one with `vulnetix bom`. Errors print as `Error: <message>` on stderr and the command exits `1`. Warnings print and the command carries on.

## Flags and authoring inputs

These are checked before the scan starts, so nothing is read or written.

| Symptom or message | Cause | Fix |
|---|---|---|
| `--spec-version must be one of: 1.6, 1.7` | `cdx`, `aibom` and `cbom` write only CycloneDX 1.6 and 1.7 | Pass `1.6` or `1.7`. The scan family always writes `1.7`. |
| `--output must be one of: pretty (alias: table), json, cyclonedx-json` | A file name given to `-o` | `-o` is the terminal format. Use `--output-file` on `cdx`, `--out` on `bom import` and `bom enrich`. See [vulnetix cdx](/sbom/generate/cdx/#flags). |
| `--bom-property: "vulnetix:..." is in the vulnetix: namespace, which only this product writes; use your own prefix` | `vulnetix:` names are the CLI's measurements | Use your own prefix, such as `acme:team`. See [Licences and properties](/sbom/author/licences-and-properties/). |

## Overlays and validation

| Symptom or message | Cause | Fix |
|---|---|---|
| `CycloneDX 1.6 validation failed (<n> violation(s)):` followed by one line per JSON pointer | After every flag and overlay is applied, the document breaks the schema for its spec version. Nothing is written. | Fix the value at each pointer in the input the line names (see the map below). A 1.7-only member, such as `metadata.distributionConstraints`, always fails with `--spec-version 1.6`. See [Validation](/sbom/author/overview/#validation). |
| `overlay <file>: /specVersion is 1.7 but the document is 1.6; write the overlay for 1.6 or pass --spec-version 1.7` | The overlay and the document are different spec versions | Match `--spec-version`, or remove `specVersion` from the overlay |
| `overlay <file>: /signature cannot be carried in: a signature covers the finished document, so sign the output instead (--sign)` | The overlay has a `signature` | Remove it and pass `--sign`. See [Signing documents](/attestation/sign/signing-documents/). |
| `overlay <file>: <pointer> names a vulnetix: property, which only this product writes; use your own namespace` | A property named `vulnetix:*` at any level of the overlay | Rename it with your own prefix. See [What is rejected](/sbom/author/overlay/#what-is-rejected). |
| `warning: BOM customisation: ...` from `scan`, `sca`, `sast`, `secrets`, `iac` or `containers` | The scan family warns on a bad overlay or flag value instead of failing, and writes the document without it | Read the rest of the line: it is one of the overlay or validation messages above |

Each validation line ends with the input that set the value:

| Pointer starts with | Set by |
|---|---|
| `/metadata/authors` | `--bom-author`, `VULNETIX_BOM_AUTHORS` or an overlay |
| `/metadata/supplier`, `/metadata/manufacturer` | `--bom-supplier`, `--bom-manufacturer` or an overlay |
| `/metadata/licenses`, `/metadata/properties` | `--bom-license`, `--bom-property` or an overlay |
| `/metadata/component` | `--component-*` or an overlay |
| `/metadata/lifecycles` | `--lifecycle` or an overlay |
| `/serialNumber`, `/version` | `--bom-serial`, `--bom-version` or an overlay |
| `/services`, `/compositions`, `/annotations` and other root members | An overlay |

## Results look wrong

| Symptom or message | Cause | Fix |
|---|---|---|
| Packages you expected are missing | Paths matched by `.gitignore` are skipped | Pass `--cdx-include-ignored`. Check no `--no-*` flag is set. See [What it reads](/sbom/generate/cdx/#what-it-reads). |
| Components marked `vulnetix:sbom/carried-over` that you removed | The default output is the scan memory file. Findings already in it are kept, with the components they point at. | Expected: an inventory run never deletes finding history. Write elsewhere with `--output-file` for an inventory-only document. See [Existing findings are kept](/sbom/generate/cdx/#existing-findings-are-kept). |
| `not signed: no OIDC identity in this environment, so there is nothing to sign as` | `--sign` on a machine with no `SIGSTORE_ID_TOKEN` and no GitHub Actions token | The document is written unsigned. See [Attestation troubleshooting](/attestation/reference/troubleshooting/). |

## Reading SBOMs with bom

| Symptom or message | Cause | Fix |
|---|---|---|
| `not a recognised SBOM: expected a CycloneDX or SPDX JSON document` | The file is neither CycloneDX JSON nor SPDX JSON, for example SPDX tag-value or CycloneDX XML | Export JSON from the tool that wrote it. See [Formats read](/sbom/read/import-and-validate/#formats-read). |
| `--out is required: enrichment produces a new document rather than rewriting the input` | `bom enrich` without `--out` | Add `--out <file>`. `-o` is the terminal format. See [Enrich an SBOM](/sbom/read/enrich/). |
| `vulnerability lookup: not authenticated; run 'vulnetix auth login' or pass --no-vulns` | `bom enrich` with no credential | A warning: licences and VEX are still applied. Sign in, or pass `--no-vulns`. |
| `<file> failed attestation verification: <check> (<detail>); ...` | `bom import --verify-attestation` and a check failed | See [Attestation troubleshooting](/attestation/reference/troubleshooting/) for each check |

## Still stuck

Collect the CLI version from `vulnetix version`, the exact command, its output with `-v`, the overlay files you passed, and the `.vulnetix/sbom.cdx.json` (or other output file) it read or wrote. If the problem is a credential, start with [Troubleshooting authentication](/cli/authentication/troubleshooting/).
