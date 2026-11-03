---
title: Decision log
description: What the Package Firewall records for each request, the PASS, BLOCK, WARN and ERROR actions, how to filter the log, and the console views built on it.
order: 2
sources: [saas/prisma/models/package-firewall.prisma, package-firewall/internal/db/logger.go, package-firewall/internal/handler/ecosystem_handler.go, vdb-site/api/internal/handler/package_firewall_logs.go, vdb-site/api/internal/handler/package_firewall_log_stats.go, vdb-site/api/internal/handler/package_firewall_insights.go, package-firewall/.repo/maintenance_mode.md]
checked: [package-firewall@333285f, vdb-site@1a06d67, saas@50cedf37]
updated: 02 Nov 2026
---

Every request the firewall decides on writes a row to the organization's decision log. Open it at [www.vulnetix.com/resolve/logs#package](https://www.vulnetix.com/resolve/logs#package). Links from the Package Firewall page open it already filtered.

## Fields

| Field | Content |
|---|---|
| `ecosystem` | The ecosystem ID |
| `modulePath` | The package name. For a whole-catalogue request it may be empty or the request path. |
| `version` | The version, or a comma-separated list for a digest block that hit several releases |
| `endpointType` | What was requested, per adapter: `metadata`, `versions`, `download`, `info`, `zip`, `deb`, `rpm`, `package`, ... |
| `action` | `PASS`, `BLOCK`, `WARN`, `ERROR` |
| `reason` | The block or advisory message, for example `package CVE is in CISA KEV or VulnCheck KEV` |
| `repoFullName` | The repository named in the [credential](/package-firewall/get-started/authentication/#naming-the-repository), or empty |
| `credentialLabel` | `repo` when a repository was named, otherwise empty |
| `createdAt` | Epoch milliseconds |

## Actions

| Action | Written when |
|---|---|
| `PASS` | The request was served with nothing removed. For filtered metadata, one row per requested package. |
| `BLOCK` | The request was refused, or one row per version removed from filtered metadata (including cooldown and version-lag removals). Plan refusals are `BLOCK` too. |
| `WARN` | Served with an advisory: a wildcard malware record, any block downgraded by `warn` mode, a malware hit with `blockMalware` off, a hit in a repository-wide index, weaker malware-scan findings, or a bad-actor block suppressed by an allow entry. |
| `ERROR` | No upstream mirror answered (`502`). |

Rows are written asynchronously in batches. During a maintenance window no rows are written, and responses carry `X-Vulnetix-Maintenance-Impact: package-firewall-log-capture-paused`.

## Filtering

The console filters by **ecosystem**, **action**, **package** and **version**, 50 rows per page by default and up to 100. To review what `warn` mode would have blocked, filter on `WARN` and look for reasons ending `(warn mode: reported, not blocked)`.

## Resolve Platform views built on the log

The Package Firewall page reads the same log in aggregate:

- block counts per rule for the last 30 days;
- weekly decisions for the last 26 weeks;
- the packages blocked most often, with per-package traffic sparklines;
- wildcard malware advisories (`WARN`) waiting for an allow or deny decision.

## Seeing a decision without the console

Every block and advisory carries `X-Vulnetix-Firewall-*` response headers with the same reason. See [Block responses](/package-firewall/reference/responses/#response-headers).
