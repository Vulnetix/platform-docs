---
title: Tool reference
description: All 31 tools the server registers, with every input parameter, its type, limits and default, the vdb-api route each tool calls, and the top-level fields it returns.
order: 1
nav: Tools
sources:
  - mcp-server/src/mcp/server.ts
  - mcp-server/src/tools/vuln.ts
  - mcp-server/src/tools/intel.ts
  - mcp-server/src/tools/packages.ts
  - mcp-server/src/tools/threat.ts
  - mcp-server/src/tools/feeds.ts
  - mcp-server/src/tools/analysis.ts
  - mcp-server/src/tools/raw.ts
  - mcp-server/src/tools/auth.ts
  - mcp-server/src/shaping/filters/
  - mcp-server/src/upstream/packages.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

The server registers 31 tools on every request: 27 that read the Vulnetix VDB, 1 escape hatch (`vdb_request`) and 3 sign-in tools. The list does not vary by caller or plan. `tools/list` carries a cache hint of 300,000 ms with `cacheScope: "public"`.

Every input schema is a Zod object. A parameter marked optional can be left out; there are no nullable parameters. "Route" is the path below `https://api.vdb.vulnetix.com/v2` that the tool calls with your credential. "Cache" is the edge-cache TTL for that call, keyed per principal (see [Architecture](/mcp-server/design/architecture/)).

## Annotations

| Tools | `readOnlyHint` | `destructiveHint` | `idempotentHint` | `openWorldHint` |
|---|---|---|---|---|
| All 27 VDB tools and `vdb_request` | `true` | not set | not set | `true` |
| `vulnetix_auth_status` | `true` | not set | not set | not set |
| `vulnetix_auth_start` | `false` | `false` | `false` | `true` |
| `vulnetix_auth_poll` | `false` | `false` | `true` | `true` |

## Shared value lists

| Name | Values | Used by |
|---|---|---|
| Ecosystem | `npm`, `pypi`, `go`, `cargo`, `rubygems`, `maven`, `packagist`, `nuget` | `vulnetix_package_search`, `vulnetix_package_vulns`, `vulnetix_package_versions`, `vulnetix_fix_plan` |
| `detail` | `summary`, `full`, `raw` | `vulnetix_vuln` |
| `sections` | `ai-discoveries`, `ai-in-wild`, `ai-malware`, `exploit-trends`, `vendor-trends` | `vulnetix_threat_feed` |
| `families` | `snort`, `yara`, `nuclei` | `vulnetix_detection_rules` |
| `version` | `v1`, `v2` | `vdb_request` |

`identifier` is always a string of at least 3 characters: a CVE, GHSA, PYSEC, RUSTSEC, GO, EUVD or any other id format the VDB indexes.

## Vulnerability tools

| Tool | Parameters | Route | Cache |
|---|---|---|---|
| `vulnetix_vuln` | `identifier` string, required. `detail` enum, optional, default `summary`. | `GET /vuln/{id}` | 900 s |
| `vulnetix_kev_status` | `identifier` string, required. | `GET /vuln/{id}/kev` | 1800 s |
| `vulnetix_kev` | `limit` integer 1 to 200, optional, default 25. `offset` integer 0 or more, optional. | `GET /kev` | 1800 s |
| `vulnetix_remediation` | `identifier` string, required. `maxActions` integer 1 to 100, optional, default 25. | `GET /vuln/{id}/remediation-plan` | 900 s |
| `vulnetix_timeline` | `identifier` string, required. | `GET /vuln/{id}/timeline` | 3600 s |
| `vulnetix_advisories` | `identifier` string, required. | `GET /vuln/{id}/advisories` | 3600 s |
| `vulnetix_workarounds` | `identifier` string, required. | `GET /vuln/{id}/workarounds` | 3600 s |
| `vulnetix_vex` | `identifier` string, required. | `GET /vuln/{id}/vex` | 1800 s |

`vulnetix_vuln` with `detail: "raw"` returns the unshaped record, and refuses with an error result when the record is over 524,288 bytes. With `summary` it adds a `resource_link` to `vulnetix://vuln/{id}/full`. `vulnetix_kev_status` returns the vdb-api body unshaped.

## Exploit and threat tools

| Tool | Parameters | Route | Cache |
|---|---|---|---|
| `vulnetix_exploits` | `identifier` string, required. | `GET /exploits/{id}` | 900 s |
| `vulnetix_iocs` | `identifier` string, required. | `GET /vuln/{id}/iocs` | 900 s |
| `vulnetix_sightings` | `identifier` string, required. | `GET /vuln/{id}/sightings` | 900 s |
| `vulnetix_threat_actors` | `identifier` string, required. | `GET /vuln/{id}/threat-actors` | 900 s |
| `vulnetix_attack_techniques` | `identifier` string, required. | `GET /vuln/{id}/attack-techniques` | 3600 s |
| `vulnetix_scorecard` | `identifier` string, required. | `GET /vuln/{id}/scorecard` | 3600 s |

