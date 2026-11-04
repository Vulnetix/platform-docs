---
title: Conformance
description: Results of the black-box TEA conformance suite against the Vulnetix 1.0.0 roots, the declared deviation, and how to run the suite yourself.
order: 1
sources: [vdb-site/docs/tea/tea-conformance-report-1.0.0.md, vdb-site/docs/tea/tea-conformance-report-public-1.0.0.md, vdb-site/api/internal/teaconformance/suite.go, vdb-site/justfile]
checked: [vdb-site@1a06d67]
updated: 02 Nov 2026
---

The conformance suite is a black-box HTTP client. It knows nothing about the implementation: it fetches the specification from its authoritative repository at the start of each run and checks every response against it. OpenAPI 3.1 schema objects are JSON Schema 2020-12, so the specification's own bytes are what is enforced. Rules that cannot be written as schema (collection and release UUID identity, lifecycle event order, page-token consistency, `additionalProperties: false` on errors) are checked as separate cases.

## Latest results

Run on 13 Oct 2026 against TEA OpenAPI 1.0.0, 32 requests in flight, with an API key.

| | First party | Open source |
|---|---|---|
| Target | `https://www.vulnetix.com/tea/v1.0.0` | `https://www.vulnetix.com/tea/public/v1.0.0` |
| Verdict | CONFORMANT | CONFORMANT |
| Operations declared / exercised | 28 / 28 | 28 / 28 |
| Test cases passed | 212 of 212 | 213 of 213 |
| Responses schema-validated, all conforming | 141 | 139 |

### Cases by category (first party)

| Category | Cases | Passed |
|---|---:|---:|
| conformance | 24 | 24 |
| discovery | 1 | 1 |
| download | 4 | 4 |
| filtering | 2 | 2 |
| negative | 113 | 113 |
| pagination | 60 | 60 |
| security | 8 | 8 |

### Performance (first party)

Cold start, the first request against a tenant whose index is not built: 91 ms. Each steady-state row replays one request 100 times at 32 in flight; validation runs after the timer stops.

| Request | p50 | p95 | p99 |
|---|---:|---:|---:|
| list products | 32.75 ms | 37.05 ms | 39.76 ms |
| read one product release with its latest collection | 33.70 ms | 47.24 ms | 48.63 ms |
| component release with latest collection | 36.75 ms | 46.21 ms | 46.31 ms |
| latest collection | 33.93 ms | 40.34 ms | 65.90 ms |
| resolve a TEI | 35.03 ms | 59.16 ms | 116.72 ms |
| artifact metadata | 38.88 ms | 82.33 ms | 118.74 ms |

## Declared deviation

| Topic | The specification | The server | Why |
|---|---|---|---|
| Anonymous read of a private object | `401` with a Bearer challenge | `404 OBJECT_UNKNOWN`, the same as an object that does not exist | The anonymous index cannot tell a private object from a missing one, and answering `404` stops a caller probing another tenant's UUIDs. A caller with a credential is unaffected. |

## How the results are produced

Vulnetix runs a conformance suite against the public server for each specification version above, authenticated as an organisation and anonymously. The suite is part of the server's own tests and is not published. The results on this page are from that run.

Reports are written to `docs/tea/` (override with `TEA_REPORT_DIR`). Point the root at any TEA server to test it.

The 0.4.0 run of 7 Aug 2026 (290 cases, 289 passed, 1 advisory) also covered the publication API as a create, read, update and delete round trip, and the Insights API.
