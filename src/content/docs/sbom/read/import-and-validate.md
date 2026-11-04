---
title: Import and validate SBOMs
nav: Import and validate
description: Read CycloneDX, SPDX and in-toto wrapped SBOMs with vulnetix bom import, convert them to CycloneDX, and score field completeness with vulnetix bom validate.
order: 1
sources: [cli/cmd/bom.go, cli/internal/bom/read.go, cli/internal/bom/spdx_read.go, cli/internal/bom/quality.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

`vulnetix bom` reads SBOM documents, including ones produced by Syft, Trivy, cdxgen or BuildKit. Every subcommand goes through the same loader, so a format accepted by `bom import` is accepted by `bom diff`, `bom merge`, `bom tree`, `bom enrich`, the corpus queries and `vex apply --bom`.

## Formats read

| Format | Versions | How it is recognised |
|---|---|---|
| CycloneDX JSON | 1.0 to 1.7 | `bomFormat`, or for 1.0 and 1.1 (which predate `bomFormat`) a `specVersion` with a components array |
| SPDX JSON | 2.2, 2.3 | Package identity is taken from `externalRefs` purl locators |
| in-toto statement | bare, or in a DSSE envelope | The SBOM is unwrapped from `predicate`. This is the shape Syft and BuildKit emit for container SBOMs. |

Unwrapping an envelope is parsing, not trust. To check the signature before using the document, pass `--verify-attestation`.

## One model

Every document becomes a CycloneDX document in memory. That is why an SPDX file and a CycloneDX file can be diffed against each other. What the input originally was is stamped into `metadata.properties`:

| Property | Value |
|---|---|
| `vulnetix:bom/source-format` | `cyclonedx` or `spdx` |
| `vulnetix:bom/source-spec-version` | for example `SPDX-2.3` |
| `vulnetix:bom/source-envelope` | `dsse`, `in-toto`, or absent |
| `vulnetix:bom/source-digest` | SHA-256 of the exact bytes read |
| `vulnetix:bom/source-path` | where it was read from |

When SPDX is converted, its creators become CycloneDX `tools` and `authors` entries, `vulnetix-bom-import` is appended to the tools, and no manufacturer is claimed. The SPDX `documentNamespace` becomes the `serialNumber`, normalised to the `urn:uuid` form CycloneDX 1.6 requires. The same input always converts to the same serial number.

## bom import

```bash
vulnetix bom import <file|-> [flags]
```

```bash
vulnetix bom import sbom.spdx.json
vulnetix bom import sbom.spdx.json --out sbom.cdx.json
syft . -o spdx-json | vulnetix bom import - --out sbom.cdx.json
vulnetix bom import image.att.intoto.jsonl --verify-attestation
```

| Flag | Default | Description |
|---|---|---|
| `--out` | | Write the normalised CycloneDX document to this path |
| `-o`, `--output` | `pretty` | `pretty` (alias `table`) or `json` |
| `--verify-attestation` | `false` | Verify the document's signature first. A failed check fails the import. |
| `--identity`, `--identity-regex`, `--issuer`, `--trusted-root`, `--require`, `--strict` | | The same verification flags as [`attest verify`](/attestation/verify/attest-verify/) |
| `--project`, `--cluster`, `--namespace`, `--environment`, `--tag` | inferred | [Deployment labels](/sbom/reference/document-metadata/) stamped on the output |

Pass `-` to read from stdin.

> [!WHY] Verification is opt-in
> Most SBOMs are unsigned. If every parse were a trust decision, importing an ordinary SBOM would fail. When you do ask for verification and it fails, the import fails too: returning the document beside a failed check would leave the caller holding something it cannot tell it should not trust.

## bom validate

```bash
vulnetix bom validate <file> [flags]
```

```bash
vulnetix bom validate sbom.cdx.json
vulnetix bom validate sbom.spdx.json --min-score 70 -o json
```

| Flag | Default | Description |
|---|---|---|
| `-o`, `--output` | `pretty` | `pretty` (alias `table`) or `json` |
| `--min-score` | `0` | Exit `1` when the completeness score is below this. `0` disables the gate. |

Validation checks two things: that the document parses at its declared spec version, and how many components carry each field a consumer needs.

| Field | Level |
|---|---|
| Unique document identifier | document |
| Creation timestamp | document |
| Author or tool | document |
| Subject component | document |
| Dependency graph | document |
| Component name | component |
| Component version | component |
| Unique identifier (purl or bom-ref) | component |
| Licence | component |
| Cryptographic hash | component |
| Supplier (`supplier`, or `publisher` or `group`; `supplier` counts from CLI v4.17.1) | component |

```text
[OK]    Unique document identifier               1/1
[OK]    Creation timestamp                       1/1
[OK]    Dependency graph                         1/1
[OK]    Component version                        3/3
[WARN]  Cryptographic hash                       1/3  missing from 2 of 3
[WARN]  Supplier                                 1/3  missing from 2 of 3
Completeness score: 88/100
```

The score is the mean of each field's present ratio, as a percentage. Use it to compare documents. Use the breakdown to see which field to fix. There is no NTIA or CISA branded score.

## Exit codes

| Code | `bom import` | `bom validate` |
|---|---|---|
| `0` | Parsed, and verified if asked | Parsed, and at or above `--min-score` |
| `1` | Unreadable document, failed verification, or a bad flag | Unparseable, or below `--min-score` |