## Package tools

| Tool | Parameters | Route | Cache |
|---|---|---|---|
| `vulnetix_package_search` | `query` string, at least 1 character, required. `ecosystem` enum, optional (omit to search all). `includeVersions` boolean, optional, default `false`. `limit` integer 1 to 100, optional, default 20. | `GET /packages/search?q=&ecosystem=` | 900 s |
| `vulnetix_package_vulns` | `packageName` string, required. `ecosystem` enum, optional. `limit` integer 1 to 500, optional. `offset` integer 0 or more, optional. | `GET /{package}/vulns` | 900 s |
| `vulnetix_package_versions` | `packageName` string, required. `ecosystem` enum, optional. `limit` integer 1 to 500, optional. `offset` integer 0 or more, optional. | `GET /{package}/versions` | 900 s |
| `vulnetix_purl` | `purl` string, at least 4 characters, required. | `GET /packages/enrichment?purl=` and `GET /{package}/vulns?withVulnIntel=1&limit=500` | 900 s |

The ecosystem is always sent as a query parameter, never in the path. `vulnetix_package_search` with `includeVersions: true` adds up to 10 version records per package.

`vulnetix_purl` parses the purl itself and drops qualifiers and subpaths. It maps the purl type to a VDB ecosystem: `golang` to `go`, `gem` to `rubygems`, `composer` to `packagist`, `crates` to `cargo`. Any other type is sent with no ecosystem hint. A Maven purl becomes `group:artifact`. A string that does not start with `pkg:` or has fewer than two path segments returns an error result without calling vdb-api. The two calls run in parallel; if one fails, the other's data is returned and `_meta["vulnetix/degraded"]` names the failed leg (`enrichment` or `advisories`).

## Feed and search tools

| Tool | Parameters | Route | Cache |
|---|---|---|---|
| `vulnetix_soc_triage` | `limit` integer 1 to 100, optional, default 25. `offset` integer 0 or more, optional. | `GET /triage` | 600 s |
| `vulnetix_search` | `query` string, at least 2 characters, required. `limit` integer 1 to 50, optional, default 10. `offset` integer 0 or more, optional. | `GET /search/vulns?q=` | 600 s |
| `vulnetix_eol_products` | `category` string, optional (for example `server-app`, `lang`, `os`, `db`). `limit` integer 1 to 500, optional. | `GET /eol/products` | 86400 s |
| `vulnetix_threat_feed` | `limit` integer 1 to 50, optional, default 10 (items per section). `sections` array of the section enum, optional (omit for all five). | Up to five calls, see below | 1800 s |

`vulnetix_eol_products` passes `limit` to vdb-api and returns at most that many products, or 150 when `limit` is omitted.

`vulnetix_threat_feed` sections and their routes:

| Section | Route |
|---|---|
| `ai-discoveries` | `GET /ai-discoveries?limit=` |
| `ai-in-wild` | `GET /ai-in-wild-exploitations?limit=` |
| `ai-malware` | `GET /ai-generated-malware?limit=` |
| `exploit-trends` | `GET /exploit-trends` |
| `vendor-trends` | `GET /vendor-trends` |

## AI analysis tools

These five return the deterministic VDB data first, then add an `analysis` object written by a model on Pro, Business and Enterprise plans. Each takes `ai` (boolean, optional): `false` skips the analysis. See [AI analysis](/mcp-server/tools/ai-analysis/) for when analysis runs.

| Tool | Parameters | Route | Cache |
|---|---|---|---|
| `vulnetix_triage_reason` | `identifier` string, required. `context` string, optional (deployment context). `ai` boolean, optional. | `GET /vuln/{id}` | 900 s |
| `vulnetix_secure_code_write` | `identifier` string, required. `cweId` string, optional (for example `CWE-502`). `language` string, optional. `ai` boolean, optional. | `GET /vuln/{id}/cwe-guidance` | 86400 s |
| `vulnetix_detection_rules` | `identifier` string, required. `families` array of `snort`, `yara`, `nuclei`, optional (omit for all three). `stack` string, optional. `ai` boolean, optional. | `GET /vuln/{id}/snort-rules`, `/yara-rules`, `/nuclei` | 3600 s |
| `vulnetix_exploit_test` | `identifier` string, required. `target` string, optional. `ai` boolean, optional. | `GET /vuln/{id}/nuclei` | 3600 s |
| `vulnetix_fix_plan` | `packageName` string, required. `ecosystem` enum, **required**. `currentVersion` string, optional. `targetVersion` string, optional. `ai` boolean, optional. | `GET /{ecosystem}/{package}` and `GET /{ecosystem}/{package}/versions` | 900 s |

