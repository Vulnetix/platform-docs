---
title: How statements match findings
nav: Matching
description: The match cascade the CLI uses to decide which VEX statement applies to which vulnerability, from exact purl down to document-wide, and how ties are broken.
order: 2
sources: [cli/internal/vex/match.go, cli/internal/vex/apply.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

`vex apply`, `bom enrich --vex` and `--vex-file` on a scan all use one matcher. It does not require exact equality on `(vulnerability, purl)`. Exact equality is the usual reason VEX appears to do nothing: the statement is never applied and nothing reports an error.

| Case | Exact equality | This matcher |
|---|---|---|
| Statement for `pkg:npm/foo@1.2.3`, scan finds `1.2.4` | misses | matches if the statement scopes a range that includes `1.2.4` |
| Statement names a package with no version | matches nothing | covers every version |
| Vulnerability written as a URL, e.g. an NVD or pkg.go.dev link | never equals `CVE-2021-44228` | reduced to the bare id first |
| Finding reported as `GHSA-…`, statement written against the CVE | misses | matched through the statement's aliases |

## Match bases

When several statements reach one finding, the most specific basis wins. The basis is recorded on the finding as `vulnetix:vex/match-basis`.

| Rank | Basis | The statement |
|---|---|---|
| 1 | `exact-purl` | names this exact purl, version included |
| 2 | `purl-version-listed` | lists this version |
| 3 | `purl-version-range` | scopes a range that contains this version |
| 4 | `subcomponent` | names this purl as a subcomponent of its product |
| 5 | `name-version` | matches on name and version, because neither side has a purl |
| 6 | `purl-any-version` | names the package with no version |
| 7 | `document-wide` | names no product, so it covers everything the document describes |

Between statements of the same rank, the one with the newer timestamp wins. VEX is a running assertion: a later statement about the same thing replaces an earlier one.

## Statements that matched nothing

`vex apply` lists statements that reached no finding. That is the most common reason VEX seems not to work: the documents describe a different product, or a different purl type, from the SBOM.
