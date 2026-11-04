---
title: Publication targets
description: Publication targets are remote TEA servers a publisher mirrors to, defined by the schema and overlay; the Vulnetix server answers MIRRORING_UNSUPPORTED today.
order: 3
sources: [saas/prisma/models/tea-publisher.prisma, tea-spec/spec/publisher/overlay.yaml, vdb-site/api/internal/handler/tea_publisher_access.go, vdb-site/api/internal/handler/tea_publisher_spec_test.go, vdb-site/api/internal/handler/tea_routes.go]
checked: [saas@50cedf37, tea-spec@6c93819, vdb-site@1a06d67]
updated: 02 Nov 2026
---

> [!CAREFUL] Not served yet
> The Vulnetix TEA server does not mirror. The four `/publicationTargets` operations are not routed, and naming a target in an access policy's `publishTo` is refused with `501 MIRRORING_UNSUPPORTED`. This page describes the model so you know what the field means and what will be stored when mirroring ships.

A publication target is another TEA server your organisation copies objects to, for example a customer's or a regulator's TEA server. Targets are registered once and then named by UUID in an object's `publishTo`.

## Fields

From the publisher overlay (`publication-target`) and the stored model (`TeaPublicationTarget`):

| Field | Notes |
|---|---|
| `uuid` | Assigned by the server |
| `rootUrl` | The remote TEA root, without a trailing slash: the `rootUrl` that server advertises in its own discovery |
| `domain` | The TEI domain of the target, derived from `rootUrl`. Unique per organisation. |
| `description` (stored as `label`) | What the target is, for whoever reviews the list |
| `credential` | Write-only Bearer credential presented to the target. Never returned. Stored as KMS ciphertext. |
| `authScheme` | Stored; default `none` |
| `suspended` | Stored; a suspended target receives nothing |
| `createdAt` | RFC 3339 |

Each mirroring attempt would be recorded per object and target with state `PENDING`, `PUBLISHED` or `FAILED` and a detail message, so a publisher can see that a mirror has been failing for a week, not only that it is failing now.

## Rules in the overlay

- Mirroring is asynchronous and must not block or fail the local write.
- Mirroring is one hop. A server must not mirror onward an object it received as a copy.
- A copy is governed by the receiving server. Once it lands there, your access policy no longer applies to it.
- Deleting a target removes it from every `publishTo` that names it. It does not recall copies already made.

## Operations in the overlay

| Method and path | operationId | On the Vulnetix server |
|---|---|---|
| `GET /publicationTargets` | `listTeaPublicationTargets` | not routed (`404`) |
| `POST /publicationTargets` | `createTeaPublicationTarget` | not routed (`404`) |
| `GET /publicationTargets/{uuid}` | `getTeaPublicationTarget` | not routed (`404`) |
| `DELETE /publicationTargets/{uuid}` | `deleteTeaPublicationTarget` | not routed (`404`) |
| `PUT /accessPolicy/{uuid}` with `publishTo` | `setTeaAccessPolicy` | `501 MIRRORING_UNSUPPORTED`, field `/publishTo` |
