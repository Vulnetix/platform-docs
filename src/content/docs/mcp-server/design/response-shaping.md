---
title: Response shaping
description: How a 2.6 MB vdb-api record shrinks to about 10 KB without dropping a decision field, which tools reduce what, and how the port matches the Pix jq filters.
order: 2
sources:
  - mcp-server/src/shaping/filters/
  - mcp-server/src/shaping/jqlib.ts
  - mcp-server/DIVERGENCES.md
  - mcp-server/README.md
  - mcp-server/test/shaping.test.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

vdb-api returns records sized for machines with disks. The raw record for `CVE-2021-44228` is 2,606,571 bytes, about 650,000 tokens, and a Pro-tier exploits record can reach 12 MB. Every tool reduces its response on the server before it is serialised.

## Where the bytes are

Measured on the Log4Shell record:

| Part | Size | Contents |
|---|---|---|
| `affected` | 127 KB | 200 of 676 entries, most with empty version ranges |
| `crit` | 43 KB | 33 cloud resource locator records |
| `purls` | 28 KB | 499 package URLs |
| everything else | about 9 KB | every field a decision rests on |

The decision-grade content is already small. The bulk is enumeration.

## The three `vulnetix_vuln` views

| View | Bytes | Of raw |
|---|---|---|
| Raw upstream (`detail: "raw"`) | 2,606,571 | 100% |
| `detail: "full"` | 207,604 | 7.97% |
| `detail: "summary"` (default) | 10,613 | 0.41% |

`summary` keeps threat exposure, attack surface, SSVC, KEV, EPSS, exploitation maturity, remediation timeline, affected routines, attack paths and reachability as they are, and replaces `affected`, `purls` and the cloud locators with counts, groups and samples. The full record is linked as `vulnetix://vuln/{id}/full`.

## The rule

Counts and structure survive; enumerations are sampled and capped.

| Tool | Raw to shaped | What was removed |
|---|---|---|
| `vulnetix_workarounds` | 161,222 to 198 | Near-identical prose repeated across sources |
| `vulnetix_timeline` | 288,080 to 9,051 | Provenance for nine upstreams; events capped at 60 |
| `vulnetix_advisories` | 277,149 to 8,190 | Errata capped, duplicate descriptions collapsed |
| `vulnetix_remediation` | 467,156 to 27,288 | 800 commit URLs became a count plus a sample |
| `vulnetix_package_vulns` | 84,274 to 11,899 | The same ids repeated across every version |

Detection rules are the exception. `vulnetix_detection_rules` returns fewer whole rules (10 Snort, 8 YARA, 5 Nuclei) rather than many truncated ones, because a summary of a rule cannot be deployed.

## Held to the original filters

The shapers are a TypeScript port of the jq filters the Pix plugin uses. A port that drifts fails silently: different references and different exploit samples for the same input. A differential test runs the original jq filters and the port over recorded fixtures in `fixtures/` and asserts the outputs match byte for byte. A byte budget per tool fails the build if an upstream change brings the bloat back.

The test found two bugs in the original filters, since fixed upstream: one read a response shape the endpoint does not return and produced 83 bytes of nulls from an 84 KB response; another invented four fields and dropped the timeline, SSVC, severity and KEV entries.

## Recorded divergences

`DIVERGENCES.md` lists where the port differs on purpose:

| Divergence | Reason |
|---|---|
| `vuln` defaults to the summary projection | The original filter's header claims about 80 KB; measured, it produces 207,646 bytes. `detail: "full"` still returns exact parity. |
| jq `unique_by` ordering is reproduced | jq sorts while deduplicating, so the 20 references and 3 descriptions in `vuln` are the lexicographically smallest. Kept for parity. Exploit samples were fixed upstream and now keep vdb-api's date order. |
| `purl` is composed from two endpoints | vdb-api has no `/purl` route |
| `vulns` and `versions` send the ecosystem as a query parameter | In the path (`/{ecosystem}/{package}`) it selects package information, which has no version-to-advisory map, and the advisory set came back empty |

## Reading the reduction

```json
"vulnetix/shaping": { "rawBytes": 2606569, "shapedBytes": 10613, "ratio": 0.00407 }
```

If a result lacks a field you need, ask for `detail: "full"`, read the full resource, or call the endpoint unshaped with [`vdb_request`](/mcp-server/tools/vdb-request/).
