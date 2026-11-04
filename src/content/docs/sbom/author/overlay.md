---
title: Overlay files
nav: Overlay files
description: Merge a CycloneDX fragment of your own into the document the CLI writes, to add suppliers, services, compositions, annotations and vulnerability analysis, and exactly how each member merges.
order: 5
sources: [cli/internal/cdx/overlay.go, cli/internal/cdx/authorship.go, cli/internal/cdx/merge.go, cli/cmd/cdx.go, cli/cmd/scan.go, cli/tools/actiongen/spec.go, vdb-cyclonedx/rawpassthrough.go]
checked: [cli@v4.17.1, vdb-cyclonedx@v0.17.0]
updated: 04 Nov 2026
---

An overlay is a CycloneDX JSON file holding the parts of the document only you know: the supplier of a dependency, the services the code calls, how complete the inventory is, a reviewer's note, a decision about a vulnerability. The CLI merges it into the document it built, then validates the result.

```bash
vulnetix cdx --bom-overlay .vulnetix/overlay.cdx.json
```

`--bom-overlay` is repeatable. Overlays apply in the order given, and a later one wins where two set the same member, so a shared organisation overlay can be followed by a per-repository one.

## The file

An overlay is a CycloneDX document, written with the same member names the [CycloneDX JSON reference](https://cyclonedx.org/docs/1.7/json/) defines. Every member is optional, including `bomFormat` and `specVersion`.

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.7",
  "metadata": {
    "supplier": { "name": "Acme Ltd", "url": ["https://acme.example"] },
    "licenses": [ { "license": { "id": "CC0-1.0" } } ],
    "properties": [ { "name": "acme:owner", "value": "payments" } ],
    "component": {
      "type": "application",
      "name": "payment-service",
      "supplier": { "name": "Acme Ltd" },
      "licenses": [ { "license": { "id": "Apache-2.0" } } ]
    }
  },
  "components": [
    { "type": "library", "name": "left-pad", "version": "1.3.0",
      "purl": "pkg:npm/left-pad@1.3.0",
      "supplier": { "name": "Left Pad Org" } },
    { "type": "firmware", "bom-ref": "fw:board", "name": "board-firmware", "version": "3.1" }
  ],
  "dependencies": [ { "ref": "urn:project", "dependsOn": ["fw:board"] } ],
  "services": [
    { "bom-ref": "svc:payments-api", "name": "payments-api",
      "endpoints": ["https://api.acme.example/pay"], "authenticated": true,
      "data": [ { "flow": "bi-directional", "classification": "PII" } ] }
  ],
  "compositions": [ { "aggregate": "complete", "assemblies": ["urn:project"] } ],
  "annotations": [
    { "subjects": ["urn:project"], "annotator": { "organization": { "name": "Acme Security" } },
      "timestamp": "2026-11-01T00:00:00Z", "text": "Reviewed for release 2.0.0" }
  ],
  "vulnerabilities": [
    { "id": "CVE-2024-12345",
      "analysis": { "state": "not_affected", "justification": "code_not_reachable",
                    "detail": "The vulnerable parser is only called from tests." } }
  ]
}
```

The subject component's `bom-ref` is always `urn:project`, so point `dependencies`, `compositions` and `annotations` at it to talk about the whole document's subject.

## How each member merges

The rules are the reverse of what a scan does with the file already on disk: there, what exists is protected; here, what you wrote wins.

| Member | Rule |
|---|---|
| `serialNumber`, `version` | Used when no flag or environment variable sets them. See [Who made it](/sbom/author/identity/). |
| `metadata.manufacturer`, `metadata.authors`, `metadata.supplier` | Used when no flag or environment variable sets them. The manufacturer also beats the CI and git owners. |
| `metadata.lifecycles` | Its `phase` entries are used when `--lifecycle` is not set. Named custom lifecycles are not carried in. |
| `metadata.timestamp`, `metadata.tools` | Ignored. They describe this run. |
| `metadata.component` | Each member you set replaces the derived one, except `bom-ref`. Arrays (`licenses`, `hashes`, `authors`, `externalReferences`) are appended without duplicates. Properties are set by name. |
| `metadata.licenses` | Appended without duplicates |
| `metadata.properties`, root `properties` | Set by name: a name appears once and the overlay's value wins |
| Other `metadata` members, such as 1.7's `distributionConstraints` | Replace the member |
| `components[]` | Matched by `purl`, then `bom-ref`, then `name`, `version` and `type` together. A match takes your members as `metadata.component` does. An entry with no match is added. |
| `dependencies[]` | Matched by `ref`. A match gains your `dependsOn` entries. A new `ref` is added. |
| `vulnerabilities[]` | Matched by `bom-ref`, then `id`. A match takes your `analysis`, `description`, `recommendation` and `source`, and gains your `ratings` and `affects`. An entry with no match is added. |
| `services`, `compositions`, `annotations`, `formulation`, `declarations`, `definitions`, `citations`, root `externalReferences` | Replace the member as a whole |

> [!WHY] Why some members replace and others merge
> The CLI understands `components`, `dependencies` and `vulnerabilities`, because it finds them, so it can match your entries to its own. It finds no services, compositions or annotations, so whatever is in the document there came from you, and the last overlay's version is the one you meant.

## What is rejected

The format, the signature and the property names are checked before the scan starts. The spec version is checked when the overlay is applied. A failure names the file and the JSON pointer:

| Overlay contains | Why |
|---|---|
| `bomFormat` other than `CycloneDX` | It is not a CycloneDX fragment |
| `specVersion` different from the document's | A member valid in one version can be invalid in the other. Match `--spec-version`, or leave `specVersion` out. |
| `signature` | A signature covers the finished document, so it cannot be carried in. Sign the output with `--sign`. |
| A property named `vulnetix:*`, at any level | The CLI's own vocabulary. Use your own prefix. |

```text
Error: overlay .vulnetix/overlay.cdx.json: /components/0/properties/0/name names a vulnetix: property, which only this product writes; use your own namespace
```

Anything else is checked by the [schema validation](/sbom/author/overview/#validation) that runs on the finished document.

## Vulnerability analysis

An overlay is how to put a VEX decision into an SBOM the CLI writes. CycloneDX records it in `vulnerabilities[].analysis`:

| Member | Values |
|---|---|
| `state` | `resolved`, `resolved_with_pedigree`, `exploitable`, `in_triage`, `false_positive`, `not_affected` |
| `justification` | With `not_affected`: `code_not_present`, `code_not_reachable`, `requires_configuration`, `requires_dependency`, `requires_environment`, `protected_by_compiler`, `protected_at_runtime`, `protected_at_perimeter`, `protected_by_mitigating_control` |
| `response` | Any of `can_not_fix`, `will_not_fix`, `update`, `rollback`, `workaround_available` |
| `detail` | Free text. CycloneDX asks for "specific details on why the component or service is not impacted" when it is not exploitable. |

An overlay entry with the `id` of a finding a scan already recorded replaces that finding's analysis and keeps its `affects`. `vulnetix cdx` carries the findings in its output file into the next document, and from CLI v4.15.3 the overlay's analysis is applied to them.

To have a decision suppress findings in later scans, rather than only appear in this document, use [VEX in scans](/vex/scans/vex-file/) or a [VEX source](/platform-iac/guides/vex-sources/). The [status mapping](/vex/#status-mapping) shows how CycloneDX states compare with OpenVEX and CSAF.

## Check the result

```bash
vulnetix cdx --bom-overlay .vulnetix/overlay.cdx.json -o json > /dev/null
jq '{supplier: .metadata.supplier.name,
     subject: .metadata.component | {name, supplier: .supplier.name},
     services: [.services[].name],
     decisions: [.vulnerabilities[] | select(.analysis) | {id, state: .analysis.state}]}' \
  .vulnetix/sbom.cdx.json
