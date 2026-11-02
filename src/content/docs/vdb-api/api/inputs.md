---
title: Identifiers and inputs
description: The advisory id formats the VDB API accepts, and the other input kinds (package, purl, CPE, SWID, TEI, CEL) that resolve to advisory ids on the vulnerability routes and the collection searches.
order: 3
sources: [vdb-api/internal/handler/inputs_routes.go, vdb-api/internal/handler/inputs_resolve.go, vdb-api/internal/inputs/inputs.go, vdb-api/internal/handler/openapi-v2.json, cli/cmd/vdb_zz_inputs.go]
checked: [vdb-api@4145f0a, cli@4c8c3b71c]
updated: 02 Nov 2026
---

## Advisory ids

Every route with `{identifier}` in its path takes an advisory id from any family the database holds, not only CVE. Aliases are followed both ways, so a GHSA finds what was filed under its CVE and the reverse.

| Family | Example | Family | Example |
|---|---|---|---|
| CVE | `CVE-2021-44228` | RHSA | `RHSA-2025:1730` |
| GHSA | `GHSA-jfh8-3a1q-hjz9` | DSA, DLA | `DSA-4741-1` |
| PYSEC | `PYSEC-2024-123` | USN | `USN-7040-1` |
| GO | `GO-2024-1234` | ALSA, RLSA | `ALSA-2019:2722` |
| RUSTSEC | `RUSTSEC-2024-1234` | MGASA | `MGASA-2024-0327` |
| EUVD | `EUVD-2025-14498` | OPENSUSE | `OPENSUSE-SU-2019:1915-1` |
| OSV | `OSV-2024-1234` | FreeBSD | `FreeBSD-SA-00:01.make` |
| GSD | `GSD-2024-1234` | BIT (Bitnami) | `BIT-OPENBLAS-2021-4048` |
| GCVE | `GCVE-VVD-2025-0001` | SNYK | `SNYK-JAVA-ORGCLOJURE-5740378` |
| ZDI | `ZDI-23-1714` | MSCVE, MSRC | `MSCVE-2025-21415` |
| TALOS | `TALOS-2023-1896` | EDB | `EDB-10102` |
| MFSA | `MFSA2024-51` | JVNDB | `JVNDB-2023-006199` |
| CNVD | `CNVD-2024-02713` | BDU | `BDU:2024-00390` |

URL-encode ids that contain `:` or `/` when you put them in a path.

## Input kinds

Most v2 vulnerability routes and collection searches also take the software itself and resolve it to the advisories that affect it, with the same matcher `vulnetix sca` uses.

| Query parameter | Input | Notes |
|---|---|---|
| `vulnId` (also `cveId`) | Advisory ids | Repeat or comma-separate. At most 100 per request |
| `package` (also `packageName`) | A package as its ecosystem names it | npm `@scope/name`, Maven `group:artifact` or `group/artifact`, a Go module path |
| `ecosystem` | The package's ecosystem | A purl type or an alias: `npm`, `pypi`/`pip`, `maven`, `golang`/`go`, `cargo`/`crates.io`, `gem`/`rubygems`, `nuget`, `composer`/`packagist`, `deb`, `rpm`, `apk`, `hex`, `pub`, `swift`, `cocoapods`, `github`, `docker`. Without it a name matches in every ecosystem |
| `version` | Version of the package, product, CPE or SWID tag | Without one, every advisory for the software counts and `resolved.versionless` is `true` |
| `vendor`, `product` | Software as CVE records and CPEs name it | Vendor spellings are matched (`apache`, `The Apache Software Foundation`) |
| `cpe` | CPE 2.3 string or CPE 2.2 URI | Vendor and product must be concrete; `*` or `-` version means every version |
| `purl` | Package URL | Its type is its ecosystem |
| `swid` | ISO/IEC 19770-2 SoftwareIdentity tag | XML or base64 of it, 64 KiB at most. A tag id alone is `422` |
| `tei` | Transparency Exchange Identifier | purl TEIs from any domain. uuid TEIs resolve against your organisation's transparency log. `swid`, `hash`, `eanupc`, `gtin`, `asin` and `udi` TEIs are `422` |
| `cel` | TEA Insights CEL predicate | Evaluated over your organisation's transparency log (the TEA Explorer dialect). 4 KiB at most |

Any text field longer than 512 characters is `413`.

### On `/v2/vuln/{identifier}/*` routes

Put a purl, CPE, TEI or SWID tag in the `{identifier}` slot. Every `/v2/vuln/{identifier}/*` route takes one except `virtual-patches` and `countermeasures`, which take an advisory id only. The route runs once for each advisory it resolves to, at most 50, ordered known-exploited first, then CVE, GHSA and CNVD ids, then the rest, newest first. The answer becomes:

```json
{
  "resolved": { "kinds": ["purl"], "vulnIds": ["CVE-2021-44228", "..."], "packages": [ ... ] },
  "results": [ { "vulnId": "CVE-2021-44228", "...": "the route's normal answer" } ],
  "hasMore": false
}
```

A literal advisory id is passed straight through, and the route answers exactly as it does without input kinds.

### On collection searches

`/v2/kev`, `/v2/iocs`, `/v2/vex`, `/v2/snort-rules`, `/v2/yara-rules` and `/v2/attack-techniques` take the input parameters above. They resolve to advisory ids, which replace the route's own `cveId` filter, and `resolved` is added to the answer. `/v2/virtual-patches` and `/v2/countermeasures` read the same parameters themselves, from the query string on `GET` or a JSON body on `POST`.

### Resolving without a lookup

`GET /v2/inputs/resolve` (or `POST` with the inputs as a JSON body) returns only the `resolved` block. It is open to every plan.

```bash
curl -s -H "Authorization: ApiKey ${VULNETIX_ORG_ID}:${VULNETIX_API_KEY}" \
  "https://api.vdb.vulnetix.com/v2/inputs/resolve?purl=pkg:npm/lodash@4.17.20"
```

`resolved.truncated` is `true` when a TEI or CEL selection was capped at 500 packages, or a CEL evaluation at 5,000 matches.

## In the CLI

Every `vdb` command that takes a `<vuln-id>` also takes a purl, CPE, TEI, SWID tag file or JSON object in its place, or these flags: `--vuln-id`, `--package` with `--ecosystem` and `--package-version`, `--purl`, `--vendor` with `--product`, `--cpe`, `--swid` (a file path, `-` for stdin, or the XML), `--tei` and `--cel`.

The CLI resolves the input first and runs the command once per advisory, at most 25. A command's own flag of the same name keeps its meaning, so `fixes --purl` still filters the fixes to that package.

```bash
vulnetix vdb workarounds pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1
vulnetix vdb kev get cpe:2.3:o:paloaltonetworks:pan-os:11.1.0:*:*:*:*:*:*:*
vulnetix vdb exploits --vendor apache --product log4j --package-version 2.14.1
vulnetix vdb advisories urn:tei:purl:vulnetix.com:pkg:npm/lodash@4.17.20
```
