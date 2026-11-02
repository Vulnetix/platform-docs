---
title: TEA 1.0.0 and 0.4.0
nav: Versions
description: The differences between the TEA 1.0.0 and 0.4.0 responses the Vulnetix server returns, and where the publication operations are served for each.
order: 4
sources: [vdb-site/api/internal/handler/tea_v1_routes.go, vdb-site/api/internal/handler/tea_v1_common.go, vdb-site/api/internal/handler/tea_routes.go, vdb-site/api/internal/handler/tea_versions.go, cli/pkg/tea/versions.go]
checked: [vdb-site@1a06d67, cli@4c8c3b71c]
updated: 02 Nov 2026
---

The server serves both versions, and its discovery document lists both. Use 1.0.0 when your client speaks it. It is the default of `vulnetix tea` and the TEA Explorer. 0.4.0 stays at its own path for clients and publishers that pin it. The CLI reads both and shows one shape.

| | 0.4.0 | 1.0.0 |
|---|---|---|
| Root | `/tea/v0.4.0` | `/tea/v1.0.0`, and the alias `/tea/v1` |
| Last page of a list | `"nextPageToken": ""` | `nextPageToken` absent, `hasNext: false` |
| Page token | An offset | Bound to the request. Changing the sort, filter or path while holding one is `400 INVALID_PAGE_TOKEN`. |
| Component release | `{ "release": {…}, "latestCollection": {…} }` | The release's own fields, with `latestCollection` beside them |
| Collection date | `date`, optional | `createdDate`, required |
| Artifact format `url` | Always present, pointing at the download route | Present only for content hosted elsewhere, with `checksums`. Hosted content is fetched from `/artifact/{uuid}/{version}/download?mediaType=…`. |
| Checksums | May include `MD5` where nothing better exists | No `MD5` |
| Downloads | One download route | Adds `/latest/download`, signature downloads, `ETag` and `If-None-Match` (`304`), `Content-Location`, and `406 NO_ACCEPTABLE_FORMAT` |
| `/discovery` | `tei` | Exactly one of `tei` or `purl` |
| TEI | `urn:tei:<type>:<domain>:<id>` | `tei://<domain>/<type>/<id>`, with a purl base64url encoded |
| Errors | `{ "error" }` | `{ "error", "message" }`. Codes include `NOT_IMPLEMENTED`, `NO_ACCEPTABLE_FORMAT`, `SIGNATURE_NOT_FOUND`, `INVALID_REQUEST`, `INVALID_PAGE_TOKEN`. |
| Authentication | Basic, or an API key | Also `POST /token`, which exchanges Basic credentials for a short-lived Bearer token |

## Where publication lives

Publication is a Vulnetix extension, not part of either version.

| Root | Publication operations |
|---|---|
| `/tea/v1.0.0` | No. It serves the specification and nothing else. |
| `/tea/v1` | Yes, beside the 1.0.0 consumption API |
| `/tea/v0.4.0` | Yes, beside the 0.4.0 consumption API |
| `/tea/public/...` | No |

`vulnetix tea` publishes to `/tea/v1` whichever root it reads from.