`vulnetix_fix_plan` is the only tool where `ecosystem` is required.

## Escape hatch

| Tool | Parameters | Route | Cache |
|---|---|---|---|
| `vdb_request` | `path` string, required, must start with `/` and match an allowed prefix. `query` object of string to string, optional. `version` `v1` or `v2`, optional, default `v2`. `maxBytes` integer 1024 to 1048576, optional, default 262144. | `GET /{version}{path}` | 300 s |

The allowed prefixes are listed on [vdb_request](/mcp-server/tools/vdb-request/).

## Sign-in tools

| Tool | Parameters | Calls |
|---|---|---|
| `vulnetix_auth_status` | none | nothing; reads the request's `Authorization` header |
| `vulnetix_auth_start` | none | `POST https://www.vulnetix.com/api/site/v1/cli/device/authorize` |
| `vulnetix_auth_poll` | `handle` string, at least 8 characters, required | `POST https://www.vulnetix.com/api/site/v1/cli/device/token` |

`vulnetix_auth_start` and `vulnetix_auth_poll` need the `MCP_AEAD_KEY` secret on the deployment. Without it they return an error result telling you to run `vulnetix auth login` instead. See [Authentication](/mcp-server/get-started/authentication/).

## Returned fields

The text block in `content[0].text` is the JSON payload. The same object is in `structuredContent`; a payload that is not a plain object (the `raw` `/vuln/{id}` array) is wrapped as `{"result": ...}` there. The table lists the top-level keys each tool returns, read from the shaping functions.

