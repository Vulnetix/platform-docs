---
title: Who made the document
nav: Who made it
description: Set serialNumber, version, metadata.manufacturer, metadata.authors and metadata.supplier, and what the CLI derives for each when you do not.
order: 2
sources: [cli/internal/scanopts/authorship.go, cli/internal/cdx/authorship.go, cli/cmd/scan.go, vdb-cyclonedx/authorship.go]
checked: [cli@v4.17.1, vdb-cyclonedx@v0.17.0]
updated: 04 Nov 2026
---

CycloneDX splits "who made this" across several members, and each answers a different question.

| Member | CycloneDX definition | The CLI writes |
|---|---|---|
| `metadata.manufacturer` | "The organization that created the BOM. Manufacturer is common in BOMs created through automated processes." | Your organisation, resolved as below. Never Vulnetix. |
| `metadata.authors` | "The person(s) who created the BOM. Authors are common in BOMs created through manual processes." | Nothing, unless you state it |
| `metadata.supplier` | "The organization that supplied the component that the BOM describes. The supplier may often be the manufacturer, but may also be a distributor or repackager." | Nothing, unless you state it |
| `metadata.tools` | "The tool(s) used in the creation, enrichment, and validation of the BOM." | The command that wrote it, at its version. Not settable. |
| `serialNumber` | "Every BOM generated SHOULD have a unique serial number." Must be an RFC 4122 UUID. | A new random `urn:uuid` each run, unless you state one |
| `version` | "Whenever an existing BOM is modified ... the version of the BOM SHOULD be incremented by 1." | `1`, or the next revision when the scan family rewrites its own file |

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--bom-manufacturer` | string | the repository owner | `metadata.manufacturer.name` |
| `--bom-manufacturer-url` | string | the owner's URL | `metadata.manufacturer.url`, replacing the URL derived from the git remote |
| `--bom-author` | string, repeatable | | `metadata.authors[]`, as `Name <email>`, `Name` or `email@host` |
| `--bom-supplier` | string | | `metadata.supplier.name` |
| `--bom-supplier-url` | string | | `metadata.supplier.url` |
| `--bom-serial` | string | a new UUID | `serialNumber`. See [Serial numbers](#serial-numbers). |
| `--bom-version` | int | `1` | `version`, 1 or more |

Each has an environment variable, listed on the [overview](/sbom/author/overview/#environment-variables). A malformed author such as `Jane <` is rejected before the scan starts.

## The manufacturer

The first source that answers wins:

| Order | Source |
|---|---|
| 1 | `--bom-manufacturer` |
| 2 | `VULNETIX_BOM_MANUFACTURER` |
| 3 | `metadata.manufacturer` in the last overlay that has one |
| 4 | The repository owner the CI provider states (GitHub, GitLab, Azure DevOps, Bitbucket, Jenkins) |
| 5 | The owner in the git remote |

When none answers, `metadata.manufacturer` is left out. The organisation id the CLI authenticated as (`--org-id` or `VULNETIX_ORG_ID`) never names a manufacturer by itself. When a name resolves, the id is added as the manufacturer's `bom-ref`, `urn:uuid:<org id>`, so the document can be tied to your Vulnetix organisation.

The owner URL from the git remote becomes `metadata.manufacturer.url`, unless `--bom-manufacturer-url` replaces it.

`cdx`, `aibom`, `cbom` and the scan family all use this order. Before CLI v4.15.0, `aibom` and `cbom` used only the git owner.

> [!CAREFUL] Authors and manufacturer are both allowed
> CycloneDX suggests `manufacturer` for automated documents and `authors` for manual ones. A pipeline run is automated, so the manufacturer is always worth setting. Add `--bom-author` when a person stands behind the content as well, for example the release manager who reviewed a release SBOM.

## Serial numbers

CycloneDX requires `serialNumber` to be an RFC 4122 UUID, written `urn:uuid:<uuid>`. `--bom-serial` accepts three forms:

| You pass | Written as |
|---|---|
| `urn:uuid:3E671687-395B-41F5-A30F-A58921A69B79` | Lower-cased: `urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79` |
| `3e671687-395b-41f5-a30f-a58921a69b79` | `urn:uuid:3e671687-395b-41f5-a30f-a58921a69b79` |
| Any other string, such as `payment-service-2.0.0` | A UUIDv5 of that string in the URL namespace, the same UUID every time |

The third form is the useful one: name the release, and every rebuild of that release carries the same serial without you storing a UUID anywhere.

```bash
vulnetix cdx --bom-serial "payment-service-$VERSION" --bom-version 1
```

## Versions and rewrites

`cdx`, `aibom` and `cbom` write a new document every run. Each gets a new serial and version `1`, unless `--bom-serial` and `--bom-version` say otherwise. To publish revisions of one document, keep the serial and raise the version yourself.

The scan family is different. `.vulnetix/sbom.cdx.json` is the same document rewritten on every scan, so a rescan keeps its `serialNumber`, adds 1 to its `version`, and records this run's manufacturer, authors, supplier and lifecycles. `--bom-serial` and `--bom-version` apply only to a file that does not exist yet.

> [!CAREFUL] A document another tool wrote keeps its author
> If `.vulnetix/sbom.cdx.json` was authored by another tool, say a Syft SBOM you placed there, a scan keeps that tool's manufacturer and authors, because that organisation did create the document. The scan adds itself to `metadata.tools` and its phases to `metadata.lifecycles`. Before CLI v4.15.0, a file that already had a `metadata` block kept whatever manufacturer it had, even one written by Vulnetix.

## Supplier, at two levels

`metadata.supplier` is about the subject: who supplied the thing the BOM describes. `--bom-supplier` sets it. A supplier for one dependency belongs on that component instead, through an overlay:

```json
{
  "components": [
    { "type": "library", "name": "left-pad", "version": "1.3.0",
      "purl": "pkg:npm/left-pad@1.3.0",
      "supplier": { "name": "Left Pad Org", "url": ["https://left-pad.example"] } }
  ]
}
```

See [Overlay files](/sbom/author/overlay/).

## What does not take these

| Writes | Identity |
|---|---|
| `vulnetix image` | No manufacturer |
| `vulnetix triage --vex-format cdx`, `vulnetix jail --vex-format cyclonedx` | VEX documents with `metadata.authors` of `Vulnetix`, because they carry decisions recorded in Vulnetix. No manufacturer. |
| `bom enrich`, `bom import` | The input's identity, unchanged. The command appends itself to `metadata.tools`. |
