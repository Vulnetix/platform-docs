---
title: "vulnetix config validate, kinds and schema"
nav: Validate documents
description: The offline config-as-code commands. Validate documents against their kind's schema, list the kinds the CLI knows, and print a kind's schema. Flags, inputs, output and exit codes.
order: 1
sources: [cli/cmd/config_documents.go, cli/cmd/config_documents_test.go, cli/cmd/exit_codes.go, cli/main.go, config-schemas/schemas.go]
checked: [cli@4c8c3b7, config-schemas@9bda9e1]
updated: 02 Nov 2026
---

Three subcommands of `vulnetix config` work on config documents without credentials or network access. They were added in CLI v3.153.0, which embeds schema release `v1.0.1`.

| Command | Does |
|---|---|
| `vulnetix config validate` | Checks documents against the schema of their kind, and checks for duplicates. |
| `vulnetix config kinds` | Prints the kinds this CLI knows, one per line. |
| `vulnetix config schema <Kind>` | Prints the JSON Schema of one kind. |

## vulnetix config validate

```sh
vulnetix config validate [-f <file|dir|->]...
```

| Flag | Type | Default | Meaning |
|---|---|---|---|
| `-f`, `--file` | string, repeatable | `.vulnetix/config` | A file, a directory (walked recursively), or `-` for standard input. |

The command takes no positional arguments.

### What it reads

- With no `-f`, it reads `.vulnetix/config/` under the current directory. If that directory does not exist, it prints `no config documents (looked in .vulnetix/config)` and exits 0.
- In a directory, it reads every file ending `.yaml`, `.yml` or `.json` (any case). Other files are ignored.
- All the files are sorted by path before reading, so the order and the "first" of two duplicates do not depend on the order of `-f` flags. `-` sorts before any path.
- A file can hold several documents separated by `---`. Empty and comment-only documents are skipped.
- `-f` on a directory with no matching files prints the same `no config documents` line and exits 0.

```sh
vulnetix config validate
vulnetix config validate -f .vulnetix/config/quality-gate.yaml
vulnetix config validate -f gates/ -f extra.yaml
cat gate.yaml | vulnetix config validate -f -
```

### What it checks

1. Each document has a `kind`. A document without one is reported as `not a Vulnetix config document: no kind`.
2. The `kind` is one this CLI knows. Otherwise: `unknown kind "X" (known: QualityGate)`.
3. The document is valid against that kind's schema, including formats such as `uuid`. All `$ref`s resolve against the copy built into the CLI.
4. No two valid documents have the same `kind` and `metadata.name`. The second is reported as `<Kind> "<name>" is already defined in <file> (document <n>)`.

A `# yaml-language-server: $schema=` comment or a `$schema` key is not used to choose the schema. The built-in schema for the document's `kind` is always used, whatever URL the file names.

### Output

Each problem is one entry on standard output, starting with the file and the document's position in it. Schema failures list the JSON pointer of every failing value, indented:

```text
- (document 2): jsonschema validation failed with 'https://github.com/Vulnetix/config-schemas/releases/download/v0.0.0-dev/QualityGate.schema.json#'
    - at '/metadata': 'allOf' failed
      - at '/metadata/name': value must be 'default'
    - at '/spec/severity': value must be one of 'low', 'medium', 'high', 'critical'
.vulnetix/config/strict.yaml (document 1): QualityGate "default" is already defined in - (document 1)
```

Then a summary goes to standard error as `Error: 2 of 3 documents invalid`. When everything is valid, standard output gets `3 documents valid in 2 files`.

The schema URL in a failure shows `v0.0.0-dev`: it is the `$id` of the embedded source copy, not a sign that a development schema was used.

### Exit codes

| Code | When |
|---|---|
| `0` | Every document is valid, or there were no documents. |
| `1` | Any document is invalid or duplicated; a file could not be read or parsed as YAML (`Error: <path>: document <n>: yaml: ...`); a `-f` path does not exist (`Error: stat <path>: no such file or directory`); an unknown flag or a positional argument. |

The CLI defines `2` (usage) and `3` (indeterminate) in `cmd/exit_codes.go`, but these commands do not use them. A bad flag exits 1.

> [!CAREFUL] Do not put ai-firewall.yaml in .vulnetix/config
> `AiFirewallPolicy` has no schema in `config-schemas` yet, so `vulnetix config validate` reports it as an unknown kind. Keep it at `.vulnetix/ai-firewall.yaml`, where `vulnetix ai-firewall apply` reads it. See [AiFirewallPolicy](/platform-iac/kinds/ai-firewall-policy/).

## vulnetix config kinds

```sh
vulnetix config kinds
```

```text
QualityGate
```

Prints every kind in the embedded schema release, sorted, one per line. No flags. Exit 0.

## vulnetix config schema

```sh
vulnetix config schema <Kind>
vulnetix config schema QualityGate > QualityGate.schema.json
```

Prints the embedded schema for one kind, byte for byte as it is in the `config-schemas` source tree. Exactly one argument is required; shell completion offers the known kinds. The `$id` reads `.../download/v0.0.0-dev/...`; the released asset is the same file with the release tag in its `$id`. An unknown kind exits 1 with `Error: unknown kind "X"; run 'vulnetix config kinds' for the list`.

`vulnetix config schema common` also works and prints the shared definitions, though `common` is not listed by `kinds`.
