---
title: Package risk tools
description: Score a package before you install it, list the advisories and versions the VDB knows for it, and resolve an exact purl to its risk and Safe Harbour recommendation.
order: 4
nav: Package risk
sources:
  - mcp-server/src/tools/packages.ts
  - mcp-server/src/upstream/packages.ts
  - mcp-server/src/shaping/filters/packages.ts
  - mcp-server/DIVERGENCES.md
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Ecosystem values for every package tool: `npm`, `pypi`, `go`, `cargo`, `rubygems`, `maven`, `packagist`, `nuget`. The ecosystem is a resolution hint sent as a query parameter. Full parameters: [Tool reference](/mcp-server/reference/tools/).

## `vulnetix_package_search`

The check to run before adding a dependency. Each of up to `limit` packages (default 20) returns:

| Field | Meaning |
|---|---|
| `packageName`, `ecosystems`, `vendor`, `product`, `repositoryUrl` | Identity |
| `vulnerabilityCount`, `maxSeverity` | Known advisories |
| `exploitationSignals` | CrowdSec sightings, exploit count, CISA and VulnCheck KEV membership |
| `eolStatus` | End-of-life status |
| `scorecardScore` | OpenSSF scorecard |
| `safeHarbour` | `recommendedVersions`, and `picks` when the ecosystem is known |
| `versionCount` | Versions the VDB knows |
| `versions` | Only with `includeVersions: true`: up to 10, each with its own `safeHarbour` |

`safeHarbour.picks`:

| Pick | Meaning |
|---|---|
| `latest` | The highest stable release |
| `safest` | The highest stable release |
| `stable` | The stable release closest to the version in use |
| `rolling` | Every non-malware version published on the release day of the highest version, vulnerable ones included (an array) |

```text
Before I add express, what is its risk profile and which version should I pin?
```

A common name matches thousands of packages; `matchedOnPage` and `hasMore` show what was cut.

## `vulnetix_package_vulns`

Every advisory id affecting a package, as `cveIds` (up to 300) and a per-version breakdown in `versions` (up to 20 per page). Page with `limit` (1 to 500) and `offset`. Then call `vulnetix_vuln` on the ids that matter.

## `vulnetix_package_versions`

Every version the VDB knows (up to 200 per page), with the sources that reported each. An entry with an empty ecosystem is a CVE-affected version that does not map onto a registry release.

## `vulnetix_purl`

Resolves one purl, such as `pkg:npm/lodash@4.17.21` or `pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1`. There is no `/purl` endpoint in vdb-api, so the tool calls `/packages/enrichment` and `/{package}/vulns` in parallel.

`versionStatus` says which case applies:

| `versionStatus` | Meaning |
|---|---|
| `matched` | `risk` holds that version's advisories and Safe Harbour scoring |
| `unknown-to-vdb` | The VDB has never seen the version. Not the same as clean. `knownVersionSample` lets you correct the coordinate. |
| `no-version-in-purl` | The purl has no version, so the answer is package-level |

`risk` carries `vulnerabilityCount`, `safeHarbourScore`, `maxSeverity`, `maxCvssScore`, `maxThreatExposure`, `exploitCount`, `inKev` and `isMalware`. Also returned: `hasMalware`, `scorecard`, `eol`, `advisories` and the package-level `safeHarbour`.

purl types are mapped to VDB ecosystems: `golang` to `go`, `gem` to `rubygems`, `composer` to `packagist`, `crates` to `cargo`. Qualifiers and subpaths are dropped.
