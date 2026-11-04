---
title: Author and customise a CycloneDX document
nav: Overview
description: What you can state about the SBOMs, AI-BOMs and CBOMs the CLI writes, on which commands, and how flags, environment variables and overlay files combine.
order: 1
sources: [cli/internal/scanopts/authorship.go, cli/internal/cdx/authorship.go, cli/internal/cdx/overlay.go, cli/internal/cdx/normalize.go, cli/cmd/cdx.go, cli/cmd/aibom.go, cli/cmd/cbom.go, cli/cmd/scan.go, vdb-cyclonedx/authorship.go, vdb-cyclonedx/validate.go]
checked: [cli@v4.17.1, vdb-cyclonedx@v0.17.0]
updated: 04 Nov 2026
---

The CLI fills in a CycloneDX document from what it can observe: the packages, the git repository, the CI provider and the machine. It cannot observe who you are, who supplies what you ship, what licence the document is under, or the services and decisions that sit around the code. From CLI v4.15.0 you can state those yourself, and the document says them in the members CycloneDX defines for them.

## Which commands

| Command | Writes | Spec version |
|---|---|---|
| [`vulnetix cdx`](/sbom/generate/cdx/) (alias `sbom`) | `.vulnetix/sbom.cdx.json`, or `--output-file` | `--spec-version`, `1.6` or `1.7` (default) |
| [`vulnetix aibom`](/sbom/aibom/overview/) | `.vulnetix/ai-bom.cdx.json` | `--spec-version`, `1.6` or `1.7` |
| [`vulnetix cbom`](/sbom/cbom/overview/) | `.vulnetix/cbom.cdx.json` | `--spec-version`, `1.6` or `1.7` |
| [`scan`](/cli/commands/scan/), `sca`, `sast`, `secrets`, `iac`, `containers` | `.vulnetix/sbom.cdx.json`, and a copy for `-o <file>.cdx.json` | always `1.7` |

The same flags work on all of them. Commands that change a document somebody else wrote, such as [`bom enrich`](/sbom/read/enrich/) and [`bom import`](/sbom/read/import-and-validate/), do not take them: they append themselves to `metadata.tools` and leave the author's identity alone.

## Three ways to say it

| Way | Best for |
|---|---|
| A flag, such as `--bom-supplier "Acme Ltd"` | One value on one run |
| An environment variable, such as `VULNETIX_BOM_SUPPLIER` | A value a CI job sets once for every step |
| An overlay file, `--bom-overlay acme.cdx.json` | Anything with structure: a supplier with a URL, services, compositions, annotations, an analysis on a vulnerability |

Each member is decided on its own, first answer wins:

1. The flag.
2. Its environment variable.
3. The last overlay file that states it.
4. What the run derives (the CI or git owner, the repository name, the phases the run read).

So a supplier in an overlay survives a `--bom-author` flag, because the two set different members.

