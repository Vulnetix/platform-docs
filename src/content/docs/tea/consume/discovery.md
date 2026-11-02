---
title: Discovery
description: Find a TEA server from a domain through /.well-known/tea, choose a version, and resolve a TEI or a Package URL to the product release it names with /discovery.
order: 1
sources: [vdb-site/api/internal/handler/tea_routes.go, vdb-site/api/internal/handler/tea_discovery.go, vdb-site/api/internal/handler/tea_v1_routes.go, vdb-site/api/internal/handler/tea_versions.go, tea-spec/discovery]
checked: [vdb-site@1a06d67, tea-spec@6c93819]
updated: 02 Nov 2026
---

Every request on this page is public. No account or key is needed.

## 1. Fetch the discovery document

Start from a domain: the domain in a TEI, a purl, or a vendor contact. Fetch its discovery document.

```bash
curl -sL https://vulnetix.com/.well-known/tea
```

`vulnetix.com` redirects to `www.vulnetix.com`, so follow redirects (`-L`). The API host also answers `/.well-known/tea` itself.

```json
{
  "schemaVersion": 1,
  "endpoints": [
    {
      "url": "https://www.vulnetix.com/tea",
      "versions": ["1.0.0", "0.4.0"],
      "priority": 1
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `url` | The API base, without a version |
| `versions` | The specification versions served, as full SemVer |
| `priority` | Orders endpoints when a server lists several |

Append `/v` and a version to `url`: `https://www.vulnetix.com/tea/v1.0.0`. Choose the greatest version you and the server both support, and use `priority` only between endpoints that offer it equally. `https://www.vulnetix.com/tea/v1` is a stable alias that serves 1.0.0.

## 2. Resolve an identifier

A TEI names a product release. `/discovery` says which release it is and which servers can answer for it.

```bash
curl -s 'https://www.vulnetix.com/tea/v1.0.0/discovery?tei=tei%3A%2F%2Fvulnetix.com%2Fuuid%2F54e8820d-0803-5a4f-858d-88a279486564'
```

```json
[
  {
    "productReleaseUuid": "9a5e1b46-ee87-5238-bd1f-80424b7414f9",
    "servers": [
      { "rootUrl": "https://www.vulnetix.com/tea", "versions": ["1.0.0", "0.4.0"] }
    ]
  }
]
```

Here the TEI names the product `Vulnetix/cli`, and the answer is a product release of it. A release's own TEI resolves to that release. Percent-encode the TEI; it contains `:` and `/`.

### TEI spelling

| Version | Form | Example |
|---|---|---|
| 1.0.0 | `tei://<domain>/<type>/<id>` | `tei://vulnetix.com/uuid/54e8820d-0803-5a4f-858d-88a279486564` |
| 0.4.0 | `urn:tei:<type>:<domain>:<id>` | `urn:tei:uuid:vulnetix.com:54e8820d-0803-5a4f-858d-88a279486564` |

The Vulnetix server accepts both spellings at either version. In 1.0.0 a purl inside a TEI is base64url encoded: `tei://vulnetix.com/purl/cGtnOmdpdGh1Yi9WdWxuZXRpeC9jbGlAdjMuODIuMg`.

### By Package URL

A 1.0.0 server also resolves a purl directly. Pass exactly one of `tei` or `purl`.

```bash
curl -s 'https://www.vulnetix.com/tea/v1.0.0/discovery?purl=pkg%3Agithub%2FVulnetix%2Fcli%40v3.82.2'
```

## With the CLI

```bash
vulnetix tea discover vulnetix.com
vulnetix tea resolve tei://vulnetix.com/uuid/54e8820d-0803-5a4f-858d-88a279486564
vulnetix tea resolve pkg:github/Vulnetix/cli@v3.82.2
```

See [Reading with the CLI](/tea/cli/reading/).

Next: [Walk the object graph](/tea/consume/walk-the-graph/).
