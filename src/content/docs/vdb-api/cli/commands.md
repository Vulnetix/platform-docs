---
title: vulnetix vdb commands
nav: Commands
description: Every vulnetix vdb subcommand with its arguments, its own flags and the VDB API route it calls, grouped the same way as the endpoint reference.
order: 1
sources: [cli/cmd/vdb.go, cli/cmd/vdb_v2.go, cli/cmd/vdb_kev.go, cli/cmd/vdb_eol.go, cli/cmd/vdb_exploits_poc.go, cli/cmd/vdb_defences.go, cli/cmd/vdb_snort_rules.go, cli/cmd/vdb_yara_rules.go, cli/cmd/vdb_attack_techniques.go, cli/cmd/vdb_iocs.go, cli/cmd/vdb_vex.go, cli/cmd/vdb_triage.go, cli/cmd/vdb_raw.go, cli/cmd/vdb_nuclei.go, cli/cmd/vdb_msrc.go, cli/cmd/vdb_ai.go, cli/cmd/vdb_trends.go, cli/cmd/vdb_sightings.go, cli/cmd/vdb_reachability.go, cli/cmd/vdb_zz_inputs.go, cli/pkg/vdb/api_v2.go, vdb-api/main.go]
checked: [cli@4c8c3b71c, vdb-api@4145f0a]
updated: 02 Nov 2026
---

`vulnetix vdb <command>` calls the [VDB API](/vdb-api/). Every command takes the [global flags](/vdb-api/cli/flags-and-output/) (`-o`, `--org-id`, `--api-key`, `--no-cache` and the rest). The tables list only each command's own flags.

