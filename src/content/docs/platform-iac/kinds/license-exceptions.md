---
title: "LicenseExceptions"
description: "The LicenseExceptions config kind: recorded, attributed exceptions to the licence policy, in the repository file .vulnetix/license-exceptions.yaml or as a config document. Fields, rules, matching and what the CLI does with it."
order: 12
sources: ["config-schemas/schemas/LicenseExceptions.schema.json", "config-schemas/examples/LicenseExceptions/advanced.yaml", "config-schemas/examples/LicenseExceptions/minimal.yaml", "cli/internal/platformiac/discover.go", "cli/internal/license/exceptions.go", "cli/docs/platform-iac.md"]
checked: ["config-schemas@45c1b24", "cli@3e6fd831d"]
updated: 03 Nov 2026
---

Recorded, attributed exceptions to the [licence policy](/sca/license/policy/): a licence exempted everywhere (`blanket`), or one package exempted (`packages`), each with who approved it, why, and until when. An exempted finding is kept and badged, never dropped. An expired exception stops applying and says so; the expiry date is inclusive.

| | |
|---|---|
| `apiVersion` | `vulnetix.com/v1` |
| `kind` | `LicenseExceptions` |
| Objects per tenant | One (`metadata.name: default`) |
| Repository file | `.vulnetix/license-exceptions.yaml`, one of the [well-known files](/platform-iac/cli/validate/#well-known-files) |
| Pinned schema | [`v1.4.0/LicenseExceptions.schema.json`](https://github.com/Vulnetix/config-schemas/releases/download/v1.4.0/LicenseExceptions.schema.json) |
| First released in | [`v1.3.0`](https://github.com/Vulnetix/config-schemas/releases/tag/v1.3.0) of `config-schemas` |
| Validated offline | `vulnetix config validate`, CLI v3.164.0 and later |
| Stored by the server | Not yet. `config plan` reports the document with a note and `config apply` sends nothing for it. |

## Two forms

Both are valid, and a document is exactly one of them.

| Form | Where | Shape |
|---|---|---|
| Repository file | `.vulnetix/license-exceptions.yaml` | `blanket` and `packages` at the top level. `metadata` is optional. |
| Config | A document under `.vulnetix/config` | `metadata` and `spec` are required, and `blanket` and `packages` sit under `spec` |

The fields below are the same in both. In the config form, prefix them with `spec.`.

```yaml
# The repository file form, .vulnetix/license-exceptions.yaml
apiVersion: vulnetix.com/v1
kind: LicenseExceptions
blanket:
  - license: EPL-2.0
    reason: Eclipse libraries are used unmodified as build-time dependencies.
packages:
  - purl: pkg:npm/%40acme/internal-fonts
    reason: Proprietary fonts licensed to ACME under contract C-2291.
```

A licence file written before documents carried `apiVersion` and `kind` is read as this kind from its well-known path, so an older repository keeps working. `vulnetix license` and `vulnetix scan --evaluate-licenses` read the file, or the document under `.vulnetix/config`, unless `--exceptions-file` names one. Defining it in both places, or twice, is an error.

## Fields

`blanket[]`:

| Field | Type | Required | Description |
|---|---|---|---|
| `license` | string | yes | The SPDX licence ID. Matching is by prefix, so `MPL-2.0` also covers `MPL-2.0-no-copyleft-exception`. |
| `reason` | string | yes | Why the exception exists. An exception nobody can explain cannot be told apart from a mistake. |
| `id` | string | no | A stable ID to refer to the exception by in reports |
| `scope` | string | no | What the claim is limited to, such as `vendored`, `unmodified`, `dynamically linked` |
| `approver` | string | no | Who signed the exception off |
| `approvedDate` | string | no | When it was approved, `YYYY-MM-DD` |
| `expires` | string | no | The last day the exception applies, `YYYY-MM-DD`. Left out, it never expires. |
| `projects` | array of string | no | Only these projects, matched without case. `*` is every project. Left out, every project. |

`packages[]` has the same `reason`, `id`, `scope`, `approver`, `approvedDate`, `expires` and `projects`, and:

| Field | Type | Required | Description |
|---|---|---|---|
| `purl` | string | one of `purl` or `name` | The package as a purl, with `*` as a wildcard segment, such as `pkg:golang/github.com/hashicorp/*`. Must start `pkg:`. |
| `name` | string | one of `purl` or `name` | The package name, matched as a substring, for ecosystems where the short name and the full module path are both in use |
| `license` | string | no | Exempt the package only under this SPDX licence. Left out, the package is exempt whatever licence it carries, which is the broader claim. |
| `reason` | string | yes | As above |

`blanket` exceptions are checked first and the first unexpired match wins; `packages` are checked after them. `metadata` takes `name` (only `default`), `org` (a tenant UUID, checked by plan and apply), `labels` and `annotations`.

## Examples

```yaml
# yaml-language-server: $schema=https://github.com/Vulnetix/config-schemas/releases/latest/download/LicenseExceptions.schema.json
apiVersion: vulnetix.com/v1
kind: LicenseExceptions
metadata:
  name: default
  labels:
    team: legal
  annotations:
    ticket: https://tracker.example.com/LEGAL-102
spec:
  blanket:
    - license: MPL-2.0
      id: LEX-001
      reason: File-level copyleft; we ship MPL files unmodified and publish their source.
      scope: unmodified
      approver: legal@acme.com
      approvedDate: "2026-03-02"
      expires: "2027-03-01"
      projects: ["*"]
  packages:
    - purl: pkg:golang/github.com/hashicorp/*
      license: BUSL-1.1
      id: LEX-002
      reason: Internal tooling only; not offered as a competing hosted service.
      scope: dynamically linked
      approver: legal@acme.com
      approvedDate: "2026-04-15"
      expires: "2026-12-31"
      projects: [infra-tools]
    - name: ghostscript
      license: AGPL-3.0-only
      id: LEX-003
      reason: Used in the batch PDF renderer, which is never exposed over a network.
      scope: vendored
      approver: cto@acme.com
      approvedDate: "2026-05-20"
      projects: [pdf-batch]
```

Check a file with `vulnetix config validate -f <file>`. See [Validate documents](/platform-iac/cli/validate/) and [Licence evaluation](/sca/license/license/). In GitHub Actions the [license action](/sca/github-actions/license/) reads the same files.
