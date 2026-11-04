---
title: Access policies
description: How private, shared and public visibility is declared on TEA objects, inherited and narrowed from product to artifact, and shared with named organisations.
order: 2
sources: [saas/prisma/models/tea-publisher.prisma, vdb-site/api/internal/handler/tea_publisher_access.go, vdb-site/api/internal/handler/tea_publisher_handlers.go, vdb-site/api/internal/handler/tea_repo_visibility.go, cli/pkg/tea/objects.go]
checked: [saas@50cedf37, vdb-site@1a06d67, cli@4c8c3b71c]
updated: 02 Nov 2026
---

TEA says how transparency data is fetched, not who may fetch it. The Vulnetix publisher adds an access policy to every object it stores.

## Visibility

| Value | Who can read |
|---|---|
| `private` | Your organisation only. The default when nothing on the chain declares a policy. |
| `shared` | Your organisation and the organisations named in `sharedWith`. Readers must authenticate. |
| `public` | Anyone, without a credential |

The wire format is lowercase; the server also accepts uppercase. Any other value is `400 INVALID_REQUEST`.

## Inheritance

A policy attaches to one object: a product, component, product release, component release, collection or artifact. An object with no policy of its own inherits.

```text
artifact → collection → release → product (or component)
```

The effective visibility is the narrowest declaration anywhere on that chain, not the nearest. An artifact declared `public` under a product later set to `private` is private.

| Rule | Effect |
|---|---|
| Writing a policy wider than what the object inherits | `409 ACCESS_WIDENS_PARENT`, field `/visibility` |
| Narrowing a parent later | Children become narrower too. Their own rows are not rewritten. |
| Widening the parent back | Each child returns to its own declaration, and no further |
| `shared` at several levels | The grants intersect, and the earliest expiry applies. A grant on a child cannot create an entitlement its parent withheld. |

> [!WHY] Narrow only
> If a child could widen, marking a product private would promise nothing: any artifact under it could be made public on its own.

## Share grants

| Field | Notes |
|---|---|
| `organizationUuid` | A Vulnetix organisation UUID, the identity a reader authenticates as |
| `organizationName` | Display only. A rename does not move a grant. |
| `grantedAt` | RFC 3339, set by the server |
| `expiresAt` | RFC 3339, optional. A value that does not parse is treated as already expired. |

## Making an object public

`PUT /accessPolicy/{uuid}` with `visibility: public` requires `?confirm=public`. Without it the server answers `400 INVALID_REQUEST`: whatever is fetched while an object is public stays fetched. `vulnetix tea share --visibility public` and `tea release --visibility public` add the parameter for you.

## Reading a policy

`GET /accessPolicy/{uuid}`, or `vulnetix tea share <uuid>`:

```json
{
  "uuid": "6502fa11-6497-5ee2-8182-72f2caa3d549",
  "declared": { "visibility": "public" },
  "effective": { "visibility": "private" },
  "inheritedFrom": "54e8820d-0803-5a4f-858d-88a279486564"
}
```

| Field | Meaning |
|---|---|
| `declared` | The object's own policy. Absent when it inherits. |
| `effective` | What is enforced |
| `inheritedFrom` | The object whose declaration made `effective` narrower, when one did |
| `source`, `repository` | For a scan-derived record: `source: "repository"` and the `owner/name` whose visibility it follows |

The gap between `declared` and `effective` is where accidental disclosure hides, so both are reported.

## Scan-derived records

A record projected from your scans has no policy. Its visibility is its repository's (see [Catalogues and authentication](/tea/consume/catalogues-and-auth/#scan-derived-records)). `PUT /accessPolicy/{uuid}` on one answers `409 INVALID_REQUEST` and names the repository; change the repository's visibility instead.

## Mirroring

The policy body also accepts `publishTo`, a list of [publication target](/tea/publisher/publication-targets/) UUIDs. This server does not mirror, so a non-empty `publishTo` is refused with `501 MIRRORING_UNSUPPORTED` rather than accepted and dropped.

## Request body

```json
{
  "visibility": "shared",
  "sharedWith": [
    { "organizationUuid": "0f5b2c1e-8f3a-4b9e-9d6a-2c7e1a4b5d60", "expiresAt": "2027-03-31T00:00:00Z" }
  ]
}
```

The body is `additionalProperties: false` over `visibility`, `sharedWith` and `publishTo`. The same object can be sent as `accessPolicy` when creating a product, component, release, collection or artifact.
