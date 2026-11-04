---
title: TEA quickstart
nav: Quickstart
description: Read a product's releases and artifacts from a TEA server with vulnetix tea, then publish your own release with tea release or the tea-release action.
order: 1.5
sources: [cli/cmd/tea.go, cli/cmd/tea_release.go, cli/pkg/tea/client.go, cli/tea-release/action.yml]
checked: [cli@v4.17.1]
updated: 04 Nov 2026
---

This page reads a published release from the Vulnetix TEA server, then publishes a release of your own with its SBOM and VEX.

## Prerequisites

- The Vulnetix CLI on your `PATH` ([installing the CLI](/cli/get-started/install/)).
- Reading public objects needs no credential.
- Publishing needs the Pro plan or above, and `VULNETIX_ORG_ID` and `VULNETIX_API_KEY` for your organisation.

## 1. Find a product

```bash
vulnetix tea products --purl pkg:github/Vulnetix/cli
```

```text
54e8820d-0803-5a4f-858d-88a279486564  Vulnetix/cli
```

`--purl` is an exact match done by the server. `--search` matches part of a name.

## 2. List its releases

```bash
vulnetix tea product 54e8820d-0803-5a4f-858d-88a279486564
```

```text
Vulnetix/cli
  TEI   tei://vulnetix.com/uuid/54e8820d-0803-5a4f-858d-88a279486564
  PURL  pkg:github/Vulnetix/cli

releases (100)
  v3.82.2                  959d737f-7a54-51b7-b236-6ed079105345
  v3.83.0                  e5fe63be-d3d0-5b7a-a3bc-39525d15cf88
```

## 3. Read a release's artifacts

Pass a product release UUID:

```bash
vulnetix tea collection 959d737f-7a54-51b7-b236-6ed079105345
```

```text
collection v1  INITIAL_RELEASE  2026-08-02T05:50:20Z

  vulnetix.cdx.json  [BOM]
    application/vnd.cyclonedx+json
      SHA-256   1007c9ceaec85cae2f51d65852e661fddbcfd7212767c615f875b70fac30880c
```

## 4. Preview your own release

`--dry-run` prints the plan and publishes nothing:

```bash
vulnetix tea release dist/*.cdx.json dist/*.openvex.json \
  --product acme/app --version 1.0.0 --dry-run
```

```text
product   acme/app
purl      pkg:github/acme/app
version   1.0.0
released  2026-11-04T13:00:33Z
artifact  app.cdx.json                             application/vnd.cyclonedx+json
artifact  app.openvex.json                         application/vnd.openvex+json
```

Each file's name decides its media type and TEA artifact type.

## 5. Publish from a tag

In GitHub Actions the product name, purl and version come from the repository and the tag:

```yaml
on:
  push:
    tags: ['v*']
jobs:
  tea:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0          # the release date is the tagged commit's date
      # ... your build steps write dist/
      - uses: Vulnetix/cli/tea-release@v4
        with:
          org-id: ${{ secrets.VULNETIX_ORG_ID }}
          api-key: ${{ secrets.VULNETIX_API_KEY }}
          tea-files: dist/*.cdx.json
          tea-visibility: public
```

Without a visibility the release stays readable only inside your organisation. A run on a plan without publishing exits `1` with `403`.

> [!CAREFUL] Public cannot be undone
> `public` is set on both the product and the component. Try the job with `tea-dry-run: true` first.

## Next

- [tea release](/tea/cli/release/) for checksums, install channels and re-runs.
- [Reading with the CLI](/tea/cli/reading/) for paging, TEIs and other servers.
- [Catalogues and authentication](/tea/consume/catalogues-and-auth/) for the open source catalogue.
- [Access policies](/tea/publisher/access-policies/) for `private`, `shared` and `public`.
