---
title: The subject component
nav: The subject component
description: Set metadata.component, the thing the document describes, instead of the name and version the CLI reads from git, and add its supplier, licences and hashes.
order: 3
sources: [cli/internal/cdx/authorship.go, cli/internal/cdx/cyclonedx.go, cli/cmd/aibom.go, vdb-cyclonedx/aibom.go]
checked: [cli@v4.17.1, vdb-cyclonedx@v0.17.0]
updated: 04 Nov 2026
---

`metadata.component` is, in CycloneDX's words, "the component that the BOM describes". Every package in `components` hangs off it in the dependency graph. By default the CLI describes the repository it scanned. When the document is really about a release, a container image or a product, say so.

## What the CLI derives

| Member | Derived from |
|---|---|
| `type` | `application` |
| `bom-ref` | `urn:project`. Never changed, because every root edge in `dependencies` refers to it. |
| `name` | The repository name in the git remote, else the repository directory |
| `version` | The tag on HEAD, else the first 8 characters of the commit |
| `description` | `Source code repository` |
| `externalReferences` | One `vcs` reference per git remote, SSH remotes rewritten to HTTPS |
| `authors` | The repository's recent committers (CycloneDX 1.6 and later) |
| `properties` | `vulnetix:git/*`: branch, commit, commit time, message and author, tags, dirty state, worktree, repository root |

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--component-name` | string | the repository name | `metadata.component.name` |
| `--component-version` | string | the HEAD tag or commit | `metadata.component.version` |
| `--component-type` | string | `application` | `metadata.component.type`: `application`, `framework`, `library`, `container`, `platform`, `operating-system`, `device`, `device-driver`, `firmware`, `file`, `machine-learning-model`, `data`, `cryptographic-asset` |
| `--component-group` | string | | `metadata.component.group`, such as `com.acme` |
| `--component-purl` | string | | `metadata.component.purl` |

An unknown `--component-type` is rejected before the scan starts. Each flag has a `VULNETIX_COMPONENT_*` environment variable.

Only the members you set change. The git properties, the `vcs` references and the committers stay, because they are still true of the source the document was built from.

```bash
# The SBOM of a release, not of a branch
vulnetix cdx \
  --component-name payment-service --component-version "$VERSION" \
  --component-group com.acme --component-purl "pkg:generic/acme/payment-service@$VERSION"

# The SBOM of a built image
vulnetix cdx --container-archive image.tar \
  --component-type container --component-name payment-service --component-version "$VERSION"
```

## More than the flags

The flags cover the identity of the subject. Anything else CycloneDX allows on a component goes in an [overlay](/sbom/author/overlay/) under `metadata.component`: its `supplier`, `manufacturer`, `publisher`, `licenses`, `hashes`, `cpe`, `copyright` or `pedigree`.

```json
{
  "metadata": {
    "component": {
      "type": "application",
      "name": "payment-service",
      "supplier": { "name": "Acme Ltd", "url": ["https://acme.example"] },
      "licenses": [ { "license": { "id": "Apache-2.0" } } ],
      "copyright": "Copyright 2026 Acme Ltd"
    }
  }
}
```

A flag wins over the overlay for the member it sets, so `--component-version "$VERSION"` with this overlay still writes the pipeline's version.

> [!CAREFUL] The subject's licence is not the document's licence
> `metadata.component.licenses` is the licence of what you ship. `metadata.licenses` is the licence of the SBOM itself, which [`--bom-license`](/sbom/author/licences-and-properties/#document-licence) sets. CycloneDX keeps them apart: "This may be different from the license(s) of the component(s) that the BOM describes."
