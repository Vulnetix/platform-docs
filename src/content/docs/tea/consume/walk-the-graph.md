---
title: Walk the object graph
description: List products, follow a product release to its component releases, and fetch the distributions, collection and artifact bytes, with real requests against the Vulnetix TEA 1.0.0 root.
order: 2
sources: [vdb-site/api/internal/handler/tea_v1_routes.go, vdb-site/api/internal/handler/tea_v1_catalogue.go, tea-spec/spec/openapi.yaml]
checked: [vdb-site@1a06d67, tea-spec@6c93819]
updated: 02 Nov 2026
---

These requests are unauthenticated and return Vulnetix's public records. Responses are trimmed. Base: `https://www.vulnetix.com/tea/v1.0.0`.

## List products

```bash
curl -s 'https://www.vulnetix.com/tea/v1.0.0/products?pageSize=1'
```

```json
{
  "hasNext": true,
  "nextPageToken": "dGVhMjp7Im8iOjEs...",
  "results": [
    {
      "uuid": "6551da21-1ca4-5930-8cfc-b3110b1588c4",
      "name": "Vulnetix/belai",
      "identifiers": [
        { "idType": "TEI", "idValue": "tei://vulnetix.com/uuid/6551da21-1ca4-5930-8cfc-b3110b1588c4" },
        { "idType": "PURL", "idValue": "pkg:github/Vulnetix/belai" }
      ]
    }
  ]
}
```

Page with `pageToken=<nextPageToken>` while `hasNext` is true. A token is bound to the request: change the sort, filter or path and the server answers `400 INVALID_PAGE_TOKEN`. On the last page `nextPageToken` is absent.

Filter exactly on one identifier with `idType` and `idValue`:

```bash
curl -s 'https://www.vulnetix.com/tea/v1.0.0/products?idType=PURL&idValue=pkg%3Agithub%2FVulnetix%2Fcli'
```

`idType` is one of `CPE`, `TEI`, `PURL`, `COMPLIANCE_DOCUMENT`. There is no name search on the server.

## A product's releases

```bash
curl -s 'https://www.vulnetix.com/tea/v1.0.0/product/54e8820d-0803-5a4f-858d-88a279486564/releases?pageSize=1'
```

```json
{
  "results": [
    {
      "uuid": "959d737f-7a54-51b7-b236-6ed079105345",
      "product": "54e8820d-0803-5a4f-858d-88a279486564",
      "productName": "Vulnetix/cli",
      "version": "v3.82.2",
      "createdDate": "2026-08-02T05:50:18Z",
      "releaseDate": "2026-08-02T05:50:17Z",
      "components": [
        { "uuid": "41714f49-4f06-5a3b-96d4-c83f7d78a270", "release": "e5a33f26-8056-5f16-a950-41a0db12d48f" }
      ]
    }
  ]
}
```

Follow `components[].release`: the downloads and most evidence live on the component release.

## A component release

```bash
curl -s 'https://www.vulnetix.com/tea/v1.0.0/componentRelease/e5a33f26-8056-5f16-a950-41a0db12d48f'
```

```json
{
  "uuid": "e5a33f26-8056-5f16-a950-41a0db12d48f",
  "componentName": "Vulnetix/cli",
  "version": "v3.82.2",
  "identifiers": [{ "idType": "PURL", "idValue": "pkg:github/Vulnetix/cli@v3.82.2" }],
  "distributions": [
    {
      "distributionId": "d6d7b590-1096-5db2-809a-9bea5d83c5ed",
      "description": "vulnetix-darwin-amd64",
      "url": "https://github.com/Vulnetix/cli/releases/download/v3.82.2/vulnetix-darwin-amd64",
      "checksums": [{ "algType": "SHA-256", "algValue": "9ae163c29eba8321382df0e8c1954c063fdec594306c6f5e17979b37f1d83fce" }]
    }
  ],
  "latestCollection": {
    "uuid": "e5a33f26-8056-5f16-a950-41a0db12d48f",
    "version": 1,
    "createdDate": "2026-08-02T05:50:20Z",
    "belongsTo": "COMPONENT_RELEASE",
    "updateReason": { "type": "INITIAL_RELEASE" },
    "artifacts": [
      {
        "uuid": "6502fa11-6497-5ee2-8182-72f2caa3d549",
        "version": 1,
        "name": "vulnetix.cdx.json",
        "type": "BOM",
        "formats": [
          {
            "mediaType": "application/vnd.cyclonedx+json",
            "checksums": [{ "algType": "SHA-256", "algValue": "1007c9ceaec85cae2f51d65852e661fddbcfd7212767c615f875b70fac30880c" }]
          }
        ]
      }
    ]
  }
}
```

| Part | Answers |
|---|---|
| `distributions` | How to obtain the release: files with checksums, and channels such as Homebrew with no single file |
| `latestCollection` | The evidence about the release: SBOMs, VEX, attestations |
| `latestCollection.uuid` | The same as the release UUID. Collections are versioned, not separately identified. |

> [!CAREFUL] Distribution checksums are the publisher's claim
> Vulnetix does not host distribution files. Check the checksum against the file you download.

Older collection versions are at `/componentRelease/{uuid}/collections` and `/componentRelease/{uuid}/collection/{collectionVersion}`, with the same routes under `/productRelease/{uuid}`.

## Download an artifact

Hosted artifacts have no `url` in 1.0.0. Fetch them from the download route, naming the format:

```bash
curl -sL -o vulnetix.cdx.json \
  'https://www.vulnetix.com/tea/v1.0.0/artifact/6502fa11-6497-5ee2-8182-72f2caa3d549/1/download?mediaType=application%2Fvnd.cyclonedx%2Bjson'
sha256sum vulnetix.cdx.json
```

The server answers `302` with a signed storage URL that expires after 15 minutes, so follow redirects. The response carries `Content-Location` naming the versioned route.

| Route | Returns |
|---|---|
| `/artifact/{uuid}/latest` | The newest version's metadata |
| `/artifact/{uuid}/{artifactVersion}` | One version's metadata |
| `/artifact/{uuid}/{artifactVersion}/download` | The bytes. `?mediaType=` picks the format; no acceptable format is `406 NO_ACCEPTABLE_FORMAT`. |
| `/artifact/{uuid}/latest/download` | The newest version's bytes |
| `/artifact/{uuid}/{artifactVersion}/signature/download`, `/latest/signature/download` | The detached signature, or `404 SIGNATURE_NOT_FOUND` |

## Other routes

| Route | Returns |
|---|---|
| `/components`, `/component/{uuid}`, `/component/{uuid}/releases` | Components, as for products |
| `/productReleases`, `/componentReleases` | Releases across products or components, filterable by identifier |
| `/product/{uuid}/cle`, `/productRelease/{uuid}/cle`, `/component/{uuid}/cle`, `/componentRelease/{uuid}/cle` | Common Lifecycle Enumeration events |
| `/trust-anchors` | The trust anchors for verifying signatures |
| `POST /token` | Exchange Basic credentials for a short-lived Bearer token |
