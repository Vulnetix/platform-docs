---
title: Endpoint reference
nav: Endpoints
description: Every public v2 route of the VDB API, by resource, with its parameters, defaults, caps and plan gates. Paths are relative to https://api.vdb.vulnetix.com/v2.
order: 1
sources: [vdb-api/main.go, vdb-api/internal/handler/openapi-v2.json, vdb-api/internal/handler/openapi-cli.json, vdb-api/internal/middleware/oasvalidate.go]
checked: [vdb-api@df992c8]
updated: 05 Nov 2026
---

Paths are relative to `https://api.vdb.vulnetix.com/v2`. This table follows the OpenAPI document, `GET /v2/spec` (an interactive reference is at [`/v2/spec/ui`](https://api.vdb.vulnetix.com/v2/spec/ui)), and lists all 139 of its operations. Every route needs a [credential](/vdb-api/api/authentication/) unless marked **open**. `{identifier}` takes any [advisory id](/vdb-api/api/inputs/#advisory-ids); routes marked **inputs** also take a URL-encoded purl, CPE, TEI or SWID tag in that slot. "Input parameters" means the shared [input kinds](/vdb-api/api/inputs/#input-kinds) (`vulnId`, `package`, `ecosystem`, `version`, `vendor`, `product`, `cpe`, `purl`, `swid`, `tei`, `cel`) in the query, or in the JSON body on a `POST`.

Parameters are written `name=default` and `≤cap` where they have one, with allowed values in brackets. `*` marks a required parameter. `limit` and `offset` work as described in [Pagination](/vdb-api/api/pagination/); `offset` defaults to 0 and is at most 100,000 unless the row says otherwise. Requests are checked against the document: a parameter outside its cap, pattern or allowed values answers `400` with the `field` at fault (see [Errors](/vdb-api/api/errors/#request-validation)).

Plan markers come from each operation's `x-vulnetix-plan`:

| Marker | Below the plan |
|---|---|
| **Pro**, **Business** | The whole answer is the HTTP 200 [`planLocked` body](/vdb-api/api/errors/#plan-gated-answers), never `402` or `403` |
| Pro fields | The answer is served, with the gated fields `null` and listed in `_pro_data` and `_entitlements` |
| Pro rows | Records above your plan are left out and counted in `withheld` |
| Pro per package | Each package is answered or locked on its own; packages in `GET /packages/free-demo` are answered on every plan |

The CLI's own routes (`/v2/cli.*`) and `POST /v2/cloud.inventory` are described in a separate document, `GET /v2/spec/cli`, with its reference page at `/v2/spec/cli/ui`, and are not listed here.

## Service

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/spec` | `If-None-Match` header | OpenAPI 3.1 document for this API. **Open** |
| GET | `/spec/ui` | | Interactive API reference (Scalar) rendering `/spec`. **Open** |
| GET | `/spec/cli` | `If-None-Match` header | OpenAPI document for the CLI operations (`/v2/cli.*`, `/v2/cloud.inventory`). **Open** |
| GET | `/spec/cli/ui` | | Interactive reference (Scalar) for `/spec/cli`. **Open** |
| GET | `/auth/token` | SigV4-signed `Authorization`, `X-Amz-Date` header | A 15-minute JWT. **Open** (SigV4-signed) |
| POST | `/auth/token` | | Always `405` with `Allow: GET`. **Open** |
| GET | `/auth/api-key` | SigV4-signed `Authorization`, `X-Amz-Date` header | The static API key. **Open** (SigV4-signed) |
| GET | `/health`, `/ready` (no `/v2` prefix) | | Liveness, readiness. **Open**; not in the document |

## Vulnerabilities

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/info/{identifier}` | | CVE metadata and which sources hold it |
| GET | `/vuln/{identifier}` | | The record in CVE JSON 5 format, per source. **inputs** |
| GET | `/search/vulns` | `q`*, `limit=10` ≤50, `offset=0` ≤1000, `lang=en` | Search by id, alias, title or description |
| GET | `/identifiers` | `prefix`*, `limit=100` ≤500, `offset` | Vulnerability ids starting with a prefix |
| GET | `/identifiers/{year}/{month}` | `limit=100` ≤500, `offset` | Vulnerability ids published in a month |
| GET | `/gcve` | `start`*, `end`* (`YYYY-MM-DD`), `source`, `limit=100` ≤500, `offset` | CVE JSON 5 records published in a date range |
| GET | `/gcve/{year}/{month}` | `limit=100` ≤500, `offset` | GCVE issuances for a month |
| GET | `/vuln/{identifier}/timeline` | `include`, `exclude` (comma-separated: `source`, `exploit`, `score-change`, `patch`, `advisory`, `scorecard`), `dates` (comma-separated: `published`, `modified`, `reserved`), `scoresLimit=30` ≤365 (`scores_limit` deprecated) | Lifecycle events. **inputs** |
| GET | `/vuln/{identifier}/affected` | `ecosystem`, `package` (`packageName` deprecated), `vendor`, `product`, `purl`, `cpe`, `tei`, `limit=100` ≤500, `offset` | Affected products and version ranges. **inputs**, Pro fields |
| GET | `/vuln/{identifier}/affected-packages` | | Tracked packages the vulnerability affects. **inputs** |
| GET | `/vuln/{identifier}/scorecard` | | OpenSSF Scorecards of the affected repositories. **inputs** |
| GET | `/scorecard/search` | `q`*, `limit=20` ≤100, `offset` | Scorecards by repository name |

## Remediation

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/vuln/{identifier}/fixes/registry` | `ecosystem`, `package`, `packageName`, `purl`, `tei`, `limit=100` ≤500, `offset` | Fixed package versions in registries. **inputs**, Pro fields |
| GET | `/vuln/{identifier}/fixes/distributions` | `distro` (`ubuntu`, `debian`, `redhat`, `almalinux`, `rockylinux`, `centos`, `oracle`, `suse`, `alpine`, `amazon`, `fedora`, `arch`, `gentoo`, `chainguard`, `wolfi`, `tuxcare`, `echo`, `mariner`), `os`, `limit=100` ≤500, `offset` | Linux distribution patches. **inputs** |
| GET | `/vuln/{identifier}/fixes/source` | `type=all` (`all`, `commit`, `pr`, `gist`, `exploit_db`, `vulnerability_lab`), `limit=100` ≤500, `offset` | Upstream source-code fixes. **inputs** |
| GET | `/vuln/{identifier}/workarounds` | | Workarounds. **inputs** |
| GET | `/vuln/{identifier}/advisories` | | Vendor advisories. **inputs** |
| GET | `/vuln/{identifier}/cwe-guidance` | | Remediation guidance for the CVE's CWEs. **inputs** |
| GET | `/vuln/{identifier}/remediation-plan` | `ecosystem`, `packageName`, `package`, `packageManager`, `currentVersion`, `version`, `purl`, `cpe`, `os`, `containerImage`, `topology=unknown` (`single-host`, `cluster`, `serverless`, `unknown`), `includeGuidance=false`, `includeVerificationSteps=false`, `repo` (`owner/name`) | A plan of actions for your context. With a stored [`SsvcPolicy`](/vulnerability-management/prioritisation/ssvc/#in-the-cli-scan-and-the-remediation-plan), `ssvc` is decided under it, using the criticality of `repo`. **inputs**, Pro fields |

## Exploits and threat activity

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/exploits` | `q`, `ecosystem`, `source` (`exploitdb`, `metasploit`, `nuclei`, `nmap-nse`, `vulncheck-xdb`, `crowdsec`, `github`, `poc`), `severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `NONE`), `inKev` (`true`, `false`, `1`, `0`), `minEpss` 0 to 1, `sort=recent` (`recent`, `epss`, `severity`, `maturity`), `limit=100` ≤100, `offset` | Search vulnerabilities that have exploits. Pro fields |
| GET | `/exploits/{identifier}` | `includeContent=false` (`include_content` deprecated), `limit=100` ≤1000, `offset` | Exploits and sightings for one vulnerability. Pro fields |
| GET | `/vuln/{identifier}/exploits` | | Archived exploit files for a vulnerability. **inputs**, Pro fields |
| GET | `/exploits/{exploitUuid}/archive` | | The archived exploit file. **Pro** |
| GET | `/exploits/{exploitUuid}/archive/meta` | | The archive's metadata, before you download it. **Pro** |
| GET | `/vuln/{identifier}/nuclei` | `format=json` (`json`, `yaml`), `first=false` | Nuclei templates. **inputs** |
| GET | `/vuln/{identifier}/iocs` | | IOC pivots: CrowdSec sightings and Shadowserver counts. **inputs**, Pro fields |
| GET | `/iocs` | `cveId`, `country`, `asn`, `behavior`, `reputation`, `since`, `format=json` (`json`, `stix`, `csv`), `limit=100` ≤500, `offset`, input parameters | IOC sighting search. Pro fields; `format=stix` is **Pro** |
| GET | `/vuln/{identifier}/sightings` | | Merged in-the-wild observation timeline. **inputs**, Pro fields |
| GET | `/vuln/{identifier}/threat-actors` | | Threat actors behind a malicious package, with their key fingerprints, IOCs and impersonated repositories. **inputs**, Pro fields |
| GET | `/triage` | `minEpss` 0 to 1, `minEpssPercentile` 0 to 100, `minCess` 0 to 10, `minCvss` 0 to 10, `severity` (`critical`, `high`, `medium`, `low`), `inKev` (`true`, `false`, `1`, `0`), `kevSource` (`CISA`, `vulnetix`, `enisa`, `vulncheck`; repeatable), `cwe`, `vendor`, `product`, `since`, `windowDays` 1 to 30, `sort=cvss` (`epss`, `cess`, `cvss`, `published`, `kev-due`), `limit=100` ≤200, `offset` | Score-driven triage feed |
| GET | `/exploit-trends` | | Global exploit-intelligence trends |

## Known exploited vulnerabilities

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/kev` | `cveId`, `source` (`CISA`, `vulnetix`, `enisa`, `vulncheck`), `since`, `until`, `dueBefore`, `dueAfter`, `vendor`, `product`, `sort=added` (`added`, `due`, `cve`), `limit=100` ≤200, `offset`, input parameters | The KEV catalogue across all four sources |
| GET | `/vulnetix-kev` | `format=json` (`json`, `csv`), `reason` (`crowdsec_sighting`, `misp_sighting`, `shadowserver_sighting`, `shadowserver_surge`, `multi_source_sighting`, `snort_rule`, `nuclei_template`, `metasploit_module`, `nse_script`, `yara_rule`, `exploitdb_verified`, `known_ransomware`, `vendor_exploited`, `zero_day_itw`, `reported_itw`, `demonstrated_exploit`, `critical_cvss`), `mode=any` (`any`, `all`), `includeReferences` (`1`; `include-references` deprecated), `include` (`cisa`, `enisa`), `include-cisa` (`1`), `include-enisa` (`1`), `limit=1000` ≤5000, `offset` | The Vulnetix-derived KEV catalogue, optionally with the CISA and ENISA catalogues appended |
| GET | `/vuln/{identifier}/kev` | | KEV status and required action for one vulnerability. **inputs**, Pro fields |

## Detection rules and defences

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/vuln/{identifier}/snort-rules` | `limit=100` ≤500, `offset` | Snort and Suricata rules for a vulnerability. **inputs**, Pro fields |
| GET | `/snort-rules` | `cveId`, `source`, `technique`, `tactic`, `classtype`, `severity`, `protocol` (for example `tcp`, `udp`, `http`, `icmp`, `tls`, `ip`), `action` (for example `alert`, `pass`, `drop`, `reject`, `log`), `dstPort`, `srcPort`, `disabled`, `q`, `affectedProduct`, `tag`, `since`, `until`, `sort=recent` (`recent`, `severity`, `id`), `limit=100` ≤200, `offset`, input parameters | Snort rule search. Pro fields |
| GET | `/vuln/{identifier}/yara-rules` | `limit=100` ≤500, `offset` | YARA rules for a vulnerability. **inputs**, Pro fields |
| GET | `/yara-rules` | `cveId`, `source`, `ruleName`, `author`, `tag`, `imports`, `q`, `matchString`, `matchMeta`, `since`, `until`, `sort=recent` (`recent`, `name`), `limit=100` ≤200, `offset`, input parameters | YARA rule search. Pro fields; `matchString` is **Pro** |
| GET | `/vuln/{identifier}/attack-techniques` | | MITRE ATT&CK techniques mapped to a vulnerability. **inputs** |
| GET | `/attack-techniques` | `techniqueId`, `tactic`, `cveId`, `source`, `capecId`, `domain`, `subtechnique`, `derivedBy`, `q`, `since`, `until`, `limit=100` ≤200, `offset`, input parameters | Technique-mapping search |
| GET | `/vuln/{identifier}/virtual-patches` | `limit=100` ≤200, `offset`, input parameters | Blocking rules (WAF, IPS) derived from real exploits. **inputs**, Pro fields |
| GET, POST | `/virtual-patches` | `kind` (`SNORT`, `SURICATA`, `MODSECURITY`, `NGINX`, `AWS_WAF`, `CLOUDFLARE_WAF`, `REGEX_L7`; repeatable or comma-separated), `confidence` (`HIGH`, `MEDIUM`, `LOW`), `deployMode` (`log`, `block`), `exploitSource`, `q`, `limit=100` ≤200, `offset`, input parameters (query on GET, JSON body on POST) | Virtual-patch search. Pro fields |
| GET | `/virtual-patches/{uuid}/archive` | | One virtual patch as the file its tool expects. **Pro** |
| GET | `/vuln/{identifier}/countermeasures` | `limit=100` ≤200, `offset`, input parameters | Detection content (Sigma, YARA, STIX, OpenIOC) derived from real exploits. **inputs**, Pro fields |
| GET, POST | `/countermeasures` | `kind` (`SIGMA`, `YARA`, `STIX`, `OPENIOC`; repeatable or comma-separated), `confidence` (`HIGH`, `MEDIUM`, `LOW`), `deployMode` (`log`, `block`), `exploitSource`, `q`, `limit=100` ≤200, `offset`, input parameters (query on GET, JSON body on POST) | Countermeasure search. Pro fields |
| GET | `/countermeasures/{uuid}/archive` | | One countermeasure as a file. **Pro** |
| POST | `/defences/counts` | JSON body `{items}`: 1 to 100 items, each of input parameters and an optional `key`; at most 256 KiB | Virtual-patch and countermeasure counts per item, with at most 50 defences listed per lane. Counts on every plan; the listed defences are Pro fields |

## VEX

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/vuln/{identifier}/vex` | | VEX statements your organisation has uploaded for a vulnerability. **inputs** |
| GET | `/vex` | `cveId`, `status` (`not_affected`, `affected`, `fixed`, `under_investigation`), `supplier`, `since`, `limit=100` ≤200, `offset`, input parameters | Search your organisation's VEX statements |

## Packages and products

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/product/{name}` | `ecosystem`, `withVulnIntel` (`1`), `currentVersion`, `limit=100` ≤500, `offset` | A product's versions and their sources. Pro fields |
| GET | `/product/{name}/{version}` | `ecosystem`, `withVulnIntel` (`1`), `currentVersion`, `limit=100` ≤500, `offset` | One version. Pro fields |
| GET | `/product/{name}/{version}/{ecosystem}` | `withVulnIntel` (`1`), `currentVersion`, `limit=100` ≤500, `offset` | One version in one ecosystem (for example `npm`, `pypi`, `maven`, `go`, `cargo`, `nuget`, `rubygems`, `generic`). Pro fields |
| GET | `/{package}/versions` | `ecosystem`, `withVulnIntel` (`1`), `currentVersion`, `limit=100` ≤500 (≤100 with `withVulnIntel=1`), `offset` | Every known version of a package across ecosystems. Pro fields |
| GET | `/{package}/vulns` | `ecosystem`, `withVulnIntel` (`1`), `currentVersion`, `limit=100` ≤500, `offset` | Every version with its CVE ids. Pro fields |
| GET | `/{package}/issues` | | Placeholder: always `status: under_construction` |
| GET | `/{ecosystem}/{package}` | `limit=100` ≤500, `offset` | Product-index rows for a package within one ecosystem |
| GET | `/{ecosystem}/{package}/versions` | `limit=100` ≤500, `offset` | Its known versions |
| GET | `/{ecosystem}/{group}/{artifact}` | `limit=100` ≤500, `offset` | A Maven-style `group/artifact` package |
| GET | `/packages/search` | `q`*, `ecosystem`, `limit=100` ≤100, `offset` | Search packages by name. Pro fields |
| GET | `/packages` | `q`, `ecosystem`, `page=1` ≤2000, `perPage=50` ≤50 | Package catalogue, recent or searched. Pro fields (`eol` of vendor-lifecycle products) |
| GET | `/packages/stats` | | Catalogue metrics and publish histogram |
| GET | `/packages/org` | `q`, `ecosystem`, `page=1` ≤2000, `perPage=50` ≤50 | Your organisation's package inventory. Pro fields (`eol` of vendor-lifecycle products) |
| GET | `/packages/org-stats` | | Your organisation's package metrics and history |
| GET | `/packages/enrichment` | `purl`, `name`, `ecosystem`, `version`, `q`, `page=1` ≤500, `perPage=25` ≤100 | Safe Harbour enrichment for one package. Pro fields |
| GET | `/packages/safety-matrix` | `name`*, `ecosystem`, `version`, `live=1` (`0`, `1`), `repo`, `source` (`github`), `distro`, `arch=amd64` | Per-version safety matrix (Safe Harbour). **Pro**; free-demo packages on every plan |
| POST | `/packages/safety-matrix/bulk` | JSON body: `packages` (≤100, each `name`*, `ecosystem`*, `version`, `repo`), `distro`, `arch=amd64` | Safe Harbour picks for a batch of packages. Pro per package |
| POST | `/packages/refresh` | JSON body: `packages`* (1 to 50, each `name`*, `ecosystem`*, `version`) | Refresh packages from their registries and recompute Safe Harbour. Pro per package; per-package cooldown and per-organisation daily cap |
| GET | `/packages/free-demo` | | Packages whose Safe Harbour data is free on every plan. **Open** |
| GET | `/malware/{ecosystem}/{package}` | `{ecosystem}` one of `npm`, `pypi`, `go`, `golang`, `maven`, `cargo`, `crates`, `rubygems`, `nuget`, `packagist`, `composer`, `pub`, `hex`, `vscode`, `openvsx` | Known malware for a package, with threat-actor attribution. Pro fields |

## Inputs

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET, POST | `/inputs/resolve` | [Input parameters](/vdb-api/api/inputs/#input-kinds) (query on GET, JSON body on POST). The legacy spellings `vulnIds`, `cveId`, `identifier`, `packageName`, `packageVersion` and `currentVersion` are deprecated | The advisory ids the inputs resolve to |

## SBOM and manifest scanning

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/scan/manifest` | `multipart/form-data`: `file`*, `type`* (`package.json`, `package-lock.json`, `requirements.txt`, `Pipfile.lock`, `go.sum`, `go.mod`, `Cargo.lock`, `Gemfile.lock`, `pom.xml`, `composer.lock`, `yarn.lock`, `pnpm-lock.yaml`), `ecosystem`. 10 MiB, 5,000 dependencies | A CycloneDX 1.6 document of the vulnerabilities found. Pro fields (`reachability`) |
| POST | `/scan/spdx` | SPDX JSON document | Matches for every package in the document. Pro fields |
| POST | `/scan/cyclonedx` | CycloneDX JSON BOM | Matches for every component in the BOM. Pro fields |

## End of life

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/eol/products` | `category`, `tag`, `search`, `limit=100` ≤500, `offset` | Products with lifecycle data. Pro rows |
| GET | `/eol/products/{product}` | | A product and its release cycles. **Pro** for vendor-lifecycle products; endoflife.date products on every plan |
| GET | `/eol/products/{product}/releases/{release}` | | One release's lifecycle. **Pro** for vendor-lifecycle products; endoflife.date products on every plan |
| GET | `/eol/categories` | | Product categories with counts. Pro rows |
| GET | `/eol/identifiers` | `q`*, `type` (`purl`, `cpe`, `repology`), `limit=100` ≤500, `offset` | Products by purl, CPE or Repology id. Pro rows |
| GET | `/eol/calendar/{month}` | `{month}` as `YYYY-MM` | Lifecycle events dated in a month. Pro rows |

## Enumerations

| Method | Path | Returns |
|---|---|---|
| GET | `/ecosystems` | Package ecosystems with package counts |
| GET | `/sources` | Vulnerability data sources |
| GET | `/metric-types` | Scoring metric types with record counts |
| GET | `/exploit-sources` | Exploit reference sources with counts |
| GET | `/exploit-types` | Exploit-DB exploit types with counts |
| GET | `/fix-distributions` | Linux distributions with fix advisories |

## Statistics and trends

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/summary` | | Database totals |
| GET | `/vendor-trends` | | Vendor counts over time, split CVE, GHSA and other |
| GET | `/nvd-deep-dive` | | Counts of CVE records missing each kind of enrichment, all-time, per year and per month |
| GET | `/malware-campaigns` | | Reconstructed supply-chain malware campaigns |
| GET | `/malware-trends` | | Supply-chain malware trends across four feeds |

## AI threat intelligence

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/ai-discoveries` | `aiOrg`, `aiSystem`, `harness`, `severity`, `milestoneType`, `humanAssisted`, `notable`, `limit=1000` ≤5000, `offset` | Vulnerabilities discovered by AI systems |
| GET | `/ai-assisted-exploits` | | Exploits an AI produced for human-found bugs |
| GET | `/ai-in-wild-exploitations` | | AI-authored exploitation seen in the wild |
| GET | `/ai-generated-malware` | | Malware families written by or running AI |
| GET | `/ai-discovered-vulns-outcomes` | | What happened after discovery to each AI-discovered vulnerability (KEV, exploits, EPSS), with roll-ups |
| GET | `/ai-assisted-exploits-outcomes` | | Curated AI-assisted exploit demonstrations, with a leaderboard per researcher organisation |

## Vendor advisory archives

| Method | Path | Returns |
|---|---|---|
| GET | `/msrc/patch-tuesdays` | Microsoft Patch Tuesday releases |
| GET | `/msrc/patch-tuesday/{date}` | One release, `{date}` as `YYYY-MM-DD` |
| GET | `/msrc/patch-tuesday-preparation` | Advisories pending the next Patch Tuesday |
| GET | `/redhat/archives`, `/redhat/archive/{month}` | Red Hat advisories |
| GET | `/broadcom/archives`, `/broadcom/archive/{month}` | Broadcom advisories: VMware, Bitnami, Cloud Foundry and Tanzu |
| GET | `/aws/archives`, `/aws/archive/{month}` | AWS advisories: Amazon Linux (ALAS), AWS Security Bulletins and the AWS SDKs |
| GET | `/cisco/archives`, `/cisco/archive/{month}` | Cisco PSIRT advisories (`cisco-sa-*`) and records from other sources naming Cisco as vendor |
| GET | `/alibaba/archives`, `/alibaba/archive/{month}` | Alibaba Cloud Linux 2 advisories (`ALINUX2-SA-*`) and records naming Alibaba or Aliyun as vendor |
| GET | `/cloudflare/archives`, `/cloudflare/archive/{month}` | Cloudflare advisories: GitHub advisories, blog advisories (`CFADVISORY-*`) and changelog advisories (`CFADVISORY-CL-*`) |
| GET | `/suse/archives`, `/suse/archive/{month}` | SUSE advisories: SLES (`SUSE-SU-*`), openSUSE (`openSUSE-SU-*`), and Rancher RKE2, K3s and NeuVector |
| GET | `/google/archives`, `/google/archive/{month}` | Google advisories: GCVE, Google Cloud, Project Zero, and records naming Google or a Google open source project |
| GET | `/apple/archives`, `/apple/archive/{month}` | Records naming Apple as vendor: macOS, iOS, Safari, Xcode and the rest |
| GET | `/canonical/archives`, `/canonical/archive/{month}` | Canonical Ubuntu Security Notices (`USN-*`) |
| GET | `/alpine/archives`, `/alpine/archive/{month}` | Alpine secdb, Chainguard and Wolfi advisories, with container-origin attribution |
| GET | `/alpine/registries` | Container registries with advisory counts |
| GET | `/google/projects` | Google open source projects with CVE counts |
| GET | `/google/project-zero/recent` | Recent Project Zero in-the-wild entries |
| GET | `/raw/sources` | Sources whose raw upstream records are archived. **Business** |
| GET | `/raw/{source}/{cveId}` | The raw upstream advisory bytes, `{source}` one of `mitre-cve`, `ghsa`, `osv`, `euvd`, `nist-nvd`, `vulncheck-nvd`, `vulncheck-kev`, `cisa-kev`. **Business** |

For each vendor, `/archives` lists the months that have advisories, and `/archive/{month}` returns that vendor's advisories for one month, with `{month}` as `YYYY-MM`. Another format is `400` `Invalid month. Use YYYY-MM`. Neither takes query parameters.

## Cloud

| Method | Path | Parameters | Returns |
|---|---|---|---|
| GET | `/cloud-locators` | `vendor`, `product` | URL and identifier templates for cloud resources. Pro fields |
| POST | `/crit/lookup` | `view` (`slim`, `full`); JSON body `provider`*, `service`*, `resource_type`* | CRIT cloud-resource record lookup. **Open** |
| GET | `/crit/lookup/{provider}/{service}/{resource_type}` | `view` (`slim`, `full`), `If-None-Match` header | The same lookup, cacheable. **Open** |
