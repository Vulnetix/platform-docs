---
title: Document licences and properties
nav: Licences and properties
description: Set metadata.licenses, the licence of the SBOM itself, and add your own properties to metadata.properties without colliding with the vulnetix namespace.
order: 4
sources: [cli/internal/scanopts/authorship.go, cli/internal/cdx/authorship.go, cli/internal/license/spdx.go, vdb-cyclonedx/properties.go]
checked: [cli@v4.17.1, vdb-cyclonedx@v0.17.0]
updated: 04 Nov 2026
---

## Document licence

`metadata.licenses` is "the license information for the BOM document". Set it when you publish the SBOM and want readers to know what they may do with it. The licences of the packages in it are found by the scan and are not affected.

| Flag | Type | Default | Description |
|---|---|---|---|
| `--bom-license` | string, repeatable | | A licence of the document. Environment: `VULNETIX_BOM_LICENSES`. |

Each value lands where CycloneDX puts that kind of licence:

| You pass | Written as |
|---|---|
| A recognised SPDX identifier, in any case: `cc0-1.0` | `{"license": {"id": "CC0-1.0"}}` |
| An SPDX expression, anything with `AND`, `OR`, `WITH` or parentheses: `MIT OR Apache-2.0` | `{"expression": "MIT OR Apache-2.0"}` |
| Anything else: `Acme Data Licence` | `{"license": {"name": "Acme Data Licence"}}` |

A licence with a URL or its full text needs the `license.url` or `license.text` member, which only an [overlay](/sbom/author/overlay/) can set.

```bash
vulnetix cdx --bom-license CC0-1.0
```

## Properties

CycloneDX properties are "a name-value store" for "data not officially supported in the standard". `--bom-property` adds them to `metadata.properties`.

| Flag | Type | Default | Description |
|---|---|---|---|
| `--bom-property` | `name=value`, repeatable | | A document property. Environment: `VULNETIX_BOM_PROPERTIES`, comma- or semicolon-separated. |

The value is everything after the first `=`, so it may contain `=`. A name appears once: setting it again, from a flag or an overlay, replaces the value. The flag wins over an overlay.

```bash
vulnetix cdx \
  --bom-property acme:team=payments \
  --bom-property acme:cost-centre=4410 \
  --bom-property "acme:ticket=https://jira.acme.example/browse/SEC-12"
```

### Naming

Give your properties a prefix of your own, such as `acme:`. CycloneDX keeps a public register of property names, the [CycloneDX Property Taxonomy](https://github.com/CycloneDX/cyclonedx-property-taxonomy), whose `cdx:` names any tool may read. Registration is optional.

> [!CAREFUL] vulnetix: is reserved
> Names beginning `vulnetix:` are the CLI's measurements: where a package was found, how confident the discovery was, which git commit was scanned. A flag or overlay that sets one is rejected, because a stated value would be indistinguishable from a measured one.

### Properties the CLI writes

These are in `metadata.properties` whatever you set:

| Prefix | What |
|---|---|
| `vulnetix:env/*` | Host name, shell, operating system, architecture and user of the machine that ran the scan |
| `vulnetix:deployment/*` | The [deployment labels](/sbom/reference/document-metadata/#deployment-labels): project, cluster, namespace, environment and tags |
| `vulnetix:sbom/*`, `vulnetix:aibom/*`, `vulnetix:cbom/*` | Counts and the profile of the document |

Deployment labels are the structured way to say where an inventory runs. Use them for that, and `--bom-property` for anything else.
