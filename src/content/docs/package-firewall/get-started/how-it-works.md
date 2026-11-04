---
title: How a request is handled
nav: How it works
description: The order of checks the Package Firewall runs on every request, what it caches, and where it fails open.
order: 2
sources: [package-firewall/internal/handler/ecosystem_handler.go, package-firewall/internal/handler/curation_gate.go, package-firewall/internal/handler/deps.go, package-firewall/internal/handler/proxy.go, package-firewall/internal/handler/root_dispatch.go, package-firewall/internal/upstream/mirror.go, package-firewall/.repo/maintenance_mode.md]
checked: [package-firewall@333285f]
updated: 03 Nov 2026
---

Every ecosystem except Go goes through the same handler. Go uses its own module-proxy handler with the same checks in the same order.

## Order of checks

| Step | Check | Outcome on failure |
|---|---|---|
| 1 | Parse `Authorization` (Basic, or Bearer for clients that cannot send Basic). | `401`, `WWW-Authenticate: Basic realm="Vulnetix Package Firewall"` |
| 2 | Validate the credentials (cached). | `401` for bad or inactive credentials, `503` when the identity backend is unreachable |
| 3 | Load the organization's policy, mirrors, plan, add-on and curation lists. | `500` |
| 4 | Entitlement for the ecosystem: free (`go-dev`, `aur`), the Package Firewall add-on, or the Enterprise plan. | `402`, logged `BLOCK` |
| 5 | Parse the request path into package, version and kind (metadata, artifact, passthrough). | `404` for a path the adapter does not recognise |
| 6 | Fetch from the first active mirror that answers. | `502`, logged `ERROR` |
| 7 | Passthrough paths and upstream `404`/`410` are streamed unchanged. | logged `PASS` |
| 8 | Deny list. | `403`, logged `BLOCK` |
| 9 | Allowlist-only mode: a package with no allow entry at any version. | `403`, logged `BLOCK` |
| 10 | Artifact requests: known-bad artifact digest, then the [policy evaluation](/package-firewall/policy/evaluation-order/). | `423`, `426`, `428`, `422` or `403` |
| 11 | Metadata requests: known-bad digest in the document, inline malware scan, bad-actor maintainer gate. | `423` or `428` |
| 12 | Gate-mode metadata is served unchanged. Filter-mode metadata has blocked, cooldown and version-lag versions removed. | logged `BLOCK` per removed version |

The deny list runs before the malware gates on purpose: the client and the decision log see the operator's decision rather than a threat signal that happens to agree with it.

## Tenant, not member

Policy, mirrors, curation lists, the plan and the add-on belong to the organization (the tenant). A Business member who authenticates with their own credentials gets the organization's policy, not an empty one of their own.

## Caching

| What | How long |
|---|---|
| Organization config (policy, mirrors, plan, add-on, lists) | 60 seconds |
| Organization config when the deny list is not empty | 15 seconds |
| Credential validation | cached per org and key |

A policy change in the console or CLI takes effect within a minute, or within 15 seconds once you curate a deny list.

> [!WHY] Why a deny list shortens the cache
> Adding a deny entry during an incident is the one change where a stale cache lets a bad package through. Orgs that curate a deny list get the tighter bound; everyone else avoids the extra config reads.

## Fail-open points

| Situation | Behaviour |
|---|---|
| Filter-mode bulk policy query fails | The metadata is served with whatever blocks were computed, and the error is logged. |
| An adapter cannot rewrite a metadata document | The original document is served. |
| Version lag set, but the adapter cannot list versions | Version lag is not enforced for that ecosystem; the proxy logs it. |
| Version lag and cooldown both set | Lag counts from the newest version still served: blocked versions, and npm versions inside the cooldown, are skipped when ranking. A package whose newest releases are all cooling down still serves the releases just before them. |
| An org with no policy row yet | In-memory defaults: every threshold `0`, every block off, default mirrors. Curation lists are not loaded. |
| Maintenance mode | Requests are still proxied. Decision-log writes, enrichment and mirror backfill are skipped. Responses carry `X-Maintenance-Mode: true` and `X-Vulnetix-Maintenance-Impact: package-firewall-log-capture-paused`. |

Malware detection fails closed: if the exact-version or wildcard split of a malware match cannot be computed, the version is blocked.

## Upstream fetch

Mirrors are tried in ascending `priority`. Each attempt has a 10 second timeout. The first `2xx` wins. A `404` or `410` from a mirror is a definitive answer and is returned at once without trying the next mirror. OCI registries that answer `401` with a Bearer challenge are answered once per mirror. See [Mirrors](/package-firewall/operations/mirrors/).

## npm tarballs at the root

npm rewrites a tarball URL to the configured registry's origin and drops the `/npm` path. A root request whose path contains `/-/` and ends in `.tgz` (and has no Go `/@v/` or `/@latest` marker) is therefore handed to the npm handler, with the same auth, entitlement and policy checks.
