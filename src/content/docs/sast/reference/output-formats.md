---
title: Output formats
description: The SARIF 2.1.0 document vulnetix sast writes, field by field, where it is written, and what the terminal, JSON report and upload carry.
order: 3
sources: [cli/internal/sast/sarif.go, cli/internal/sast/rule.go, cli/internal/sast/fingerprint.go, cli/cmd/scan.go, cli/cmd/sarif_persist.go, cli/internal/scanopts/surface.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

| Output | How to get it | Carries SAST findings |
|---|---|---|
| Terminal | default; `--view` picks the layout | yes |
| `.vulnetix/sast.sarif` | always, when the run has at least one finding | yes |
| SARIF to stdout | `-o json-sarif` | yes |
| SARIF file | `-o <name>.sarif` or `-o <name>.sarif.json` | yes |
| JSON report | `-o json-report` or `-o <name>.report.json` | no |
| Console snapshot | signed in, every run except `--explain` and `--dry-run` | yes |

Only one stdout format is allowed per run: `-o json-sarif -o json-report` is an error. File targets can be combined with each other and with one stdout format. An output path with no recognised extension is rejected (`cannot infer output format`).

> [!CAREFUL] `.vulnetix/sast.sarif` disappears on a clean run
> The CLI deletes `.vulnetix/sast.sarif` when a run has no findings, so a CI step that uploads it fails on the run you most want to record. Pass `-o <file>.sarif`: a file you name is written on every run, with an empty `results` array when there is nothing to report.

> [!CAREFUL] The JSON report does not include SAST findings
> `json-report` (`schema: vulnetix/report/v1`) is the dependency report. On a SAST run it holds only `counts`, `packages: null` and `meta.kinds: ["sast"]`. Use SARIF for SAST.

## SARIF document

One run, tool `vulnetix`, version = the CLI version, `informationUri: https://vulnetix.com`, `$schema` the OASIS SARIF 2.1.0 errata 01 schema.

### `runs[0].tool.driver.rules[]`

One descriptor per rule loaded for this run, after the kind lock and the language pre-filter. A Python project carries about 370 descriptors; this makes the file large (around 850 KB) even with one result.

| SARIF field | From rule metadata |
|---|---|
| `id` | `id` |
| `name` | `name` |
| `shortDescription.text` | `description` |
| `helpUri` | `help_uri` |
| `properties.severity` | `severity` |
| `properties.tags` | `tags` |
| `properties.cwe` | `cwe`, as `["CWE-89"]` |
| `properties.capec` | `capec` |
| `properties.attack_technique` | `attack_technique` |
| `properties.cvssv4` | `cvssv4`, when set |
| `properties.cwss` | `cwss`, when set |

> [!CAREFUL] Built-in `helpUri` values point at the old docs host
> Built-in rules still carry `help_uri: https://docs.cli.vulnetix.com/docs/sast-rules/<id>/`. Those URLs redirect to the pages under [/sast/rules/](/sast/rules/).

### `runs[0].results[]`

| SARIF field | Value |
|---|---|
| `ruleId` | The rule's `id`. |
| `level` | The finding's `level`, else the rule's, else from severity: `critical` and `high` are `error`, `medium` is `warning`, `low` and `info` are `note`. |
| `message.text` | The message the rule wrote. |
| `locations[0].physicalLocation.artifactLocation.uri` | Path relative to `--path`. |
| `locations[0].physicalLocation.region.startLine` | 1-based. Omitted when the rule gave no line. |
| `region.endLine` | Only when greater than `startLine`. |
| `region.snippet.text` | The matched line as the rule returned it. `--snippet-context` does not change it. |
| `fingerprints["vulnetix/v1"]` | First 16 hex digits of SHA-256 of rule ID, path and start line. It changes when the finding moves to another line. |
| `properties.severity` | `critical`, `high`, `medium`, `low` or `info`. |
| `properties["vulnetix/kind"]` | `sast` (or `secrets`, `oci`, `iac` from `vulnetix scan`). |
| `properties["vulnetix/test-suite"]` | `true` when the file is test code. |
| `properties["vulnetix/test-framework"]`, `test-language`, `test-confidence`, `test-matched-pattern`, `test-evidence` | How the test file was recognised. `test-confidence` is `confirmed`, `high`, `medium` or `low`. |

`result.kind` is not written, so it is the SARIF default, `fail`. The Vulnetix rule kind is in `properties["vulnetix/kind"]` because `result.kind` is a SARIF enum.

### `runs[0].invocations[0].toolExecutionNotifications[]`

Warnings about the run itself, at level `warning`, for example:

```text
1 file(s) were not content-scanned (over the 1 MiB text cap, unreadable, or binary)
2 finding(s) suppressed by nosec comments
2 finding(s) suppressed by ignore rules
1 finding(s) attributed to test suites
3 test-code finding(s) suppressed (--suppress-test-code)
```

Read these before trusting a clean result: files not content-scanned were never seen by any rule.

### Example result

```json
{
  "ruleId": "VNX-PY-003",
  "level": "error",
  "message": { "text": "pickle.loads() unpickles data, which can execute arbitrary code; use json or another data-only format for anything that crosses a trust boundary" },
  "locations": [{
    "physicalLocation": {
      "artifactLocation": { "uri": "app/main.py" },
      "region": { "startLine": 5, "snippet": { "text": "    return pickle.loads(request.data)" } }
    }
  }],
  "fingerprints": { "vulnetix/v1": "e1703665435615cb" },
  "properties": { "severity": "high", "vulnetix/kind": "sast" }
}
```

Print the rule IDs and locations with `jq`:

```bash
vulnetix sast -q -o json-sarif 2>/dev/null \
  | jq -r '.runs[0].results[] | "\(.properties.severity)\t\(.ruleId)\t\(.locations[0].physicalLocation.artifactLocation.uri):\(.locations[0].physicalLocation.region.startLine)"'
```

## Terminal

`--view auto` prints `plain` (one line per finding, as in the [quickstart](/sast/get-started/quickstart/)) in a pipe or when `CI` is set, and the grouped view in a terminal. See [Reading the results](/sast/guides/reading-results/).

## Console snapshot

When the CLI has credentials, findings are uploaded per kind and the run prints `SAST snapshot: https://www.vulnetix.com/resolve/scanner-results/<uuid>`. The upload carries each finding with `--snippet-context` lines of surrounding source, its test-suite attribution, the suppressions recorded this run, and the test-runner config files found (path, framework, size and SHA-256, not their contents).

## `.vulnetix/memory.yaml`

Written on every run unless `--disable-memory`. For SAST it holds `last_scan` (counts, `sast_rules_loaded`, `sast_finding_count`, `sarif_path`), a `history` list, `sast_findings` keyed by fingerprint with first and last seen times, and `suppressions`. Commit it or not as you prefer; suppressions recorded there apply only to runs that read it.
