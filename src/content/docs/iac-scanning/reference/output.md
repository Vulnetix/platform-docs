---
title: Output and exit codes
nav: Output
description: The --output targets, the files vulnetix iac writes, what the upload carries, and the exit codes.
order: 3
sources: [cli/cmd/scan.go, cli/cmd/sarif_persist.go, cli/internal/sast/sarif.go, cli/cmd/exit_codes.go, cli/pkg/vdb/api_cli.go]
checked: [cli@2449840]
updated: 02 Nov 2026
---

## `--output`

| Value | Writes |
|---|---|
| `json-sarif` | SARIF 2.1.0 to stdout, replacing the terminal report |
| `json-report` | The Vulnetix JSON report (`"schema": "vulnetix/report/v1"`) to stdout |
| `*.sarif`, `*.sarif.json` | SARIF 2.1.0 file; the terminal report is still printed |
| `*.report.json` | JSON report file |

`-o` is repeatable; only one stdout keyword is allowed per run. No SBOM is produced.

```bash
vulnetix iac --depth 10 -o iac.sarif -o iac.report.json
```

## Files written

| Path | When | Contents |
|---|---|---|
| `.vulnetix/sast.sarif` | The run has at least one finding | SARIF 2.1.0, one result per finding: rule id, level, location, snippet, CWE and rule metadata. A clean run deletes a stale copy. |
| `.vulnetix/memory.yaml` | Unless `--disable-memory` | Scan record, finding states and ignore rules. A finding that no longer appears is marked resolved once it is verified gone. |

`--explain` runs write neither.

> [!CAREFUL] One SARIF path for three commands
> `vulnetix sast`, `vulnetix secrets` and `vulnetix iac` all write `.vulnetix/sast.sarif`. Keep your own copy with `-o iac.sarif`.

The SARIF `ruleId` is the rule id as declared (`VNX-TF-002`, `FUGUE-ARM-AS-05`). The `level` is the rule's declared level; the seven built-in rules are all `error`.

## What is uploaded

Without credentials nothing is uploaded. When you are authenticated the CLI sends the findings to `POST /v2/cli.iac` and prints `Snapshot: <url>`. A clean run still submits, so the Resolve Platform records the repository as assessed. A failed upload is a warning and does not change the exit code.

Each finding carries the rule id, name, description, severity, file, line, CWE, CWSS vector, tags, fingerprint and a code snippet read from the file: the finding's lines plus 3 non-blank lines either side by default, set with `--snippet-context` (`0` sends the rule's own one-line snippet instead).

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Completed; no gate breached. Findings alone do not fail the run. |
| `1` | A `--fail-on` severity gate or a `--jail` rule was breached, or a fatal error occurred. |
| `3` | `--jail` only: a jail rule could not be evaluated against this scan's coverage. |

A rule pack that fails to download is a warning, not an error: the run continues without it and can exit `0`. Check the `Imported N rules from …` line in CI logs.
