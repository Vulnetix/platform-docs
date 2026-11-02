---
title: Documents
description: The vulnetix.com/v1 document format shared by every config kind, with the metadata fields, naming rules and the shared types defined in common.schema.json.
order: 2
sources: [config-schemas/schemas/common.schema.json, config-schemas/schemas.go, cli/cmd/config_documents.go]
checked: [config-schemas@9bda9e1, cli@4c8c3b7]
updated: 02 Nov 2026
---

A config document is one YAML (or JSON) object with four top-level keys. The shape follows the Kubernetes resource model.

```yaml
apiVersion: vulnetix.com/v1
kind: QualityGate
metadata:
  name: default
spec:
  severity: high
```

| Key | Required | Meaning |
|---|---|---|
| `apiVersion` | yes | The document format version. Always `vulnetix.com/v1`. |
| `kind` | yes | The kind of object. `vulnetix config kinds` lists the kinds your CLI knows. |
| `metadata` | yes | Identity and labels. See below. |
| `spec` | yes | The settings. Each kind defines its own `spec`. |
| `$schema` | no | Accepted and ignored by validation, so a JSON document can name its schema. |

Any other top-level key is rejected. `status` is reserved for the engine, which returns it in plan and apply results; it is not accepted in a document.

## Files

- A file may hold several documents separated by `---`. Empty documents and comment-only documents are skipped.
- The default location is `.vulnetix/config/`. `vulnetix config validate` reads every `.yaml`, `.yml` and `.json` file under it, recursively.
- Two documents with the same `kind` and `metadata.name` are an error, anywhere in the set being validated. A later duplicate would otherwise silently win at apply time.
- YAML values are converted to JSON types before validation. A YAML timestamp such as `2026-11-02` becomes a string.

## metadata

| Field | Type | Required | Rules | Meaning |
|---|---|---|---|---|
| `name` | string | yes | `^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$`: 1 to 63 lowercase letters, digits and hyphens, starting and ending with a letter or digit | The object's name, unique per kind within a tenant. It is the natural key that the planned engine and Terraform provider address objects by. |
| `org` | string | no | UUID | The tenant the document belongs to. `plan` and `apply` refuse to run against any other tenant. |
| `labels` | map of string to string | no | keys match `^[a-z0-9]([a-z0-9._/-]{0,61}[a-z0-9])?$`, values at most 256 characters | Free labels, stored with the object and never interpreted. |
| `annotations` | map of string to string | no | values at most 4096 characters | Free notes for people and tools, such as a ticket link. |

No other `metadata` key is accepted.

### Singleton kinds

A kind the tenant has exactly one of uses singleton metadata: `metadata.name` must be `default`. `QualityGate` is a singleton.

## Shared types

`common.schema.json` defines types that kinds refer to. Kind pages link back here for the types they use.

| Definition | Type | Rules | Used for |
|---|---|---|---|
| `severity` | string | `low`, `medium`, `high`, `critical` | Severity thresholds. Used by `QualityGate.spec.severity`. |
| `valueFrom` | object | exactly one of `env` (a variable name matching `^[A-Za-z_][A-Za-z0-9_]*$`) or `file` (a path; trailing newlines are trimmed) | Secrets. The value is read on the machine running the client, sent once, and never exported or shown in a plan. |
| `celExpression` | string | 1 to 4096 characters | A [CEL](https://cel.dev) expression returning `bool`. See [CEL rule expressions](/platform-iac/reference/cel/). |
| `purl` | string | `^pkg:[a-z][a-z0-9.+-]*/.+` | A [package URL](https://github.com/package-url/purl-spec). Leave out the version to mean every version. |
| `vexJustification` | string | `component_not_present`, `vulnerable_code_not_present`, `vulnerable_code_not_in_execute_path`, `vulnerable_code_cannot_be_controlled_by_adversary`, `inline_mitigations_already_exist` | The OpenVEX 0.2.0 justification vocabulary. CycloneDX VEX justifications map onto it. |

> [!WHY] Secrets are references, never values
> A credential written into a file in a repository is a credential that gets committed. `valueFrom` names where the value lives, so the document can be reviewed and shared. The existing `AiFirewallPolicy` follows the same rule with `key.fromEnv` and `key.fromFile`.

## apiVersion and schema versions

`apiVersion` names the document format and stays `vulnetix.com/v1`. The schema release version (`v1.0.1` and so on) moves on its own. See [Compatibility](/platform-iac/schemas/compatibility/).
