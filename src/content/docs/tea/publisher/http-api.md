---
title: Publication HTTP API
nav: HTTP API
description: Every TEA publication route the Vulnetix server serves at /tea/v1 and /tea/v0.4.0, with request bodies, idempotency, size limits, error codes and HTTP statuses.
order: 4
sources: [vdb-site/api/internal/handler/tea_routes.go, vdb-site/api/internal/handler/tea_publisher_handlers.go, vdb-site/api/internal/handler/tea_publisher_update.go, vdb-site/api/internal/handler/tea_publisher_distributions.go, vdb-site/api/internal/handler/tea_publisher_access.go, vdb-site/api/internal/handler/tea_publisher_util.go, vdb-site/api/internal/handler/entitlements.go, tea-spec/spec/publisher/overlay.yaml]
checked: [vdb-site@1a06d67, tea-spec@6c93819]
updated: 02 Nov 2026
---

The publication operations are a Vulnetix extension described by the publisher overlay in `tea-spec/spec/publisher/`. They are served beside the consumption API at `https://www.vulnetix.com/tea/v1` and `https://www.vulnetix.com/tea/v0.4.0`, and not at `/tea/v1.0.0`.

## Authentication and plan

Send an `Authorization` header (`ApiKey <orgId>:<hmac>`, Basic, or Bearer). Writes always target the caller's organisation. Publishing needs the Pro plan or above.

| Status | `error` | When |
|---|---|---|
| `401` | `UNAUTHORIZED` | No credential, or the organisation is unknown |
| `403` | `FORBIDDEN` | The plan does not include publishing |

## Routes

| Method and path | operationId | Body |
|---|---|---|
| `POST /product` | `createTeaProduct` | `name`, `identifiers`, `accessPolicy` |
| `PATCH /product/{uuid}` | `updateTeaProduct` | the same, omitted fields unchanged |
| `DELETE /product/{uuid}` | `deleteTeaProduct` | |
| `POST /component` | `createTeaComponent` | `name`, `identifiers`, `accessPolicy` |
| `PATCH /component/{uuid}` | `updateTeaComponent` | |
| `DELETE /component/{uuid}` | `deleteTeaComponent` | |
| `POST /productRelease` | `createTeaProductRelease` | `product`, `version`, `releaseDate`, `preRelease`, `identifiers`, `components`, `accessPolicy` |
| `PATCH /productRelease/{uuid}` | `updateTeaProductRelease` | `releaseDate`, `preRelease`, `identifiers`, `accessPolicy` |
| `DELETE /productRelease/{uuid}` | `deleteTeaProductRelease` | |
| `PUT /productRelease/{uuid}/collection` | `publishTeaProductReleaseCollection` | `updateReason: { type, comment }`, `accessPolicy` |
| `POST /componentRelease` | `createTeaComponentRelease` | `component`, `version`, `releaseDate`, `preRelease`, `identifiers`, `accessPolicy` |
| `PATCH /componentRelease/{uuid}` | `updateTeaComponentRelease` | as for product releases |
| `DELETE /componentRelease/{uuid}` | `deleteTeaComponentRelease` | |
| `PUT /componentRelease/{uuid}/collection` | `publishTeaComponentReleaseCollection` | as for product releases |
| `POST /componentRelease/{uuid}/distribution` | `createTeaDistribution` | `description`, `url`, `identifiers`, `signatureUrl`, `checksums` |
| `DELETE /distribution/{uuid}` | `deleteTeaDistribution` | |
| `POST /artifact` | `createTeaArtifact` | `collection`, `name`, `type`, `author`, `formats[]`, `accessPolicy` |
| `PATCH /artifact/{uuid}` | `updateTeaArtifact` | |
| `DELETE /artifact/{uuid}` | `deleteTeaArtifact` | |
| `PUT /artifact/{uuid}/format/{formatIndex}/content` | `uploadTeaArtifactContent` | the raw bytes, with `Content-Digest` |
| `PUT /artifact/{uuid}/format/{formatIndex}/signature` | `uploadTeaArtifactSignature` | `signatureType`, `url`, `algorithm`, `keyId`, `certificateUrl`, `certificateChainUrl`, `transparencyLogUrl`, `signedAt` |
| `GET /publications` | `listTeaPublications` | |
| `GET /publications/{uuid}/releases` | `listTeaPublishedReleases` | |
| `GET /accessPolicy/{uuid}` | `getTeaAccessPolicy` | |
| `PUT /accessPolicy/{uuid}` | `setTeaAccessPolicy` | `visibility`, `sharedWith`, `publishTo`. `?confirm=public` to go public. |

The four `/publicationTargets` operations are declared by the overlay and not served; see [Publication targets](/tea/publisher/publication-targets/). `DELETE` answers `204`.

Field rules for each object are on [Publisher object model](/tea/publisher/object-model/), and for policies on [Access policies](/tea/publisher/access-policies/).

## Example

```bash
AUTH="Authorization: ApiKey $VULNETIX_ORG_ID:$VULNETIX_API_KEY"
BASE=https://www.vulnetix.com/tea/v1

curl -s -X POST "$BASE/product" -H "$AUTH" -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: product-acme-widget' \
  -d '{"name":"acme/widget","identifiers":[{"idType":"PURL","idValue":"pkg:github/acme/widget"}]}'

curl -s -X PUT "$BASE/artifact/$ARTIFACT/format/0/content" -H "$AUTH" \
  -H 'Content-Type: application/vnd.cyclonedx+json' \
  -H "Content-Digest: sha-256=:$(openssl dgst -sha256 -binary widget.cdx.json | base64):" \
  --data-binary @widget.cdx.json
```

## Idempotency

Every create accepts an `Idempotency-Key` header. A retry with the same key and the same body returns the first result. The same key with a different body is rejected with `409 VERSION_CONFLICT`, because that is a client bug rather than a retry. `vulnetix tea` sends a key derived from each object's identity.

## Limits

| Limit | Value | Error |
|---|---|---|
| JSON request body | 1 MiB | `400 INVALID_REQUEST` |
| Artifact content per upload | 128 MiB | `413 PAYLOAD_TOO_LARGE` |
| Unknown JSON fields | rejected | `400 INVALID_REQUEST` |

`Content-Digest` is optional. When it carries a `sha-256` member, the uploaded bytes must match or the server answers `400 CHECKSUM_MISMATCH` and stores nothing.

## Errors

Every error is `{ "error": "<code>", "message": "<text>", "field": "<json pointer>" }`, with `field` only when one field is at fault.

| Status | `error` | Typical cause |
|---|---|---|
| `400` | `INVALID_REQUEST` | A missing or invalid field, an empty body, `public` without `?confirm=public` |
| `400` | `CHECKSUM_MISMATCH` | Uploaded bytes do not match `Content-Digest` |
| `401` | `UNAUTHORIZED` | No credential, unknown organisation |
| `403` | `FORBIDDEN` | Plan does not include publishing |
| `404` | `OBJECT_UNKNOWN` | No such object in your organisation, or an unrouted path |
| `405` | `METHOD_NOT_ALLOWED` | Wrong method for a routed path |
| `409` | `VERSION_CONFLICT` | An `Idempotency-Key` reused with a different body, or turning `preRelease` on for a final release |
| `409` | `ACCESS_WIDENS_PARENT` | A policy wider than the object inherits |
| `409` | `INVALID_REQUEST` | Setting a policy on a scan-derived record |
| `413` | `PAYLOAD_TOO_LARGE` | Artifact over 128 MiB |
| `501` | `MIRRORING_UNSUPPORTED` | `publishTo` names a target |
