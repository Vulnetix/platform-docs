---
title: Publisher object model
nav: Object model
description: The products, components, releases, collections, artifacts and distributions a Vulnetix TEA publisher stores, their fields, identity rules, versioning and withdrawal.
order: 1
sources: [saas/prisma/models/tea-publisher.prisma, vdb-site/api/internal/handler/tea_publisher_handlers.go, vdb-site/api/internal/handler/tea_publisher_update.go, vdb-site/api/internal/handler/tea_ids.go, tea-spec/spec/publisher/README.md]
checked: [saas@50cedf37, vdb-site@1a06d67, tea-spec@6c93819]
updated: 02 Nov 2026
---

Everything you publish is stored per organisation and served through the same API as the objects projected from your scans. A consumer cannot tell the two apart.

## Identity

Object UUIDs are assigned by the server: a UUIDv5 over a per-kind namespace and the object's natural key within your organisation. The same derivation is used for scan-derived objects, so the two never collide, and re-creating an object gives it back the UUID consumers already hold. The TEI identifier is always assigned by the server; a publisher-supplied TEI would claim an authority only the server has.

| Kind | Natural key (unique) |
|---|---|
| Product | organisation + `name` |
| Component | organisation + `name` |
| Product release | product + `version` |
| Component release | component + `version` |
| Artifact | organisation + collection + `name` |
| Collection | the release it belongs to (same UUID) |

## Products and components

| Field | Notes |
|---|---|
| `name` | Required. Unique in your organisation. |
| `identifiers` | `[{ idType, idValue }]`. `idType` is `CPE`, `TEI`, `PURL` or `COMPLIANCE_DOCUMENT`. |
| `accessPolicy` | Optional on create. See [Access policies](/tea/publisher/access-policies/). |

A product is what somebody buys or installs. A component is a thing that ships. They are separate lineages: deleting a product does not delete a component published beside it.

## Releases

| Field | Product release | Component release |
|---|---|---|
| `product` or `component` | the parent UUID, required | the parent UUID, required |
| `version` | required, immutable | required, immutable |
| `releaseDate` | RFC 3339 | RFC 3339 |
| `preRelease` | boolean, default `false` | boolean, default `false` |
| `identifiers` | `[{ idType, idValue }]` | `[{ idType, idValue }]` |
| `components` | `[{ uuid, release }]`: the component releases it is made of | n/a |
| distributions | n/a, the specification defines none | yes |

`PATCH` changes `releaseDate`, `preRelease`, `identifiers` and `accessPolicy`. Omitted fields are unchanged. `version` cannot change, because the UUID derives from it; a new version is a new release. `preRelease` can be turned off after creation but never back on: that would tell consumers that what they installed was never final.

## Collections

A collection is the versioned list of artifacts for one release. Its UUID is the release UUID, and exactly one of the product release or component release owns it.

| Field | Notes |
|---|---|
| `belongsTo` | `PRODUCT_RELEASE` or `COMPONENT_RELEASE` |
| `version` | Starts at 1 |
| `updateReason.type` | `INITIAL_RELEASE`, `VEX_UPDATED`, `ARTIFACT_UPDATED`, `ARTIFACT_ADDED`, `ARTIFACT_REMOVED` |
| `updateReason.comment` | Optional note |

`PUT /productRelease/{uuid}/collection` (or the component form) creates the collection at version 1, and each later call publishes the next version with the reason you give. Adding an artifact does not advance the version by itself: publish a new collection version (`ARTIFACT_ADDED`, `VEX_UPDATED` and so on) when the set changes. An artifact records the collection version it joined at, so membership of a past version can be reconstructed.

> [!CAREFUL] The version moves only when you publish one
> Adding or changing an artifact does not advance the collection version, and the server keeps no per-version history yet. The version moves only on `PUT .../collection`.

## Artifacts

| Field | Notes |
|---|---|
| `collection` | Required. The collection must exist. |
| `name` | Required |
| `type` | `ATTESTATION`, `BOM`, `BUILD_META`, `CERTIFICATION`, `FORMULATION`, `LICENSE`, `RELEASE_NOTES`, `SECURITY_TXT`, `THREAT_MODEL`, `VULNERABILITIES`, `OTHER` |
| `author` | Optional |
| `formats` | At least one. Each has `mediaType`, `description`, and either bytes uploaded to this server or an external `url`, plus `checksums`. |
| `version` | Starts at 1. Stored bytes are immutable; a replacement is a new version. |

Formats are addressed by position (`formatIndex`), because a media type is not unique within an artifact: the same document is often published compressed and not. Bytes are uploaded with `PUT /artifact/{uuid}/format/{formatIndex}/content`, up to 128 MiB, and checked against `Content-Digest` before they are stored.

A format can carry a detached signature, uploaded with `PUT /artifact/{uuid}/format/{formatIndex}/signature`:

| Signature field | Values |
|---|---|
| `signatureType` | `JWS`, `JSF`, `COSE`, `PGP`, `X509_CMS`, `SIGSTORE_BUNDLE`, `SSH` |
| `url`, `algorithm`, `keyId`, `certificateUrl`, `certificateChainUrl`, `transparencyLogUrl`, `signedAt` | Optional |

## Distributions

A distribution is the release as somebody installs it: a binary on a releases page, a Homebrew formula, a Scoop manifest. It belongs to a component release, because that is where the consumption schema puts `distributions`. To publish download links you must have at least one component.

| Field | Notes |
|---|---|
| `description` | Free text naming the channel, e.g. `Homebrew tap (macOS, Linux)` |
| `url` | Optional. A channel with no single file has none. |
| `identifiers` | Optional. Homebrew and Scoop have no purl type, so none is invented. |
| `signatureUrl` | Optional |
| `checksums` | `[{ algType, algValue }]`, recorded as given. The server never holds the bytes and does not claim to have checked them. |

## Deleting

`DELETE` on a product, component, release or artifact removes it and everything beneath it; the database cascades. `DELETE /distribution/{uuid}` removes one download link. Deleting a product does not reach a component published beside it.

Re-publishing an artifact with the same name in the same collection updates its name, type and author in place (same UUID).

> [!CAREFUL] Deletes are not tombstones yet
> The schema has `withdrawnAt` and `withdrawnNote` columns for a tombstone that keeps a withdrawn object visible to its publisher and answers `OBJECT_UNKNOWN` to everyone else. The handlers on `main` hard-delete instead. Consumers who already fetched an object keep their copy either way.
