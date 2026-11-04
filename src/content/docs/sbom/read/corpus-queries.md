---
title: Query a set of SBOMs
nav: Corpus queries
description: Search packages, vulnerabilities and licences across a directory of SBOMs, and find version skew, with vulnetix bom ls, where, skew and search.
order: 3
sources: [cli/cmd/bom_corpus.go, cli/internal/bom/index.go, cli/internal/bom/collect.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

These four commands answer questions about many SBOMs at once: which services carry a package, where a component sits at four different versions. There is no store and no server. Each run reads the documents you point at, indexes them in memory, and answers.

## Selecting documents

Every corpus command takes these flags.

| Flag | Default | Description |
|---|---|---|
| `--from` | | File, directory or glob to read. Repeatable. Required. |
| `--recursive` | `false` | Walk directories to any depth |
| `--depth` | `0` | Maximum directory depth when `--recursive` is set. `0` is unlimited. |
| `-o`, `--output` | `pretty` | `pretty` (alias `table`) or `json` |

```bash
vulnetix bom ls --from ./sboms/
vulnetix bom ls --from 'releases/*.json'
vulnetix bom ls --from a.cdx.json --from b.spdx.json
```

A document that could not be read is always reported. Answering from fewer documents than you pointed at, without saying so, would turn "no results" into a wrong answer.

## bom ls

Lists each document: subject, version, format, component and vulnerability counts, and deployment labels.

```bash
vulnetix bom ls --from ./sboms/ --recursive
```

```text
Document              Subject           Version  Format          Components  Vulns  Deployment
payments.cdx.json     payment-service   2.4.0    cyclonedx 1.6            3      1  cluster=prod-eu
checkout.cdx.json     checkout-service  1.9.0    cyclonedx 1.6            2      0  cluster=prod-us
docs.spdx.json        docs-site         3.0.0    spdx SPDX-2.3            1      0  -
```

## bom where

Which documents contain a package, at what version, and whether the dependency is direct there. Direct is where the version can be changed.

```bash
vulnetix bom where <package> --from <path> [flags]
```

```bash
vulnetix bom where lodash --from ./sboms/
vulnetix bom where pkg:golang/github.com/hashicorp/golang-lru --from ./sboms/
vulnetix bom where log4j-core --from ./sboms/ --fail-on-found
```

| Flag | Default | Description |
|---|---|---|
| `--fail-on-found` | `false` | Exit `1` when the package is in any document |

`<package>` is a purl with or without a version, a bare name, or a substring. Directness is reported as unknown, never as false, when a document has no dependency graph.

## bom skew

Packages present at more than one version across the corpus, most divergent first, with how many documents carry each version as a direct dependency.

```bash
vulnetix bom skew --from ./sboms/
vulnetix bom skew --from ./sboms/ --min-versions 3
vulnetix bom skew --from ./sboms/ --fail-on-count 0
```

| Flag | Default | Description |
|---|---|---|
| `--min-versions` | `2` | Only report packages at this many versions or more |
| `--fail-on-count` | `-1` | Exit `1` when more than this many packages are skewed. `-1` disables. |

## bom search

Searches four facets, each counted and limited separately: packages, documents, vulnerabilities and licences. A query that matches a thousand components still shows the one document it also matched.

```bash
vulnetix bom search <query> --from <path> [flags]
```

```bash
vulnetix bom search lodash --from ./sboms/
vulnetix bom search log4shell --from ./sboms/
vulnetix bom search AGPL --from ./sboms/ --limit 50
```

| Flag | Default | Description |
|---|---|---|
| `--limit` | `25` | Maximum results per facet |

Vulnerabilities match on identifier and on description, so `log4shell` finds CVE-2021-44228. The query must be at least 2 characters.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | `--fail-on-found` or `--fail-on-count` tripped, `--from` missing, the query too short, or a flag invalid |