| Tool | Top-level keys |
|---|---|
| `vulnetix_vuln` (`summary`) | `id`, `state`, `datePublished`, `dateUpdated`, `title`, `description`, `threatExposure`, `attackSurface`, `ssvc`, `kev`, `epss`, `exploitationMaturity`, `remediationTimeline`, `affectedRoutines`, `attackPaths`, `reachability`, `affected`, `purls`, `cloudLocators`, `references`, `tags` |
| `vulnetix_vuln` (`full`) | `id`, `state`, `datePublished`, `dateUpdated`, `title`, `descriptions`, `threatExposure`, `attackSurface`, `ssvc`, `kev`, `epss`, `exploitationMaturity`, `remediationTimeline`, `crit`, `purls`, `tags`, `affectedRoutines`, `attackPaths`, `reachability`, `affectedTotal`, `affected`, `references` |
| `vulnetix_exploits` | `id`, `exploitCount`, `sightingCount`, `summary`, `activeSources`, `exploitsBySource`, `entitlements`, `note` (only when records are withheld) |
| `vulnetix_kev` | `count`, `returned`, `limit`, `offset`, `sources`, `hasMore`, `items` |
| `vulnetix_remediation` | `id`, `state`, `title`, `description`, `fixAvailability`, `severity`, `ssvc`, `timeline`, `exploitationSignals`, `kevEntries`, `actionCount`, `actions`, `distributionPatchCount`, `distributionPatches`, `registryFixes`, `sourceFixes`, `cwes`, `workarounds`, `solutions`, `configurations`, `snortRuleCount`, `references`, `entitlements` |
| `vulnetix_iocs` | `id`, `title`, `state`, `entitlements`, `total`, `shadowserver`, `sightings` (at most 50), `gated`, `note` |
| `vulnetix_sightings` | `id`, `title`, `state`, `entitlements`, `count`, `firstObservation`, `lastObservation`, `daysSinceLastSeen`, `events`, `gated`, `note` |
| `vulnetix_threat_actors` | `id`, `isMalicious`, `counts`, `threatActors`, `iocs`, `impersonationTrap`, `entitlements`, `gated`, `note` |
| `vulnetix_attack_techniques` | `id`, `title`, `state`, `entitlements`, `total`, `attackTechniques` |
| `vulnetix_scorecard` | `id`, `title`, `state`, `entitlements`, `total`, `scorecards`, `commitHealth`, `prRepoHealth`, `sourceFixCorrelation` |
| `vulnetix_workarounds` | `id`, `title`, `state`, `entitlements`, `description`, `workarounds`, `configurations` |
| `vulnetix_advisories` | `id`, `title`, `state`, `entitlements`, `description`, `aiAdvisory`, `redhatAdvisoryCount`, `redhatAdvisories`, `vendorPatchCount`, `vendorPatches`, `msrcPatches`, `solutions`, `vendorComments`, `references` |
| `vulnetix_timeline` | `id`, `title`, `state`, `entitlements`, `meta`, `eventCount`, `events` (at most 60), `sources` |
| `vulnetix_vex` | `id`, `title`, `state`, `entitlements`, `count`, `statements` |
| `vulnetix_package_search` | `query`, `ecosystem`, `total`, `hasMore`, `matchedOnPage`, `entitlements`, `packages` |
| `vulnetix_package_vulns` | `package`, `resolvedNames`, `resolvedMode`, `totalCVEs`, `totalVersions`, `hasMore`, `limit`, `offset`, `cveIds` (at most 300), `versions` (at most 20), `note` |
| `vulnetix_package_versions` | `package`, `total`, `hasMore`, `limit`, `offset`, `versions` (at most 200) |
| `vulnetix_purl` | `purl`, `package`, `versionStatus`, `hasMalware`, `scorecard`, `eol`, `knownVersions`, `knownVersionSample`, `advisories`, `risk`, `safeHarbour`, `entitlements`, `note` |
| `vulnetix_soc_triage` | `count`, `limit`, `offset`, `items`, `entitlements` |
| `vulnetix_search` | `query`, `hasMore`, `limit`, `offset`, `warnings`, `results` |
| `vulnetix_eol_products` | `total`, `hasMore`, `returned`, `products` |
| `vulnetix_threat_feed` | One key per requested section. AI sections: `generatedAt`, `total`, `aggregate`, `byUseMode`, `markers`, `items`. `exploit-trends`: `generatedAt`, `totals`, `topCvesByTier`, `yearly`, `note`. `vendor-trends`: `generatedAt`, `current`, `priorYears`, `note`. A failed section is `{"error": "..."}`. |
| `vulnetix_triage_reason` | `vulnerability` (the `vulnetix_vuln` summary), `analysis`, then `analysisNote` or `analysisSkipped` |
| `vulnetix_secure_code_write` | `guidance` (`id`, `total`, `returned`, `cwes`, `note`), `analysis`, `analysisNote` or `analysisSkipped` |
| `vulnetix_detection_rules` | `snort`, `yara`, `nuclei` (each requested family), `analysis`, `analysisNote` or `analysisSkipped` |
| `vulnetix_exploit_test` | `nuclei` (`id`, `count`, `templates`), `safety`, `analysis`, `analysisNote` or `analysisSkipped` |
| `vulnetix_fix_plan` | `package` (`name`, `ecosystem`, `currentVersion`, `targetVersion`), `advisories`, `versions` (both unshaped), `analysis`, `analysisNote` or `analysisSkipped` |
| `vdb_request` | The vdb-api body, or `truncated`, `bytes`, `cap`, `preview` when it is larger than `maxBytes` |
| `vulnetix_auth_status` | `authenticated`, then `scheme`, `orgId`, `note`, or `advice` when not authenticated |
| `vulnetix_auth_start` | `action_required`, `verification_uri`, `user_code`, `expires_in_seconds`, `poll_interval_seconds`, `handle`, `instructions` |
| `vulnetix_auth_poll` | `status` (`approved` or `pending`). Approved: `org_id`, `authorization_header`, `next_step`. Pending: `handle`, `advice`, and `user_code`, `verification_uri` when the user has not approved yet. |

Detection rule caps: Snort 10 rules, YARA 8 rules, Nuclei 5 templates per call.

The `analysis` object for each AI tool:

| Tool | `analysis` fields |
|---|---|
| `vulnetix_triage_reason` | `priority` (`P1`, `P2`, `P3`, `P4`), `rationale`, `dominantFactors[]`, `wouldChangeIf[]` |
| `vulnetix_secure_code_write` | `summary`, `unsafeExample`, `safeExample`, `reviewChecks[]` |
| `vulnetix_detection_rules` | `deployFirst[]`, `falsePositiveRisks[]`, `coverageGaps[]` |
| `vulnetix_exploit_test` | `command`, `interpretation`, `prerequisites[]`, `destructive` (boolean) |
| `vulnetix_fix_plan` | `recommendedVersion`, `manifestEdit`, `installCommand`, `verifyCommand`, `rollback`, `majorBump` (boolean), `risks[]` |

> [!CAREFUL] Declared output schemas do not match every payload
> Each tool declares an `outputSchema` in `tools/list`. Every field in those schemas is optional, so they never fail validation, but for several tools the field names differ from what the tool returns: `vulnetix_exploits`, `vulnetix_purl`, `vulnetix_soc_triage`, `vulnetix_threat_feed`, the five AI tools and the three sign-in tools. Read the payload keys in the table above, not the declared schema, when you parse a result.

Every result also carries `_meta` keys. See [Result metadata](/mcp-server/reference/result-metadata/).
