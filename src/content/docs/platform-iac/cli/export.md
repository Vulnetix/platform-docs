---
title: "vulnetix config export"
nav: Export
description: Write the organization's live configuration, or a draft of local documents, as YAML documents, Terraform HCL or a bash script. Flags, filters, formats and secrets.
order: 4
sources: [cli/cmd/config_engine.go, cli/cmd/config_engine_client.go, cli/cmd/config_engine_test.go, vdb-site/api/internal/handler/config_engine.go, vdb-site/api/internal/config/render.go]
checked: [cli@d01f1dbe3, vdb-site@b424ae4]
updated: 02 Nov 2026
---

`vulnetix config export` asks the config engine to render configuration as code. Added in CLI v3.155.0.

```sh
vulnetix config export [--kind <Kind>] [--name <name>] [--manager <manager>] [--format yaml|hcl|sh] [-o <file>] [-f <file|dir>]... [--token <token>]
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `--kind` | string | all | Only this kind, e.g. `QualityGate`. |
| `--name` | string | all | Only the object with this `metadata.name`. |
| `--manager` | string | all | Only objects owned by this manager. Unlike `plan`, there is no default. |
| `--format` | string | `yaml` | `yaml`, `hcl` or `sh`. |
| `-o`, `--output` | string | standard output | Write to this file. Missing directories are created; `wrote <file>` goes to standard error. `-` is standard output. |
| `-f`, `--file` | string, repeatable | | Render these documents instead of the live state (a draft). The filters are ignored. |
| `--token` | string | | As for `plan`. See [Credentials](/platform-iac/cli/plan/#credentials). |

Note that `-o` is a file here, while on `plan` it is the output format.

## Live state

Without `-f`, the CLI sends `GET /api/site/v1/config/export?format=&kind=&name=&manager=` and writes the body unchanged. Objects come in dependency order.

## Drafts

With `-f`, the documents are validated offline and sent with `POST /api/site/v1/config/export?format=`. The engine renders them instead of the stored state. Use it to turn YAML into HCL or a script without applying anything:

```sh
vulnetix config export -f .vulnetix/config --format hcl -o vulnetix.tf
```

`valueFrom` references in a draft are sent as references, not resolved, so no secret is read. Invalid documents fail with HTTP 422 and the problems.

## Formats

| Format | Output |
|---|---|
| `yaml` | `vulnetix.com/v1` documents for `.vulnetix/config/`. |
| `hcl` | `vulnetix_*` Terraform resources with `import {}` blocks for objects that exist, so adopting them shows no changes in the first `terraform plan`. |
| `sh` | A bash script that runs `vulnetix config apply -f -` with the YAML inline in a heredoc. |

All three are rendered by the engine, the same endpoint the console's Download as code uses, so the CLI and the console never differ.

## Secrets

Secrets are never exported. Each secret field comes back as a `valueFrom.env` placeholder with a variable name derived from the kind and the field. Set that variable (or change it to `file:`) before you apply the document.

## Exit codes

| Code | When |
|---|---|
| `0` | Written. |
| `1` | The engine answered an error (401, 403, 422, ...); a draft document is invalid locally; the file cannot be written. |
| `2` | `--format` is not `yaml`, `hcl` or `sh`; no credential. |

## Examples

```sh
vulnetix config export > .vulnetix/config/all.yaml
vulnetix config export --kind QualityGate --format hcl -o quality-gate.tf
vulnetix config export --manager gitops:acme/platform-config
vulnetix config export -f .vulnetix/config --format sh
```
