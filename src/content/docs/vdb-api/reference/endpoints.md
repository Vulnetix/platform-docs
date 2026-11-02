---
title: Endpoint reference
nav: Endpoints
description: Every public v2 route of the VDB API, grouped by resource, with its query parameters, defaults and caps. Paths are relative to https://api.vdb.vulnetix.com/v2.
order: 1
sources: [vdb-api/main.go, vdb-api/internal/handler/openapi-v2.json, vdb-api/internal/handler/inputs_routes.go, vdb-api/internal/middleware/profields.go]
checked: [vdb-api@4145f0a]
updated: 02 Nov 2026
---

Paths are relative to `https://api.vdb.vulnetix.com/v2`. Every route needs a [credential](/vdb-api/api/authentication/) unless marked **open**. `{identifier}` takes any [advisory id](/vdb-api/api/inputs/#advisory-ids); routes marked **inputs** also take a purl, CPE, TEI or SWID tag in that slot, or the [input parameters](/vdb-api/api/inputs/#input-kinds) in the query.

Parameters are written `name=default` and `≤cap` where they have one. `*` marks a required parameter. `limit` and `offset` work as described in [Pagination](/vdb-api/api/pagination/).

The machine-readable version of most of this is `GET /v2/spec`. Routes marked † are served but not described in it. The CLI's own routes (`/v2/cli.*`) are internal to `vulnetix` and not listed here.

## Service

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/spec` | | OpenAPI 3 document. **Open** |
| GET | `/spec/ui` | | Swagger UI. **Open** |
| GET | `/auth/token` | `Authorization`* (SigV4), `X-Amz-Date`* | A 15-minute JWT. **Open** |
| GET | `/auth/api-key` | `Authorization`* (SigV4), `X-Amz-Date`* | The static API key. **Open** |
| GET | `/health`, `/ready` (no `/v2` prefix) | | Liveness, readiness. **Open** |

## Vulnerabilities

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/info/{identifier}` | | CVE metadata and which sources hold it |
| GET | `/vuln/{identifier}` | | The record in CVEListV5 format, per source. **inputs** |
| GET | `/search/vulns` | `q`*, `limit=10` ≤50, `offset=0` ≤1000, `lang=en` | Search by id, title or description |
| GET | `/identifiers` | `prefix`*, `limit=100` ≤500, `offset` | CVE ids starting with a prefix |
| GET | `/identifiers/{year}/{month}` | `limit=100` ≤500, `offset` | CVE ids published in a month |
| GET | `/gcve` | `start`*, `end`* (`YYYY-MM-DD`), `source`, `limit=100` ≤500, `offset` | CVEs in a date range |
| GET | `/gcve/{year}/{month}` | `limit=100` ≤500, `offset` | GCVE issuance ids for a month |
| GET | `/vuln/{identifier}/timeline` | `include`, `exclude` (`source`, `exploit`, `score-change`, `patch`, `advisory`, `scorecard`), `dates` (`published`, `modified`, `reserved`), `scores_limit=30` ≤365 | Lifecycle events. **inputs** |
| GET | `/vuln/{identifier}/affected` | `ecosystem`, `vendor`, `product`, `packageName`, `purl`, `limit=100` ≤500, `offset` | Affected products and version ranges. **inputs** |
| GET | `/vuln/{identifier}/affected-packages` † | | Distinct package names and ecosystems affected. **inputs** |
| GET | `/vuln/{identifier}/scorecard` | | OpenSSF Scorecard of the affected repository. **inputs** |
| GET | `/scorecard/search` | `q`*, `limit=20` ≤100, `offset` | Scorecards by repository name |

## Remediation

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/vuln/{identifier}/fixes/registry` | `ecosystem`, `packageName`, `purl`, `limit=100` ≤500, `offset` | Fixed package versions in registries. **inputs** |
| GET | `/vuln/{identifier}/fixes/distributions` | `distro`, `os`, `limit=100` ≤500, `offset` | Linux distribution patches. **inputs** |
| GET | `/vuln/{identifier}/fixes/source` | `type` (`commit`, `pr`, `gist`, `exploit_db`, `vulnerability_lab`, `all`), `limit=100` ≤500, `offset` | Source-code fixes. **inputs** |
| GET | `/vuln/{identifier}/workarounds` | | Workarounds. **inputs** |
| GET | `/vuln/{identifier}/advisories` | | Vendor advisories. **inputs** |
| GET | `/vuln/{identifier}/cwe-guidance` | | Remediation guidance for the CVE's CWEs. **inputs** |
| GET | `/vuln/{identifier}/remediation-plan` | `ecosystem`, `packageManager`, `packageName`, `currentVersion`, `purl`, `containerImage`, `os`, `vendor`, `product`, `registry`, `topology=unknown` (`single-host`, `cluster`, `serverless`, `unknown`), `includeGuidance`, `includeVerificationSteps` | A plan of actions for your context. **inputs** |

## Exploits and threat activity

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/exploits` | `q`, `ecosystem`, `source` (`exploitdb`, `metasploit`, `nuclei`, `nmap-nse`, `vulncheck-xdb`, `crowdsec`, `github`, `poc`), `severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), `inKev`, `minEpss` ≤1, `sort=recent` (`recent`, `epss`, `severity`, `maturity`), `limit=100` ≤100, `offset` | Search CVEs with exploit intelligence |
| GET | `/exploits/{identifier}` | `include_content`, `limit=100` ≤1000, `offset` | Exploits and sightings for one CVE |
| GET | `/vuln/{identifier}/exploits` | | Exploit list with an archive flag per row. **inputs** |
| GET | `/exploits/{exploitUuid}/archive` | | The archived exploit bytes. Pro |
| GET | `/exploits/{exploitUuid}/archive/meta` | | Metadata about the archive before you download it. Pro |
| GET | `/vuln/{identifier}/nuclei` | `format=json` (`json`, `yaml`), `first` | Nuclei templates. **inputs** |
| GET | `/vuln/{identifier}/iocs` | | CrowdSec sightings and Shadowserver counts. **inputs** |
| GET | `/iocs` | `cveId`, `country`, `asn`, `behavior`, `reputation`, `since`, `format=json` (`json`, `stix`), `limit=100` ≤500, `offset`, input parameters | IOC search across the catalogue |
| GET | `/vuln/{identifier}/sightings` | | Merged in-the-wild observation timeline. **inputs** |
| GET | `/vuln/{identifier}/threat-actors` † | | Threat actors linked to the CVE. **inputs** |
| GET | `/triage` | `minEpss` ≤1, `minEpssPercentile` ≤100, `minCess` ≤10, `minCvss` ≤10, `severity` (`critical`, `high`, `medium`, `low`), `inKev`, `kevSource` (`CISA`, `vulnetix`, `enisa`, `vulncheck`), `cwe`, `vendor`, `product`, `since`, `windowDays` ≤30, `sort=cvss` (`epss`, `cess`, `cvss`, `published`, `kev-due`), `limit=100` ≤200, `offset` | Score-driven triage feed |
| GET | `/exploit-trends` | | Global exploit-intelligence trends |

## Known exploited vulnerabilities

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/kev` | `cveId`, `source` (`CISA`, `vulnetix`, `enisa`, `vulncheck`), `since`, `until`, `dueBefore`, `dueAfter`, `vendor`, `product`, `sort=added` (`due`, `added`, `cve`), `limit=100` ≤200, `offset`, input parameters | The KEV catalogue across all four sources |
| GET | `/vulnetix-kev` | `format=json` (`json`, `csv`), `reason`, `mode=any` (`any`, `all`), `include-references`, `limit=1000` ≤5000, `offset` | The Vulnetix-derived KEV catalogue |
| GET | `/vuln/{identifier}/kev` | | KEV status and required action for one CVE. **inputs** |

## Detection rules and defences

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/vuln/{identifier}/snort-rules` | `limit=100` ≤500, `offset` | Snort and Suricata rules for a CVE. **inputs** |
| GET | `/snort-rules` | `cveId`, `source`, `technique`, `tactic`, `classtype`, `severity`, `protocol` (`tcp`, `udp`, `http`, `tls`, `ip`), `action` (`alert`, `drop`, `reject`, `log`), `dstPort`, `srcPort`, `disabled`, `q`, `affectedProduct`, `tag`, `since`, `until`, `sort=recent` (`recent`, `severity`, `id`), `limit=100` ≤200, `offset`, input parameters | Rule search |
| GET | `/vuln/{identifier}/yara-rules` | `limit=100` ≤500, `offset` | YARA rules for a CVE. **inputs** |
| GET | `/yara-rules` | `cveId`, `source`, `ruleName`, `author`, `tag`, `imports`, `q`, `matchString`, `matchMeta`, `since`, `until`, `sort=recent` (`recent`, `name`), `limit=100` ≤200, `offset`, input parameters | Rule search |
| GET | `/vuln/{identifier}/attack-techniques` | | MITRE ATT&CK techniques mapped to a CVE. **inputs** |
| GET | `/attack-techniques` | `techniqueId`, `tactic`, `cveId`, `source`, `capecId`, `domain` (`Enterprise`, `Mobile`, `ICS`), `subtechnique`, `derivedBy`, `q`, `since`, `until`, `limit=100` ≤200, `offset`, input parameters | Technique-mapping search |
| GET | `/vuln/{identifier}/virtual-patches` | `limit=100` ≤200, `offset` | Blocking rules (WAF, IPS) derived from real exploits |
| GET, POST | `/virtual-patches` | `kind`, `confidence` (`HIGH`, `MEDIUM`, `LOW`), `deployMode` (`log`, `block`), `exploitSource`, `q`, `limit=100` ≤200, `offset`, input parameters (query on GET, JSON body on POST) | Virtual-patch search |
| GET | `/virtual-patches/{uuid}/archive` | | One virtual patch as the file its tool expects |
| GET | `/vuln/{identifier}/countermeasures` | `limit=100` ≤200, `offset` | Detection content (Sigma, YARA, STIX, OpenIOC) derived from real exploits |
| GET, POST | `/countermeasures` | `kind`, `confidence`, `exploitSource`, `q`, `limit=100` ≤200, `offset`, input parameters | Countermeasure search |
| GET | `/countermeasures/{uuid}/archive` | | One countermeasure as a file |
| POST | `/defences/counts` | JSON body of inputs | Virtual-patch and countermeasure counts for many inputs at once |

## VEX

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/vuln/{identifier}/vex` | | VEX statements declared for a CVE, scoped to your organisation. **inputs** |
| GET | `/vex` | `cveId`, `status`, `supplier`, `since`, `limit=100` ≤200, `offset`, input parameters | VEX statement search |

## Packages and products

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/product/{name}` | `ecosystem`, `withVulnIntel` (`1`), `currentVersion`, `limit=100` ≤500, `offset` | Versions of a product |
| GET | `/product/{name}/{version}` | same as above | One version |
| GET | `/product/{name}/{version}/{ecosystem}` | `withVulnIntel`, `currentVersion`, `limit`, `offset` | One version in one ecosystem (`npm`, `pypi`, `maven`, `rubygems`, `cargo`, `go`, `nuget`, `generic`, `unknown`) |
| GET | `/{package}/versions` | `ecosystem`, `withVulnIntel`, `currentVersion`, `limit=100` ≤500, `offset` | Every version of a package across ecosystems |
| GET | `/{package}/vulns` | `ecosystem`, `withVulnIntel`, `currentVersion`, `limit=100` ≤500, `offset` | Every version with its CVE ids |
| GET | `/{package}/issues` | | CVE issues related to a package |
| GET | `/{ecosystem}/{package}` | `limit=100` ≤500, `offset` | A package within one ecosystem |
| GET | `/{ecosystem}/{package}/versions` | `limit=100` ≤500, `offset` | Its versions |
| GET | `/{ecosystem}/{group}/{artifact}` | `limit=100` ≤500, `offset` | A Maven-style `group/artifact` package |
| GET | `/packages/search` | `q`*, `ecosystem`, `limit=100` ≤100, `offset` | Search packages by name |
| GET | `/packages` | `q`, `ecosystem`, `page=1`, `perPage=50` ≤50 | Package catalogue, recent or searched |
| GET | `/packages/stats` | | Catalogue metrics and publish histogram |
| GET | `/packages/org` | `q`, `ecosystem`, `page=1`, `perPage=50` ≤50 | Your organisation's package inventory |
| GET | `/packages/org-stats` | | Your organisation's package metrics and history |
| GET | `/packages/enrichment` | `purl`, `name`, `ecosystem`, `version`, `q`, `page=1`, `perPage=25` ≤100 | Safe Harbour enrichment for one dependency |
| GET | `/packages/safety-matrix` | `name`*, `ecosystem`, `version`, `live=1`, `distro`, `arch=amd64` | Per-version safety matrix (Safe Harbour). Pro, or a free-demo package |
| POST | `/packages/safety-matrix/bulk` | JSON body | Safe Harbour verdicts for a page of packages. Pro |
| POST | `/packages/refresh` | JSON body | Refresh packages from their registries and recompute Safe Harbour. Pro; per-package cooldown and per-organisation daily cap |
| GET | `/packages/free-demo` | | Packages whose Safe Harbour data is free. **Open** |
| GET | `/malware/{ecosystem}/{package}` | ecosystem one of `npm`, `pypi`, `go`, `golang`, `maven`, `cargo`, `crates`, `rubygems`, `nuget`, `packagist`, `composer`, `pub`, `hex`, `vscode`, `openvsx` | Known malware for a package, with threat-actor attribution |

## Inputs

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET, POST | `/inputs/resolve` | [Input parameters](/vdb-api/api/inputs/#input-kinds) (query on GET, JSON body on POST) | The advisory ids the inputs resolve to |

## SBOM and manifest scanning

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/scan/manifest` | `multipart/form-data`: `file`*, `type`, `ecosystem`, `metadata`. 10 MB, 5,000 dependencies | Matches for `package.json`, `package-lock.json`, `requirements.txt`, `Pipfile.lock`, `go.sum`, `go.mod`, `Cargo.lock`, `Gemfile.lock`, `pom.xml`, `composer.lock`, `yarn.lock`, `pnpm-lock.yaml` |
| POST | `/scan/spdx` | SPDX JSON document; optional `metadata` query | Matches for every package in the document |
| POST | `/scan/cyclonedx` | CycloneDX JSON BOM; optional `metadata` query | Matches for every component in the BOM |

## End of life

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/eol/products` | `category`, `tag`, `search`, `limit=100` ≤500, `offset` | Products with lifecycle data |
| GET | `/eol/products/{product}` | | A product and its release cycles |
| GET | `/eol/products/{product}/releases/{release}` | | One release's lifecycle |
| GET | `/eol/categories` | | Product categories with counts |
| GET | `/eol/identifiers` | `q`*, `type` (`purl`, `cpe`, `repology`), `limit=100` ≤500, `offset` | Products by purl, CPE or Repology id |
| GET | `/eol/calendar/{month}` † | `{month}` as `YYYY-MM` | Releases reaching end of life in a month |

## Enumerations

| Method | Path | Returns |
|---|---|---|
| GET | `/ecosystems` | Package ecosystems |
| GET | `/sources` | CVE data sources |
| GET | `/metric-types` | CVSS metric types |
| GET | `/exploit-sources` | Exploit reference sources |
| GET | `/exploit-types` | Exploit type classifications |
| GET | `/fix-distributions` | Linux distributions with fix data |

## Statistics and trends

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/summary` | | Database totals |
| GET | `/vendor-trends` | | Vendor counts over time, split CVE, GHSA and other |
| GET | `/nvd-deep-dive` † | | Pre-computed NVD analysis |
| GET | `/malware-campaigns` | | Reconstructed supply-chain malware campaigns |
| GET | `/malware-trends` | | Supply-chain malware trends across four feeds |

## AI threat intelligence

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/ai-discoveries` | `aiOrg`, `aiSystem`, `harness`, `severity`, `milestoneType`, `humanAssisted`, `notable`, `limit=1000` ≤5000, `offset` | Vulnerabilities discovered by AI systems |
| GET | `/ai-assisted-exploits` | | Exploits an AI produced for human-found bugs |
| GET | `/ai-in-wild-exploitations` | | AI-generated exploitation seen in the wild |
| GET | `/ai-generated-malware` | | Malware families written by or running AI |
| GET | `/ai-discovered-vulns-outcomes` † | | Daily rollup of AI discoveries, with a researcher leaderboard |
| GET | `/ai-assisted-exploits-outcomes` † | | Daily rollup of AI-assisted exploits |

## Vendor advisory archives

| Method | Path | Returns |
|---|---|---|
| GET | `/msrc/patch-tuesdays` | Microsoft Patch Tuesday releases |
| GET | `/msrc/patch-tuesday/{date}` | One release |
| GET | `/msrc/patch-tuesday-preparation` † | The upcoming release, as far as it is known |
| GET | `/{vendor}/archives` † | Months with advisories, for `redhat`, `broadcom`, `aws`, `cisco`, `alibaba`, `cloudflare`, `suse`, `canonical`, `alpine`, `apple`, `google` |
| GET | `/{vendor}/archive/{month}` † | That vendor's advisories for a month (`YYYY-MM`) |
| GET | `/alpine/registries` † | Alpine package registries |
| GET | `/google/projects`, `/google/project-zero/recent` † | Google projects and recent Project Zero reports |
| GET | `/raw/sources` | Sources whose raw upstream records are archived. Teams |
| GET | `/raw/{source}/{cveId}` | The raw upstream advisory bytes. Teams |

## Cloud

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/cloud-locators` | `vendor`, `product` | URL and identifier templates for cloud resources |
| POST | `/crit/lookup` | JSON body | CRIT cloud-resource record lookup. **Open** |
| GET | `/crit/lookup/{provider}/{service}/{resource_type}` † | `view` | The same lookup, cacheable. **Open** |
| POST | `/cloud.inventory` † | JSON body | Matches software found in managed cloud resources (RDS engines, Lambda runtimes, EKS add-ons and similar) |
