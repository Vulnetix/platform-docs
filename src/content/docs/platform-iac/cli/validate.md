---
title: "vulnetix config validate, kinds and schema"
nav: Validate documents
description: The offline config-as-code commands. Validate documents against their kind's schema, list the kinds the CLI knows, and print a kind's schema. Flags, inputs, output and exit codes.
order: 1
sources: [cli/internal/platformiac/discover.go, cli/internal/platformiac/doc.go, cli/docs/platform-iac.md, cli/cmd/config_documents.go, cli/cmd/config_documents_test.go, cli/cmd/exit_codes.go, cli/main.go, config-schemas/schemas.go]
checked: [cli@3e6fd831d, config-schemas@45c1b24]
updated: 03 Nov 2026
---

Three subcommands of `vulnetix config` work on config documents without credentials or network access. They were added in CLI v3.153.0. Since v3.164.0 they follow [one rule for what a document is](#which-files-are-platform-iac-documents).

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

- With no `-f`, it reads `.vulnetix/config/` under the current directory and the three [well-known files](#well-known-files). If there are none, it prints `no config documents (looked in .vulnetix/config and the well-known files)` and exits 0.
- In a directory, it reads every file ending `.yaml`, `.yml` or `.json` (any case). Other files are ignored. A file with no `vulnetix.com/v1` content is skipped; see the rule below.
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
2. The `kind` is one this CLI knows. Otherwise: `unknown kind "X"` followed by the list of known kinds.
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

## Which files are Platform IaC documents

One rule decides. A document is Platform IaC if and only if its `apiVersion` is `vulnetix.com/v1` and its `kind` is one `vulnetix config kinds` lists. The folder a file sits in does not matter.

| Case | Result |
|---|---|
| A file in `.vulnetix/config` with no `vulnetix.com/v1` content (SARIF, CycloneDX, OpenVEX, memory, credentials) | Skipped. A note is printed only with `-v`. |
| A `vulnetix.com/v1` document of an unknown kind | Error |
| A file that mixes documents with other content | Error |
| A well-known file holding the wrong kind | Error |
| A file named with `-f` that is not a document | Error |
| A folder file that does not parse but contains `vulnetix.com/v1` | Error. A broken document is never skipped. |

### Well-known files

Three documents have a fixed path outside `.vulnetix/config`, because other commands read them from there:

| Path | Kind | Used by |
|---|---|---|
| `.vulnetix/ai-firewall.yaml` | `AiFirewallPolicy` | `ai-firewall apply` and `export` |
| `.vulnetix/license-policy.yaml` | `LicensePolicy` | `license` and `scan --evaluate-licenses` |
| `.vulnetix/license-exceptions.yaml` | `LicenseExceptions` | `license` and `scan --evaluate-licenses` |

`config validate` reads them and the folder. A singleton kind may be defined in its well-known file or under `.vulnetix/config`, not both and not twice: that is an error that names both places. A licence file written before documents carried `apiVersion` and `kind` is read as its file's kind, so an older repository keeps working.

In v3, `config plan` and `config apply` read the folder only, and a well-known file named with `-f` is planned. From CLI v4.0.0 they read the well-known files too when no `-f` is given; see [Migrating from v3 to v4](/cli/get-started/migrating-to-v4/).

> [!WHY] Why one rule
> Before v3.164.0 a file's folder and name decided what it was, and `AiFirewallPolicy` had to stay out of `.vulnetix/config`. Now the content decides, so `.vulnetix/config` can sit beside SARIF or SBOM files the CLI wrote, and a repository can keep a policy in the path its command already reads.

## vulnetix config kinds

```sh
vulnetix config kinds
```

```text
AiFirewallPolicy
AiGovernanceList
AiProvider
ApiSpecSource
JailExemption
JailPolicy
LicenseExceptions
LicensePolicy
MalwareIoc
PackageFirewallPolicy
PackageList
QualityGate
RemediationPolicy
RiskStrategy
Suppression
VexSource
```

Prints every kind the CLI knows, sorted, one per line: the kinds of the embedded `config-schemas` release plus `LicenseExceptions`. That is 16 in v3.164.0 to v3.165.0, which embed release `v1.2.0` and validate `LicenseExceptions` with a schema of their own. The list grows when the CLI embeds a newer release. No flags. Exit 0.

## vulnetix config schema

```sh
vulnetix config schema <Kind>
vulnetix config schema QualityGate > QualityGate.schema.json
```

Prints the embedded schema for one kind, byte for byte as it is in the `config-schemas` source tree. Exactly one argument is required; shell completion offers the known kinds. The `$id` reads `.../download/v0.0.0-dev/...`; the released asset is the same file with the release tag in its `$id`. An unknown kind exits 1 with `Error: unknown kind "X"; run 'vulnetix config kinds' for the list`.

`vulnetix config schema common` also works and prints the shared definitions, though `common` is not listed by `kinds`.