`<vuln-id>` accepts any [advisory id](/vdb-api/api/inputs/#advisory-ids). Commands marked **inputs** also take a purl, CPE, TEI, SWID tag file or JSON object in its place, and the input flags `--vuln-id`, `--package`, `--ecosystem`, `--package-version`, `--purl`, `--vendor`, `--product`, `--cpe`, `--swid`, `--tei` and `--cel`. A non-id input runs the command once per advisory it resolves to, at most 25. See [Identifiers and inputs](/vdb-api/api/inputs/#in-the-cli).

`workarounds`, `advisories`, `cwe guidance`, `scorecard`, `remediation plan`, `triage`, `vendor-trends`, `exploit-trends` and the `ai-*` commands first call a CLI-only `/v2/cli.*` route, then the public route shown below if that errors or returns a placeholder. The Route column shows the public route.

## Vulnerabilities

| Command | Own flags | Route |
|---|---|---|
| `vdb vuln <vuln-id>` | | `/vuln/{id}`; also runs [reachability](#reachability) |
| `vdb search <prefix>` | `--limit 100` (max 500), `--offset` | `/identifiers?prefix=` |
| `vdb ids <year> <month>` | `--limit 100` (max 500), `--offset` | `/identifiers/{year}/{month}` |
| `vdb gcve --start YYYY-MM-DD --end YYYY-MM-DD` | `--start`, `--end` (both required) | `/gcve` |
| `vdb gcve issuances --year N --month N` | `--year`, `--month` (required), `--limit 100` (max 500), `--offset` | `/gcve/{year}/{month}` |
| `vdb timeline <vuln-id>` | `--include`, `--exclude` (`source`, `exploit`, `score-change`, `patch`, `advisory`, `scorecard`), `--dates` (`published,modified,reserved`), `--scores-limit 30` (max 365) | `/vuln/{id}/timeline` |
| `vdb affected <vuln-id>` | `--ecosystem`, `--package-name`, `--limit 100`, `--offset`. **inputs** | `/vuln/{id}/affected` |
| `vdb scorecard <vuln-id>` | | `/vuln/{id}/scorecard` |
| `vdb scorecard search <query>` | | `/scorecard/search` |
| `vdb sightings <CVE-ID>` | `-o <file>`. **inputs** | `/vuln/{id}/sightings` |

## Remediation

| Command | Own flags | Route |
|---|---|---|
| `vdb fixes [vuln-id]` | `--ecosystem`, `--package-name`, `--purl`, `--vendor`, `--product` (filters). **inputs** | `/vuln/{id}/fixes/registry`, `/fixes/distributions` and `/fixes/source`, in parallel |
| `vdb fixes distributions` | | `/fix-distributions` |
| `vdb workarounds <vuln-id>` | **inputs** | `/vuln/{id}/workarounds` |
| `vdb advisories <vuln-id>` | **inputs** | `/vuln/{id}/advisories` |
| `vdb cwe guidance <vuln-id>` | **inputs** | `/vuln/{id}/cwe-guidance` |
| `vdb remediation plan <vuln-id>` | `--ecosystem`, `--package-name`, `--current-version`, `--package-manager`, `--container-image`, `--os` (e.g. `ubuntu:22.04`), `--registry`, `--include-guidance`, `--include-verification-steps` | `/vuln/{id}/remediation-plan` |

## Exploits and threat activity

| Command | Own flags | Route |
|---|---|---|
| `vdb exploits [vuln-id]` | `--limit` (max 1000), `--offset`. **inputs** | `/exploits/{id}` |
| `vdb exploits search` | `-q/--query`, `--ecosystem`, `--source` (`exploitdb`, `metasploit`, `nuclei`, `nmap-nse`, `vulncheck-xdb`, `crowdsec`, `github`, `poc`), `--severity`, `--in-kev`, `--min-epss`, `--sort` (`recent`, `epss`, `severity`, `maturity`), `--limit 100` (max 100), `--offset` | `/exploits` |
| `vdb exploits sources` | | `/exploit-sources` |
| `vdb exploits types` | | `/exploit-types` |
| `vdb exploits archived <CVE-ID>` | `--has-archive true`, `--source`, `--category`, `--platform` (client-side filters), `--limit`, `--offset`, `-o <file>`. **inputs** | `/vuln/{id}/exploits` |
| `vdb exploits poc <exploit-uuid>` | `-o <file>` (default: the server's filename), `--print` | See the warning below |
| `vdb exploits download <CVE-ID>` | `--dir` (default `exploits-<CVE>`), `--all`. **inputs** | See the warning below |
| `vdb nuclei get <CVE-ID>` | `--format json` (`json`, `yaml`), `--first`, `-o <file>`. **inputs** | `/vuln/{id}/nuclei` |
| `vdb iocs get <CVE-ID>` | `-o <file>`. **inputs** | `/vuln/{id}/iocs` |
| `vdb iocs list` | `--cve-id`, `--country` (repeat, AND), `--asn` (repeat, AND), `--behavior`, `--reputation`, `--since` (RFC 3339), `--format json` (`json`, `csv`, `stix`), `--limit 100` (max 500), `--offset`, `-o <file>` | `/iocs` |
| `vdb triage` | `--severity`, `--min-cvss`, `--min-cess`, `--min-epss`, `--min-epss-percentile`, `--in-kev`, `--kev-source` (`CISA`, `vulnetix`, `enisa`, `vulncheck`), `--cwe`, `-d/--days` (1 to 30), `--since`, `--sort cvss` (`cvss`, `cess`, `epss` with `--min-epss` of at least 0.3, `published`, `kev-due`), `--format json` (`json`, `csv`), `--limit 50` (max 200), `--offset`, `-o <file>` | `/cli.triage`, then `/triage` if that errors. See the warning below |
| `vdb exploit-trends` | `-o <file>` | `/exploit-trends` |

> [!CAREFUL] `exploits poc` and `exploits download` call a route the API does not have
> Both commands request `GET /v2/exploits/{uuid}/poc`. vdb-api serves exploit archives at `GET /v2/exploits/{exploitUuid}/archive`, and `/poc` is not registered, so the request falls through to the `/{ecosystem}/{group}/{artifact}` package route and fails with `API error (404): {"error":"Package not found", ...}`. Until the CLI is changed, fetch archives with curl from the `/archive` route, using the exploit UUIDs that `vdb exploits archived` lists.

> [!CAREFUL] `vdb triage` returns no items
> `vdb triage` asks `POST /v2/cli.triage` first and falls back to `GET /v2/triage` only if that call errors. vdb-api's `cli.triage` is still a placeholder that always answers `200` with `"items": []` and the note `cli.triage backend wire-up pending`, so the fallback never runs and the command prints an empty feed whatever the filters. Query `GET /v2/triage` directly until this is fixed; the parameters are in the [endpoint reference](/vdb-api/reference/endpoints/#exploits-and-threat-activity).

## Known exploited vulnerabilities

| Command | Own flags | Route |
|---|---|---|
| `vdb kev get <CVE-ID>` | `-o <file>`. **inputs** | `/vuln/{id}/kev` |
| `vdb kev list` | `--source` (`CISA`, `vulnetix`, `enisa`, `vulncheck`; repeat), `--reason` (repeat), `--all` (every reason, AND), `--include-cisa`, `--include-enisa`, `--format json` (`json`, `csv`), `--no-references`, `--limit`, `--offset`, `-o <file>` | `/kev`, or `/vulnetix-kev` for CSV |
| `vdb kev download` | Same as `kev list`; CSV by default | `/vulnetix-kev?format=csv` |
| `vdb kev reasons` | | Prints the valid `--reason` values: `vendor_exploited`, `zero_day_itw`, `reported_itw`, `demonstrated_exploit`, `known_ransomware`, `crowdsec_sighting`, `misp_sighting`, `shadowserver_sighting`, `shadowserver_surge`, `multi_source_sighting`, `snort_rule`, `nuclei_template`, `metasploit_module`, `nse_script`, `yara_rule`, `exploitdb_verified`, `critical_cvss` |
| `vdb kev sources` | | Prints the four KEV sources |

## Detection rules and defences

| Command | Own flags | Route |
|---|---|---|
| `vdb snort-rules get <CVE-ID>` | `--format json` (`json`, `rules`), `-o <file>`. **inputs** | `/vuln/{id}/snort-rules` |
| `vdb snort-rules list` | `--cve-id`, `--source`, `--technique`, `--tactic`, `--classtype`, `--severity`, `--protocol`, `--action`, `--dst-port`, `--src-port`, `--disabled`, `--match-content`, `--affected-product`, `--tag`, `--since`, `--until`, `--sort recent` (`recent`, `severity`, `id`), `--format`, `--limit 50` (max 200), `--offset`, `-o <file>` | `/snort-rules` |
| `vdb traffic-filters <vuln-id>` | `--limit 100` (max 500), `--offset`. **inputs** | `/vuln/{id}/snort-rules` |
| `vdb yara-rules get <CVE-ID>` | `--format json` (`json`, `rules`), `-o <file>`. **inputs** | `/vuln/{id}/yara-rules` |
| `vdb yara-rules list` | `--cve-id`, `--source`, `--rule-name`, `--author`, `--tag`, `--imports`, `--match-content`, `--match-string`, `--match-meta`, `--since`, `--until`, `--sort recent` (`recent`, `name`), `--format`, `--limit 50` (max 200), `--offset`, `-o <file>` | `/yara-rules` |
| `vdb attack-techniques get <CVE-ID>` | `-o <file>`. **inputs** | `/vuln/{id}/attack-techniques` |
| `vdb attack-techniques list` | `--technique`, `--tactic`, `--cve-id`, `--source`, `--capec`, `--domain` (`Enterprise`, `Mobile`, `ICS`), `--subtechnique`, `--derived-by`, `--q`, `--since`, `--until`, `--limit 50` (max 200), `--offset`, `-o <file>` | `/attack-techniques` |
| `vdb virtual-patches get [input]` | `--format json` (`json`, `snort`, `suricata`, `modsecurity`, `nginx`, `awswaf`, `cloudflare`, `regex`). **inputs** | `/vuln/{id}/virtual-patches` for an advisory id, `/virtual-patches` for other inputs |
| `vdb virtual-patches list` | `--kind` (repeat, OR), `--confidence`, `--deploy-mode` (`log`, `block`), `--exploit-source`, `--match-content`, `--cve-id`, `--format`, `--limit 50` (max 200), `--offset`. **inputs** | `/virtual-patches` |
| `vdb virtual-patches fetch <uuid>` | `-o <file>` | `/virtual-patches/{uuid}/archive` |
| `vdb virtual-patches counts [input...]` | `--file` (one input per line, `-` for stdin), `--format table` (`table`, `json`). **inputs** | `/defences/counts` |
| `vdb countermeasures get [input]` | `--format json` (`json`, `sigma`, `yara`, `stix`, `openioc`). **inputs** | `/vuln/{id}/countermeasures` for an advisory id, `/countermeasures` for other inputs |
| `vdb countermeasures list` | `--kind` (`SIGMA`, `YARA`, `STIX`, `OPENIOC`; repeat, OR), `--confidence`, `--exploit-source`, `--match-content`, `--cve-id`, `--format`, `--limit 50` (max 200), `--offset`. **inputs** | `/countermeasures` |
| `vdb countermeasures fetch <uuid>` | `-o <file>` | `/countermeasures/{uuid}/archive` |
| `vdb countermeasures counts [input...]` | `--file`, `--format table`. **inputs** | `/defences/counts` |

## VEX

| Command | Own flags | Route |
|---|---|---|
| `vdb vex get <CVE-ID>` | `-o <file>`. **inputs** | `/vuln/{id}/vex` |
| `vdb vex list` | `--cve-id`, `--status` (`not_affected`, `fixed`, `under_investigation`, ...), `--supplier`, `--since`, `--limit 50` (max 200), `--offset`, `-o <file>` | `/vex` |

## Packages and products

| Command | Own flags | Route |
|---|---|---|
| `vdb product <name> [version] [ecosystem]` | `--limit 100`, `--offset` | `/product/{name}[/{version}[/{ecosystem}]]` |
| `vdb vulns <package>` | `--limit 100`, `--offset` | `/{package}/vulns` |
| `vdb versions <package>` | | `/{package}/versions` |
| `vdb purl <purl>` | `--vulns` (only when the purl has no version), `--limit 100`, `--offset` | Version and known ecosystem: `/product/{name}/{version}/{ecosystem}`. Version only: `/product/{name}/{version}`. No version: `/product/{name}`, or `/{package}/vulns` with `--vulns` |
| `vdb packages search <query>` | `--ecosystem`, `--limit 100`, `--offset` | `/packages/search` |
| `vdb ecosystem package <ecosystem> <name>` | `--versions` | `/{ecosystem}/{package}` or `/{ecosystem}/{package}/versions` |
| `vdb ecosystem group <ecosystem> <group> <artifact>` | | `/{ecosystem}/{group}/{artifact}` |
| `vdb ecosystems` | | `/ecosystems` |

## End of life

| Command | Own flags | Route |
|---|---|---|
| `vdb eol product <product>` | | `/eol/products/{product}` |
| `vdb eol release <product> <release>` | | `/eol/products/{product}/releases/{release}`; the record `--block-eol` grades a pin against |

## Reference data, statistics and archives

| Command | Own flags | Route |
|---|---|---|
| `vdb sources` | | `/sources` |
| `vdb metrics types` | | `/metric-types` |
| `vdb summary` | | `/summary` |
| `vdb vendor-trends` | `--year YYYY`, `-o <file>` | `/vendor-trends` |
| `vdb ai-discoveries` | `--cve`, `--since`, `--limit 50`, `-o <file>` | `/ai-discoveries` |
| `vdb ai-assisted-exploits` | `--cve`, `--since`, `--limit 50`, `-o <file>` | `/ai-assisted-exploits` |
| `vdb ai-in-wild` | `--cve`, `--since`, `--limit 50`, `-o <file>` | `/ai-in-wild-exploitations` |
| `vdb ai-malware` | `--cve`, `--since`, `--limit 50`, `-o <file>` | `/ai-generated-malware` |
| `vdb msrc patch-tuesdays` | `-o <file>` | `/msrc/patch-tuesdays` |
| `vdb msrc patch-tuesday <YYYY-MM>` | `-o <file>` | `/msrc/patch-tuesday/{date}` |
| `vdb raw sources` | `-o <file>` | `/raw/sources` (Teams) |
| `vdb raw get <CVE-ID>` | `--source` (`mitre-cve`, `ghsa`, `osv`, `euvd`, ...), `-o <file>`. **inputs** | `/raw/{source}/{cveId}` (Teams) |
| `vdb cloud-locators` | `--vendor`, `--product` | `/cloud-locators` |

## Service and local commands

| Command | What it does |
|---|---|
| `vdb status` | Prints CLI version and build, the OpenAPI URL, API health from `/health`, and the auth method and whether it verified |
| `vdb spec` | Prints `/spec` (the OpenAPI document) |
| `vdb cache clear` | Deletes every cached response under `~/.vulnetix/cache/vdb/` |

## Reachability

`vdb vuln` (and the SCA scanner) can run tree-sitter reachability queries for a vulnerability against your project. `--reachability` takes `both` (the default), `direct` (only the installed package folder), `transitive` (only the rest of the project) or `off`.

> [!CAREFUL] Reachability finds no queries on v2
> On v2, the CLI requests `GET /v2/vuln/{id}/tree-sitter`, but vdb-api registers that route only on v1 (`GET /v1/vuln/{identifier}/tree-sitter`). The CLI treats the resulting not-found as "no queries for this vulnerability", so reachability reports nothing rather than failing. Pass `--reachability off` to skip the call.

## Commands that refuse `-V v1`

`timeline`, `affected`, `kev`, `advisories`, `workarounds`, `cwe`, `remediation`, `cloud-locators` and `scorecard` exist only on v2 and exit with an error if you pass `-V v1`. v2 is the default, so drop the flag.