vulnetix bom validate .vulnetix/sbom.cdx.json
```

[`bom validate`](/sbom/read/import-and-validate/) scores completeness, including how many components name a supplier, which is often the reason to write an overlay in the first place.

## GitHub Actions

The [sbom](/sbom/github-actions/sbom/), [aibom](/sbom/github-actions/aibom/) and [cbom](/sbom/github-actions/cbom/) actions take the values that contain spaces as inputs, one per line where several are allowed:

```yaml
- uses: Vulnetix/cli/sbom@v4
  with:
    bom-manufacturer: Acme Ltd
    bom-author: |
      Jane Doe <jane@acme.example>
    bom-supplier: Acme Ltd
    bom-license: CC0-1.0
    bom-property: |
      acme:team=payments
    bom-overlay: |
      .vulnetix/org-overlay.cdx.json
      .vulnetix/overlay.cdx.json
    sign: true
  env:
    VULNETIX_BOM_SERIAL: payment-service-${{ github.ref_name }}
    VULNETIX_COMPONENT_VERSION: ${{ github.ref_name }}
```

The `--bom-serial`, `--bom-version`, `--component-*` and `--bom-*-url` flags have no inputs. Set them through `env:` as above, or `args`. `args` is split on spaces, so a value with a space must go in an input or `env:`.
