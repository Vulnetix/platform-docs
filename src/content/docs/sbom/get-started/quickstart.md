---
title: SBOM quickstart
nav: Quickstart
description: Generate a CycloneDX SBOM with vulnetix cdx, name your organisation and supplier in it, check its completeness, and sign it in CI.
order: 1.5
sources: [cli/cmd/cdx.go, cli/cmd/bom.go, cli/internal/bom/quality.go, cli/internal/scanopts/authorship.go, cli/internal/cdx/authorship.go, cli/sbom/action.yml]
checked: [cli@v4.17.1]
updated: 04 Nov 2026
---

This page takes a repository from no SBOM to a signed CycloneDX document that says who made it. Every step but the last runs locally with no network calls.

## Prerequisites

- The Vulnetix CLI on your `PATH`, v4.15.0 or later for the `--bom-manufacturer` and `--bom-supplier` flags ([installing the CLI](/cli/get-started/install/)).
- No Vulnetix credentials. `vulnetix cdx` makes no uploads.
- For step 4, a GitHub Actions job that can request an OIDC token (`id-token: write`).

## 1. Generate the SBOM

From the repository root:

```bash
vulnetix cdx
```

The document is written to `.vulnetix/sbom.cdx.json`, and the terminal summarises what went into it:

```text
CYCLONEDX INVENTORY

  Wrote /home/dev/acme/.vulnetix/sbom.cdx.json
  Packages: 1  manifest=1
  Files: 2 manifest/CI/shell input(s), 0 ELF binary component(s)
  Binaries: 0 artefact(s) examined, 0 package(s) recovered from embedded metadata
  Graph: 1 dependency edge set(s); Licenses: 1 component(s)
  AIBOM: 17 tool(s), 0 SDK(s), 0 model(s)
  CBOM: 1 crypto asset(s), 0 library component(s), 0 certificate(s)
```

Add `--no-aibom --no-cbom` to keep packages only.

## 2. State who made it

Without flags, `metadata.manufacturer` is the repository owner from CI or the git remote, and `metadata.supplier` is empty. Name both:

```bash
vulnetix cdx --bom-manufacturer "Acme Ltd" --bom-supplier "Acme Ltd"
```

The document is validated against the CycloneDX schema before it is written. A bad value writes nothing and lists each violation. [Who made the document](/sbom/author/identity/) covers authors, serial numbers and versions.

## 3. Check its completeness

```bash
vulnetix bom validate .vulnetix/sbom.cdx.json
```

Each field shows how many components carry it. An abridged report:

```text
[OK] sbom.cdx.json parsed as cyclonedx 1.7 (19 components)

[OK]      Unique document identifier               1/1
[OK]      Dependency graph                         1/1
[WARN]    Cryptographic hash                      1/19  missing from 18 of 19
Completeness score: 73/100
```

Add `--min-score 70` to exit `1` below a score.

## 4. Sign it in CI

`--sign` signs with the runner's own OIDC identity through public Sigstore. It needs no Vulnetix credential:

```yaml
permissions:
  contents: read
  id-token: write
steps:
  - uses: actions/checkout@v5
  - uses: Vulnetix/cli/sbom@v4
    with:
      sign: true
      bom-manufacturer: Acme Ltd
      bom-supplier: Acme Ltd
```

`.sig`, `.pem` and `.intoto.jsonl` files are written next to the SBOM. With no OIDC identity, signing is skipped and the SBOM is still written. Verify the signature with the [Attestation quickstart](/attestation/get-started/quickstart/).

## Next

- [vulnetix cdx](/sbom/generate/cdx/) for every flag and discovery pass.
- [Author and customise](/sbom/author/overview/) for licences, properties and overlay files.
- [Import and validate](/sbom/read/import-and-validate/) for SBOMs from other tools.
- [The sbom action](/sbom/github-actions/sbom/) for the dependency graph and release assets.
