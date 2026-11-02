---
title: Writing custom rules
nav: Custom rules
description: Write SAST rules in Rego, publish them in a Git repository, and load them with --rule alongside or instead of the built-in rules. Covers the module contract, metadata fields, input document, scoping and the published rule packs.
order: 3
sources: [cli/internal/sast/loader.go, cli/internal/sast/registry.go, cli/internal/sast/engine.go, cli/internal/sast/rule.go, cli/internal/sast/kinds.go, cli/internal/sast/input.go, cli/internal/sast/rego_input.go, cli/internal/sast/file_scope.go, cli/internal/sast/language_filter.go, cli/cmd/scan.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

A rule pack is a Git repository with a `rules/` directory of `.rego` files. `vulnetix sast --rule <org>/<repo>` clones it, loads every `.rego` file under `rules/` (subdirectories included), and compiles them with the built-in rules. Nothing else in the repository is read.

```text
my-sast-rules/
├── rules/
│   ├── py-sql-concat.rego
│   └── java/
│       └── weak-random.rego
├── tests/          (ignored by the CLI)
└── README.md       (ignored by the CLI)
```

## A complete rule

```rego
package vulnetix.rules.example_py_sql_concat

import rego.v1

metadata := {
	"id": "EXAMPLE-PY-001",
	"name": "SQL query built by string concatenation",
	"description": "cursor.execute() is called with a query built with + concatenation, so a value in the string can change the query. Pass parameters to execute() instead.",
	"help_uri": "https://wiki.example.com/security/sql-injection",
	"languages": ["python"],
	"severity": "high",
	"level": "error",
	"kind": "sast",
	"cwe": [89],
	"capec": ["CAPEC-66"],
	"attack_technique": ["T1190"],
	"cvssv4": "",
	"cwss": "",
	"tags": ["sql-injection", "python"],
}

findings contains finding if {
	some path, content in input.file_contents
	endswith(path, ".py")
	lines := split(content, "\n")
	some i, line in lines
	regex.match(`\.execute\([^,)]*["']\s*\+`, line)
	finding := {
		"rule_id": metadata.id,
		"message": "SQL query built by string concatenation; pass the values as execute() parameters",
		"artifact_uri": path,
		"severity": metadata.severity,
		"level": metadata.level,
		"start_line": i + 1,
		"snippet": line,
	}
}
```

Against this file it reports line 2 and not line 3:

```python
def find_user(cur, name):
    cur.execute("SELECT * FROM users WHERE name = '" + name + "'")
    cur.execute("SELECT * FROM users WHERE name = %s", (name,))
```

## Module contract

| Requirement | Why |
|---|---|
| `package vulnetix.rules.<name>`, exactly one level below `vulnetix.rules` | The engine evaluates `data.vulnetix.rules` and reads `metadata` and `findings` from each direct child package. A deeper package (`vulnetix.rules.a.b`) is not found. |
| A `metadata` object with a non-empty `id` | A module without an `id` is treated as a library: it is compiled but produces no findings. |
| A `findings` set | Each element is one finding. A finding whose `rule_id` is empty is dropped. |
| Rego v1 syntax (`import rego.v1`, `contains`, `if`) | The CLI embeds OPA v1. |
| A unique `id` | Do not reuse `VNX-` IDs. The ID is what `--rule-id`, `--explain`, `nosec` and ignore rules match. |

The CLI rewrites every `package` and `import data.vulnetix.*` line in a pack to add a per-pack namespace (`vulnetix.rules.<org>_<repo>_<name>`), so two packs can use the same package names. A side effect: a pack cannot import the built-in `data.vulnetix.helpers` library, because the import is rewritten to the pack's own namespace. Ship any helper library inside the pack, under `package vulnetix.<name>`.

## Metadata fields

| Field | Type | Required | Effect |
|---|---|---|---|
| `id` | string | yes | Rule ID in every output. |
| `name` | string | yes | Short title in the terminal and SARIF `name`. |
| `description` | string | yes | SARIF `shortDescription`, `--explain` text. |
| `severity` | string | yes | `critical`, `high`, `medium`, `low` or `info`. Drives `--fail-on`, `--min-severity` and grouping. |
| `languages` | string list | no | Language keys (see [Supported languages](/sast/reference/languages/)). Decides whether the rule compiles at all and which files its findings may be reported on. Empty, missing or `generic`: every file. |
| `kind` | string | no, default `sast` | `sast`, `secrets`, `oci`/`container` or `iac`. `vulnetix sast` runs only `sast`; the others run under their own commands and `vulnetix scan`. |
| `level` | string | no | SARIF level `error`, `warning` or `note`. Default from severity: critical and high are `error`, medium is `warning`, low and info are `note`. |
| `help_uri` | string | no | SARIF `helpUri`. |
| `cwe` | integer list | no | Written as `CWE-<n>` in SARIF. |
| `capec` | string list | no | e.g. `"CAPEC-66"`. |
| `attack_technique` | string list | no | MITRE ATT&CK IDs, e.g. `"T1190"`. |
| `cvssv4` | string | no | CVSS v4 vector. |
| `cwss` | string | no | CWSS vector. |
| `tags` | string list | no | Free text, written to SARIF. Two tags change scoping, below. |

## Finding fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `rule_id` | string | yes | Use `metadata.id`. Kind, languages and scoping come from the metadata with this ID. |
| `message` | string | yes | What is wrong and what to do, for this occurrence. |
| `artifact_uri` | string | yes | The key from `input.file_contents`, relative to `--path`. |
| `start_line` | integer | yes | 1-based. `0` omits the region. |
| `end_line` | integer | no | For a multi-line finding. `nosec` on any line in the range applies. |
| `snippet` | string | no | The matched line. Also used to drop comment-only matches. |
| `severity` | string | no | Default: the metadata severity. |
| `level` | string | no | Default: the metadata level. |

## The input document

| Key | Type | Contents |
|---|---|---|
| `input.file_contents` | object, path to text | Every text file the scan read (see [what is read](/sast/#what-is-read)). A rule that judges one file at a time should iterate this. |
| `input.file_set` | object, path to `true` | Every file path found, for existence checks (`input.file_set["go.sum"]`). |
| `input.dirs_by_language` | object, language to directory list | Directories holding a language's manifest: `go` (`go.mod`), `python` (`pyproject.toml`, `requirements.txt`, `Pipfile`, `setup.py`), `node` (`package.json`), `rust`, `ruby`, `java`, `php`, `dotnet`. |
| `input.scan_root` | string | Absolute scan path, for messages only. |

The engine evaluates a rule that reads only `input.file_contents` one batch of files at a time, in parallel, and caches its findings per file. A rule that reads `file_set` or `dirs_by_language` sees the whole tree in one evaluation and is cached as a group. Prefer the per-file shape.

## Scoping applied after your rule

The engine drops some findings before they are reported, so a rule does not have to:

| Dropped | Unless |
|---|---|
| Findings of a `sast` rule on Markdown, reStructuredText, AsciiDoc or `.rego` files | the rule has the `documentation` tag |
| Findings of a `sast` rule whose snippet is only a comment (`//`, `/* */`, `#` and so on) | the rule has the `comments` or `documentation` tag |
| Findings on a file whose language is known and is not one the rule declares | the rule declares no language, `generic`, or a key the CLI does not model |
| Findings of a rule that does not claim JavaScript or C# on a `.json` file | |
| Findings covered by `nosec`, an ignore rule, or `--suppress-test-code` | |

## Loading packs

```bash
vulnetix sast --rule myorg/sast-rules                         # built-in rules plus yours
vulnetix sast --rule myorg/sast-rules --disable-default-rules # yours only
vulnetix sast -R myorg/sast-rules -R myorg/java-rules         # several packs
vulnetix sast --rule myorg/sast-rules --rule-registry https://gitlab.com
vulnetix sast --rule platform/sast-rules --rule-registry https://git.example.com
```

| Behaviour | Detail |
|---|---|
| Clone URL | `<--rule-registry>/<org>/<repo>`, default registry `https://github.com`. One registry applies to every `--rule` in the run. |
| Clone | Shallow (`depth 1`) into the user cache: `~/.cache/vulnetix/rules/<org>/<repo>/` (Linux), `~/Library/Caches/vulnetix/rules/<org>/<repo>/` (macOS), `%LOCALAPPDATA%\vulnetix\rules\<org>\<repo>\` (Windows). |
| Later runs | Pull the cached clone. If the pull fails, the cache is deleted and cloned again. |
| Private repositories | The clone uses go-git with no stored credentials. Put a token in the registry URL (`--rule-registry "https://x-access-token:$TOKEN@github.com"`); go-git sends it as HTTP basic auth. The URL, token included, is saved as the remote in the cached clone's `.git/config`, so use a short-lived read-only token. |
| Kind lock | `vulnetix sast` runs only the pack's `kind: sast` rules; `vulnetix scan --rule` runs all kinds, and turns the secrets, container and IaC passes on so the pack's other rules can run. |
| Clone failure | `Warning: rules registry not found: <org>/<repo>: <error>`. The scan continues without the pack. |

The run prints `Imported <n> rules from <org>/<repo>` (or `from <k> packs (...)`). `Imported 0 rules from <org>/<repo>` means the pack has no `rules/` directory or no `.rego` files in it.

> [!CAREFUL] A pack that fails to clone does not fail the scan
> A typo in `--rule`, a revoked token or a network block prints a warning and scans with the rules that did load. In CI, check the `Imported` line, or use `--disable-default-rules` so a missing pack shows up as zero rules.

## Testing a rule

With the OPA CLI, evaluate the pack against a fixture without the Vulnetix CLI:

```bash
cat > input.json <<'EOF'
{"file_contents": {"db.py": "def find_user(cur, name):\n    cur.execute(\"SELECT * FROM users WHERE name = '\" + name + \"'\")\n"}}
EOF
opa eval --format pretty -d rules/ -i input.json 'data.vulnetix.rules'
```

Then run it through the CLI on a fixture directory, with only your pack loaded so the run is fast:

```bash
git push   # the CLI clones the remote, not your working tree
vulnetix sast --path ./fixtures --disable-default-rules --rule myorg/sast-rules -o json-sarif \
  | jq '.runs[0].results[] | {ruleId, line: .locations[0].physicalLocation.region.startLine}'
vulnetix sast --path ./fixtures --disable-default-rules --rule myorg/sast-rules --list-default-rules
```

`--list-default-rules` prints only the embedded rules; it does not list a pack's rules. Use `--explain <your-rule-id>` with the pack loaded to see one rule's description and every place it fired.

## Published rule packs

Public packs in the Vulnetix organisation. Only `sast`-kind rules run under `vulnetix sast`; the rest need `vulnetix iac`, `vulnetix containers` or `vulnetix scan`.

| Pack | Rules | Kinds | Covers |
|---|---|---|---|
| `Vulnetix/opa-gosec` | 60 | `sast` | Go: clean-room reimplementation of gosec G101 to G709 |
| `Vulnetix/opa-py-ruff` | 956 | `sast` | Python: clean-room Ruff rules, IDs `RUFF-<code>`. About half are pattern checks; the rest are stubs that report nothing. |
| `Vulnetix/community-rules` | 223 | 184 `iac`, 24 `api`, 7 `container`, 5 `sast`, 3 `sca` | Mixed |
| `Vulnetix/opa-aquasecurity-trivy` | 107 | `iac` | Dockerfile and container configuration |
| `Vulnetix/opa-fugue-regula` | 275 | `iac` | Terraform, CloudFormation, Kubernetes, ARM |
| `Vulnetix/opa-checkmarx-kics` | 205 | `iac` | IaC across many platforms |
| `Vulnetix/opa-cigna-tf` | 88 | `iac` | AWS Terraform |

```bash
vulnetix sast --depth 10 --rule Vulnetix/opa-gosec
vulnetix sast --depth 10 --rule Vulnetix/opa-py-ruff --disable-default-rules
```
