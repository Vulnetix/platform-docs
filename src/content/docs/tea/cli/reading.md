---
title: Reading with the CLI
nav: Reading
description: The vulnetix tea read commands (discover, products, components, product, collection, resolve, distribution list) with flags, paging and server selection.
order: 1
sources: [cli/cmd/tea.go, cli/cmd/tea_search.go, cli/cmd/tea_distribution.go, cli/pkg/tea/client.go, cli/pkg/tea/objects.go, cli/pkg/tea/tei.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

`vulnetix tea` reads any conformant TEA server, not only Vulnetix's.

## Global flags

| Flag | Default | Description |
|---|---|---|
| `--server` | `https://www.vulnetix.com/tea/v1.0.0` | TEA root URL. A supplier's server works for every read. |
| `--catalogue` | `first-party` | `first-party` or `public` (the open source catalogue). Not combinable with `--server`. |
| `--json` | `false` | Print raw JSON instead of a table |

The CLI reads TEA 1.0.0 and 0.4.0. To get the 0.4.0 shapes, use `--server https://www.vulnetix.com/tea/v0.4.0`.

## Commands

| Command | Does |
|---|---|
| `tea discover <domain\|url\|tei>` | Fetch `https://<domain>/.well-known/tea` and report the endpoints and the root to use |
| `tea products` | List or search products |
| `tea components` | List or search components |
| `tea product <uuid>` | One product and its releases |
| `tea collection <product-release-uuid>` | The latest collection of a product release, and its artifacts |
| `tea resolve <tei\|purl>` | The product release an identifier names, and the servers that serve it. A purl needs a 1.0.0 server. |
| `tea distribution list <component-release-uuid>` (alias `dist`) | Where a component release can be obtained |

```bash
vulnetix tea discover vulnetix.com
vulnetix tea products --purl pkg:github/Vulnetix/cli
vulnetix tea product 54e8820d-0803-5a4f-858d-88a279486564
vulnetix tea collection 959d737f-7a54-51b7-b236-6ed079105345
vulnetix tea distribution list e5a33f26-8056-5f16-a950-41a0db12d48f
vulnetix tea resolve tei://vulnetix.com/uuid/54e8820d-0803-5a4f-858d-88a279486564
vulnetix tea --catalogue public products --search pixi
```

A TEI may be written `tei://<domain>/<type>/<id>` or `urn:tei:<type>:<domain>:<id>`. The CLI sends it in the spelling the server's version uses, taken from the version in the root. A root with no version in its path, such as `/tea/v1`, gets it as you typed it.

## Listing and finding: `tea products` and `tea components`

Both take the same flags and print one `uuid  name` line per item.

| Flag | Default | Description |
|---|---|---|
| `--purl` | | Exact PURL filter, done by the server |
| `--tei` | | Exact TEI filter, done by the server |
| `--id-type`, `--id-value` | | The raw pair behind `--purl` and `--tei`. Type is `CPE`, `TEI`, `PURL` or `COMPLIANCE_DOCUMENT`. Both are required together. |
| `--search` | | Case-insensitive substring over the name and every identifier value, done by the CLI |
| `--limit` | `50` | Most rows to print |
| `--page-token` | | Continue from a token an earlier call printed |
| `--all` | `false` | Follow every page. With no `--limit`, prints everything read. |

`--purl`, `--tei`, `--id-type`/`--id-value` and `--search` are mutually exclusive. Exact filters match the whole identifier: no wildcards, no case folding.

```bash
vulnetix tea --catalogue public products --search pixi
vulnetix tea --catalogue public products --purl pkg:github/prefix-dev/pixi
vulnetix tea --catalogue public components --purl pkg:github/prefix-dev/pixi
vulnetix tea --catalogue public products --all --json
```

### Paging

A table that stops early prints the token for the next page on stderr:

```text
showing the first 50 products (--limit); raise --limit to see more
```

`--json` prints the API's page envelope: `results`, `hasNext`, `nextPageToken`.

### Limits

| Limit | Value | What happens |
|---|---|---|
| Page size | 100 | The largest the server accepts |
| Pages per walk | 20 | `--search`, `--all` and a large `--limit` stop after 2,000 items |
| `--search` cap hit | | stderr: `searched the first N items; use --purl or --tei for an exact match` |
| `--all` cap hit | | stderr: `stopped after 20 pages (N items); continue with --page-token <token>` |

The server has no name search, which is why `--search` reads pages and filters locally. It stops early once `--limit` matches are found.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success |
| `1` | Any error, including `401`, `404`, an invalid flag combination, or a network failure |
