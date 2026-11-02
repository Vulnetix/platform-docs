---
title: Identifier formats
description: The 31 vulnerability identifier shapes the page scanner matches, with their patterns, and how matches are normalised.
order: 2
sources: [browser-extension/src/shared/identifiers.ts]
checked: [browser-extension@d25ce74]
updated: 02 Nov 2026
---

The scanner matches these shapes, case-insensitively, with a word boundary on each side, so `xCVE-2024-3094` and `CVE-2024-3094x` do not match.

| Prefix | Pattern | Example |
|---|---|---|
| `CVE` | `CVE-YYYY-NNNN+` (four or more digits) | `CVE-2024-3094` |
| `GHSA` | `GHSA-xxxx-xxxx-xxxx` (letters and digits) | `GHSA-jfh8-c2jp-5v3q` |
| `PYSEC`, `RUSTSEC`, `GO`, `OSV`, `MAL`, `GSD`, `VVD`, `VAR`, `GCVE`, `EUVD`, `CNVD`, `BDU`, `TNCVE` | `PREFIX-YYYY-N+` | `RUSTSEC-2023-0071`, `GO-2024-2687`, `EUVD-2025-12345` |
| `RHSA`, `ALSA`, `ALBA`, `ALAS`, `ELSA`, `SUSE-SU`, `OPENSUSE-SU`, `USN`, `DSA`, `DLA`, `SSA` | `PREFIX-YYYY-N+` or `PREFIX-YYYY:N+` | `RHSA-2024:1234`, `USN-2024-6543` |
| `SNYK` | `SNYK-ECOSYSTEM-PACKAGE-N+` (upper-case letters and digits) | `SNYK-JS-LODASH-567746` |
| `ZDI` | `ZDI-YY-N+` | `ZDI-24-123` |
| `MSRC_CVE` | `MSRC_CVE-YYYY-N+` | `MSRC_CVE-2024-21412` |
| `ICSA` | `ICSA-YY-NNN-NN` | `ICSA-24-030-01` |
| `BIG-SLEEP` | `BIG-SLEEP-YYYY-N+` | `BIG-SLEEP-2025-1` |

Bare numbers such as `2024-3094`, and loose prefixes such as `MS-` or `ADV-`, are not matched: they appear in ordinary prose everywhere. To look one up, use the [Resolve console](https://www.vulnetix.com/resolve/lookup).

## Normalisation

Every match becomes one cache key, using the same rule as the VDB API:

1. Unicode dashes (`‐ ‑ ‒ – ― ﹘ ﹣ －` and the em dash) become `-`.
2. The part before the first `-` is upper-cased; the rest is kept as written.
3. For `GHSA`, the rest is lower-cased.

So `ghsa-JFH8-C2JP-5V3Q` and `GHSA-jfh8-c2jp-5v3q` are one identifier, and `cve‑2024‑3094` with non-breaking hyphens is `CVE-2024-3094`.
