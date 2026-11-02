---
title: vulnetix cbom
description: Discover cryptographic algorithms, certificates and crypto libraries in a project and write a CycloneDX cryptography BOM with post-quantum posture and a CI gate.
order: 1
sources: [cli/cmd/cbom.go, cli/internal/cbom/catalog/algorithms.json, cli/internal/cbom/catalog/libraries.json, cli/cmd/scan.go, cli/cmd/suppress.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

`vulnetix cbom` finds the cryptography a project uses, in source code and configuration, and writes a Cryptography Bill of Materials in CycloneDX. Each algorithm is classified for post-quantum posture and carries a per-country approval matrix.

```bash
vulnetix cbom [path] [flags]
```

## Detection passes

| Pass | Reads | Skipped by |
|---|---|---|
| Source code | Per-language crypto API use (Go `crypto/*`, Python `hashlib` and pyca, Java JCA, Node `crypto`) plus generic call extractors. `SHA256`, `Sha256`, `sha256` and `SHA_256` all resolve to one SPDX algorithm. | `--no-source` |
| Configuration | TLS cipher suites and versions, SSH `Ciphers`, `KexAlgorithms` and `MACs`, JWT `alg`, OpenSSL and IPsec settings | `--no-config` |
| Certificates | X.509 certificates and keys on disk: signature algorithm, key type and size, validity. Key bytes are never read. | `--no-certs` |
| Dependencies | Declared crypto libraries: OpenSSL, Bouncy Castle, libsodium, liboqs, ring, Tink, pyca/cryptography and others | `--no-deps` |

The built-in catalog is version `2026.06.1`: 41 algorithms, 12 crypto libraries and 7 call extractors. It includes the NIST PQC standards (ML-KEM, ML-DSA, SLH-DSA), FN-DSA, HQC, FrodoKEM, Classic McEliece, LMS/HSS, XMSS, the KpqC selections (HAETAE, AIMer, SMAUG-T, NTRU+) and hybrid groups such as X25519MLKEM768. See [Algorithms](/sbom/cbom/algorithms/) and the [Standards matrix](/sbom/cbom/standards-matrix/).

## Post-quantum status

| Status | Meaning |
|---|---|
| `quantum-safe` | Believed secure against a quantum adversary |
| `quantum-vulnerable` | Broken by a large quantum computer (RSA, ECDSA, ECDH and similar) |
| `deprecated` | Weak today, quantum or not (MD5, SHA-1, DES, RC4) |
| `hybrid` | A classical and a post-quantum algorithm combined |

Each algorithm also carries its CycloneDX `nistQuantumSecurityLevel` (0 to 6) and `classicalSecurityLevel`, and its status with NIST, CNSA 2.0, BSI, ACSC, CCCS, NUKIB, AIVD, NCSC and KpqC.

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `[path]`, `--path` | string | `.` | Directory to scan |
| `--depth` | int | `25` | Maximum recursion depth |
| `--ignore` | string, repeatable | | Glob of paths to skip |
| `-o`, `--output` | string | `pretty` | Terminal output: `pretty` (alias `table`), `json` (raw detections), `cyclonedx-json`. The file is written whichever you choose. |
| `--output-file` | string | `<path>/.vulnetix/cbom.cdx.json` | Where the CBOM is written |
| `--spec-version` | string | `1.7` | `1.6` or `1.7` |
| `--catalog` | string | | Catalog file to merge over the built-in one. See [CBOM catalog format](/sbom/cbom/catalog-format/). |
| `--no-builtin-catalog` | bool | `false` | Use only `--catalog` |
| `--no-source` | bool | `false` | Skip the source pass |
| `--no-config` | bool | `false` | Skip the configuration pass |
| `--no-certs` | bool | `false` | Skip the certificate pass |
| `--no-deps` | bool | `false` | Skip the library pass |
| `--fail-on` | string | `none` | Comma-separated statuses that exit `1` when found: `quantum-vulnerable`, `deprecated`, `hybrid`, `quantum-safe` |
| `--no-upload` | bool | `false` | Do not send the CBOM to Vulnetix. It is sent automatically when you are authenticated. |
| `--cbom-include-ignored` | bool | `false` | Include files matched by `.gitignore` |

`--disable-memory` (a global flag) turns off the memory tracking described below.

## Examples

```bash
vulnetix cbom                                   # summary; writes .vulnetix/cbom.cdx.json
vulnetix cbom ./service -o json                 # raw detections as JSON
vulnetix cbom -o cyclonedx-json                 # CycloneDX to stdout, still saved to the file
vulnetix cbom --no-certs --no-deps              # source and configuration only
vulnetix cbom --fail-on quantum-vulnerable      # CI gate
vulnetix cbom --catalog ./extra-algos.json      # extend the built-in catalog
```

## Output document

| Detection | CycloneDX component |
|---|---|
| Algorithm | `cryptographic-asset` with `cryptoProperties` |
| Certificate | `cryptographic-asset` with `assetType: certificate`, plus a `related-crypto-material` key |
| Crypto library | `library` |

Posture and the standards matrix are carried in `vulnetix:crypto/*` properties. The document is schema-validated before it is written. It names `vulnetix-cbom` in `metadata.tools` and claims the `discovery` lifecycle phase.

## Memory and resolved assets

Detected assets are tracked in `.vulnetix/memory.yaml`. An asset that is missing from a later run is marked resolved and recorded in `.vulnetix/vex-cbom.openvex.json`.

## Ignoring an asset

```bash
vulnetix ignore add --category crypto --value SHA-1 --type risk_accepted --reason "legacy checksum only, not a signature"
```

`--value` is the algorithm SPDX id or certificate subject. See [Ignore rules](/vex/suppression/ignore-rules/).

## Inside a scan

`vulnetix scan` runs the same catalog and pipeline as one of its passes. Turn it off with `vulnetix scan --no-cbom`.

| | `vulnetix cbom` | the pass inside `vulnetix scan` |
|---|---|---|
| Passes | chosen with `--no-source`, `--no-config`, `--no-certs`, `--no-deps` | all four |
| CycloneDX file written | yes | no |
| Terminal output | yes | no |
| `--fail-on` gate | yes | no, the scan's own gates decide |
| Memory tracking | yes | yes |
| Sent when authenticated | yes, unless `--no-upload` | yes |

## Privacy

The certificate pass reads metadata only: algorithm, key size, validity. No source content is uploaded.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Written, and no `--fail-on` status found |
| `1` | A `--fail-on` status was found, an unknown status was given, or another error |
