---
title: Enrich an SBOM
description: Resolve missing licences, attach VDB vulnerabilities and apply VEX to another tool's SBOM with vulnetix bom enrich, keeping its original authorship and digest.
order: 4
sources: [cli/cmd/bom_enrich.go, cli/cmd/bom_enrich_vdb.go, cli/cmd/vex_ingest.go, vdb-cyclonedx/properties.go]
checked: [cli@4c8c3b71c, vdb-cyclonedx@eaf787c]
updated: 02 Nov 2026
---

`vulnetix bom enrich` reads an SBOM, adds what it can, and writes a standards-valid CycloneDX document. The output is still an SBOM, not a Vulnetix report.

```bash
vulnetix bom enrich <file> --out <file> [flags]
```

```bash
vulnetix bom enrich sbom.spdx.json --out enriched.cdx.json
vulnetix bom enrich sbom.cdx.json --out enriched.cdx.json --vex vendor.openvex.json
vulnetix bom enrich sbom.cdx.json --out enriched.cdx.json --no-vulns
vulnetix bom enrich sbom.cdx.json --out enriched.cdx.json --keep-original --sign
```

| Flag | Default | Description |
|---|---|---|
| `--out` | | Required. Where the enriched document is written. |
| `--vex` | | VEX file or directory to apply. Repeatable. |
| `--no-licenses` | `false` | Skip licence resolution |
| `--no-vulns` | `false` | Skip the vulnerability lookup |
| `--no-vex` | `false` | Skip VEX application |
| `--keep-original` | `false` | Also write the input as `<out>.original<ext>` |
| `--sign` | `false` | Sign the result with this machine's OIDC identity |
| `-o`, `--output` | `pretty` | `pretty` (alias `table`) or `json`. This is the terminal format, not the file. |

> [!CAREFUL] `-o` is not the output path
> The command's own `--help` examples show `-o enriched.cdx.json`. `-o` is the terminal format and rejects a file name. Use `--out` for the path.

## The three passes

| Pass | What it does | When it cannot run |
|---|---|---|
| Licences | Resolves components whose licence is absent or `NOASSERTION`, through deps.dev, the ecosystem registries and GitHub. These are the same resolvers `vulnetix license` uses. A licence the document already states is left alone. | Per-component lookups that fail are skipped |
| Vulnerabilities | Adds known vulnerabilities from the Vulnetix VDB as CycloneDX `vulnerabilities` entries, with ratings, EPSS and KEV context | An unreachable or unauthenticated VDB is a warning, not a failure |
| VEX | Folds the statements from `--vex` into each entry's `analysis` block, using the same matcher as [`vex apply`](/vex/commands/apply/) | Skipped when no `--vex` is given |

When VEX was applied, the statements are also written to `<out without extension>.openvex.json` for consumers that want them separately. If you are authenticated, the VEX documents are sent to Vulnetix with origin `bom_enrich`. See [VEX sent to Vulnetix](/vex/suppression/sent-to-vulnetix/).

## What the output records

| Property or field | Value |
|---|---|
| `vulnetix:bom/enriched-from` | SHA-256 of the input bytes. Always written. |
| `vulnetix:bom/derived-from` | The input's `serialNumber`. The output gets a fresh one, because it is a new artefact. |
| `vulnetix:bom/original-signature` | A reference to any signature on the input, which still attests the input |
| `metadata.tools.components` | The input's tools, then `vulnetix-bom-enrich` at the CLI version, appended once |
| `metadata.manufacturer`, `metadata.authors` | Left exactly as the input had them |

CycloneDX defines `metadata.tools` as the tools used in the creation, enrichment and validation of the BOM, so the enricher is appended there. `manufacturer` and `authors` say who created the document, so they are not changed. Enriching the same document twice leaves one `vulnetix-bom-enrich` entry, because CycloneDX 1.5 and later require `metadata.tools.components` to be unique.

Enriching a Syft SBOM produces:

```json
"metadata": {
  "manufacturer": { "name": "Anchore" },
  "lifecycles": [{ "phase": "post-build" }],
  "tools": { "components": [
    { "name": "syft", "version": "1.2.3", "group": "Anchore" },
    { "name": "vulnetix-bom-enrich", "version": "3.154.0", "group": "Vulnetix" }
  ]}
}
```

The VDB request also names the input's generator, so the backend records that Syft found the packages and Vulnetix enriched them.

## Signing

`--sign` signs the enriched document with this machine's identity, because this machine made the new claims. On a machine with no ambient OIDC identity, such as a laptop, signing is skipped with a warning and the unsigned document is still written. See [Signing documents](/attestation/sign/signing-documents/).

## Exit codes

| Code | Meaning |
|---|---|
| `0` | The enriched document was written. Warnings may have been printed. |
| `1` | `--out` missing, the input unreadable, a `--vex` document malformed, or a write failed |