| CycloneDX member | Flag | Page |
|---|---|---|
| `serialNumber`, `version` | `--bom-serial`, `--bom-version` | [Who made it](/sbom/author/identity/) |
| `metadata.manufacturer` | `--bom-manufacturer`, `--bom-manufacturer-url` | [Who made it](/sbom/author/identity/) |
| `metadata.authors` | `--bom-author` | [Who made it](/sbom/author/identity/) |
| `metadata.supplier` | `--bom-supplier`, `--bom-supplier-url` | [Who made it](/sbom/author/identity/) |
| `metadata.lifecycles` | `--lifecycle` | [Document identity](/sbom/reference/document-metadata/#lifecycle-phases) |
| `metadata.component` | `--component-name`, `-version`, `-type`, `-group`, `-purl` | [The subject component](/sbom/author/subject/) |
| `metadata.licenses` | `--bom-license` | [Licences and properties](/sbom/author/licences-and-properties/) |
| `metadata.properties` | `--bom-property` | [Licences and properties](/sbom/author/licences-and-properties/) |
| Anything else in the document | `--bom-overlay` | [Overlay files](/sbom/author/overlay/) |

## What you cannot set

| Member | Why |
|---|---|
| `metadata.tools` | It names the program that wrote the document. CycloneDX defines it as "the tool(s) used in the creation, enrichment, and validation of the BOM", which is a fact about this run. |
| `metadata.timestamp` | "The date and time when the BOM was created": the time of this run. |
| Any property named `vulnetix:*` | The CLI's own vocabulary. A value you set there would be indistinguishable from one the scan measured. Use your own prefix. |
| `signature` | A signature covers the finished document. Sign the output with `--sign` instead. See [Signing documents](/attestation/sign/signing-documents/). |

> [!WHY] Why the tool is not the manufacturer
> CycloneDX defines `metadata.manufacturer` as "the organization that created the BOM". When your pipeline runs the CLI on your code, that organisation is you, and the CLI is the tool. A document that names Vulnetix as the manufacturer of an inventory of your repository says something untrue, so the CLI never writes it.

## Validation

After every flag and overlay is applied, the document is validated against the CycloneDX schema for its spec version. If anything fails, nothing is written and every violation is listed with its JSON pointer and the input that put it there:

```text
Error: CycloneDX 1.6 validation failed (2 violation(s)):
  /metadata/component/type: value must be one of 'application', 'framework', 'library', 'container', 'platform', 'operating-system', 'device', 'device-driver', 'firmware', 'file', 'machine-learning-model', 'data', 'cryptographic-asset' (set by --component-* or an overlay)
  /services/0/endpoints: got string, want array (from an overlay)
```

A member that only exists in a later spec version fails at an earlier one: an overlay carrying 1.7's `metadata.distributionConstraints` cannot be written with `--spec-version 1.6`.

The scan family is the exception. A scan's findings are worth more than the labels on them, so a bad overlay there prints a warning and the scan goes on.

## A complete example

```bash
vulnetix cdx \
  --bom-manufacturer "Acme Ltd" --bom-manufacturer-url https://acme.example \
  --bom-author "Jane Doe <jane@acme.example>" \
  --bom-supplier "Acme Ltd" \
  --bom-serial "payment-service-2.0.0" --bom-version 1 \
  --component-name payment-service --component-version 2.0.0 \
  --bom-license CC0-1.0 \
  --bom-property acme:team=payments \
  --bom-overlay .vulnetix/overlay.cdx.json \
  --lifecycle build \
  --sign
```

In GitHub Actions the same values go in inputs or `env:`. See [GitHub Actions](/sbom/author/overlay/#github-actions).

## Environment variables

| Variable | Flag |
|---|---|
| `VULNETIX_BOM_MANUFACTURER` | `--bom-manufacturer` |
| `VULNETIX_BOM_MANUFACTURER_URL` | `--bom-manufacturer-url` |
| `VULNETIX_BOM_AUTHORS` | `--bom-author`, comma- or semicolon-separated |
| `VULNETIX_BOM_SUPPLIER`, `VULNETIX_BOM_SUPPLIER_URL` | `--bom-supplier`, `--bom-supplier-url` |
| `VULNETIX_BOM_SERIAL`, `VULNETIX_BOM_VERSION` | `--bom-serial`, `--bom-version` |
| `VULNETIX_BOM_LICENSES` | `--bom-license`, comma- or semicolon-separated |
| `VULNETIX_BOM_PROPERTIES` | `--bom-property`, comma- or semicolon-separated `name=value` |
| `VULNETIX_BOM_OVERLAY` | `--bom-overlay`, comma- or semicolon-separated paths |
| `VULNETIX_COMPONENT_NAME`, `_VERSION`, `_TYPE`, `_GROUP`, `_PURL` | `--component-name`, `-version`, `-type`, `-group`, `-purl` |

A list variable splits on commas and semicolons, so a value that contains either belongs in a flag or an overlay instead.
