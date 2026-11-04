---
title: Review and audit
description: The curation review queue, the two staleness settings that fill it, bulk actions, and the append-only audit trail of every list decision.
order: 2
sources: [saas/prisma/models/package-firewall.prisma, vdb-site/api/internal/handler/package_firewall_lists.go, vdb-site/api/internal/handler/package_firewall_suggest.go, vdb-site/api/internal/handler/factory_links.go]
checked: [vdb-site@1a06d67, saas@50cedf37]
updated: 02 Nov 2026
---

Curation decisions age. The Resolve Platform asks you to look at an entry again when it is old or unused, and records every change.

## Review settings

Set on the **Policies** tab; read by the Resolve Platform only, never by the proxy.

| Setting | API field | Default | Flags an entry when |
|---|---|---|---|
| Re-review a decision after | `staleDecisionDays` | `90` | it was decided or last reviewed more than N days ago |
| Flag an entry unused after | `staleUsageDays` | `90` | no matching request has been seen for N days |

Flagged entries fill the review queue on the **Curation** tab. Reviewing an entry stamps `reviewedAt` and `reviewedBy` without changing the decision.

## Bulk actions

Select up to 100 entries and apply one action:

| Action | Effect |
|---|---|
| `review` | Re-affirm the decision; resets the review clock |
| `move` | Move between the allow and deny lists |
| `activate`, `deactivate` | Turn the entry on or off without deleting it |
| `delete` | Remove the entry. Its audit history stays. |

The list view filters by list, ecosystem, free-text package search and **unreviewed only**, sorts by any column, and pages up to 100 entries at a time.

## Audit trail

Every create, update, move, review, activate, deactivate and delete writes a `PackageFirewallListAudit` row with the actor, the old and new value, and the reason. The trail is append-only. Deleting an entry keeps its audit rows (the link to the entry is set to null rather than cascaded), so the record that a decision was made survives the decision.

Open an entry's history from its row on the **Curation** tab.

## Getting to an entry from elsewhere

- The curation drawer's package search merges three sources: the ecosystem's public registry search, your organization's own firewall traffic, and your curation lists. A slow registry only adds a note to the results.
- Software Factory cards and other Resolve Platform pages link to `/resolve/package-firewall?pkg=<ecosystem>:<name>&version=<v>&add=allow#curation`, which opens the drawer at that package with the add confirmation ready (`add=deny` for the deny list).
