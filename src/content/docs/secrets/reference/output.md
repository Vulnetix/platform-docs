---
title: Output and exit codes
nav: Output
description: The --output targets, the files vulnetix secrets writes, what each upload carries, and the exit codes.
order: 3
sources: [cli/cmd/scan.go, cli/cmd/sarif_persist.go, cli/internal/sast/sarif.go, cli/internal/sast/rules/lib_secrets.rego, cli/cmd/exit_codes.go, cli/pkg/vdb/api_cli.go]
checked: [cli@2449840]
updated: 02 Nov 2026
---

## `--output`

`-o, --output` is repeatable. A keyword writes to stdout and replaces the terminal report; a file path writes a file and keeps the terminal report.

| Value | Writes |
|---|---|
| `json-sarif` | SARIF 2.1.0 to stdout |
| `json-report` | The Vulnetix JSON report (`"schema": "vulnetix/report/v1"`) to stdout |
| `*.sarif`, `*.sarif.json` | SARIF 2.1.0 file |
| `*.report.json` | JSON report file |

No SBOM is produced: `vulnetix secrets` runs no dependency analysis.

```bash
vulnetix secrets -o json-sarif > secrets.sarif
vulnetix secrets -o secrets.sarif -o secrets.report.json
```

## Files written

| Path | When | Contents |
|---|---|---|
| `.vulnetix/sast.sarif` | The run has at least one finding | SARIF 2.1.0: one result per finding, with rule id, level, location, snippet, CWE and the rule's metadata. A clean run deletes a stale copy. |
| `.vulnetix/memory.yaml` | Unless `--disable-memory` | Scan record (time, finding counts, git context), each finding's state, and ignore rules. A finding that no longer appears is marked resolved after it is verified gone. |

`--explain` runs write neither.

> [!CAREFUL] secrets, sast and iac share one SARIF path
> `vulnetix sast`, `vulnetix secrets` and `vulnetix iac` all write `.vulnetix/sast.sarif`, so each run replaces the previous one's. In CI, pass `-o secrets.sarif` to keep a copy under its own name.

## SARIF levels

The SARIF `level` is the level the rule declares. Every built-in secrets rule declares it from its severity:

| Severity | `level` |
|---|---|
| `critical`, `high` | `error` |
| `medium` | `warning` |
| `low` | `note` |

The `ruleId` is the Vulnetix rule id (`VNX-SEC-001`). Findings from history, binaries and image metadata keep their synthetic paths (`__git_history__/a1b2c3d/.env`), which a code-scanning dashboard shows as a file it cannot open.

## What is uploaded

Without credentials nothing is uploaded. When you are authenticated, the CLI sends one submission to `POST /v2/cli.secrets` after the scan, then prints `Snapshot: <url>`. A clean run still submits, so the console shows the repository as assessed with zero findings. A failed upload prints a warning and does not change the exit code.

Each finding carries the rule id, name and description, severity, file and line, CWE, CWSS vector, tags, fingerprint, test-suite attribution and a code snippet. The snippet comes from one of two places:

| `--snippet-context` | Snippet sent |
|---|---|
| `-1` (default) or `N > 0` | Read from the file on disk: the finding's lines plus 3 (or `N`) non-blank lines either side. **The credential line is sent as written.** |
| `0` | The rule's own snippet. |

For a finding whose file cannot be read (history, binary strings, image metadata, decoded Kubernetes values), the rule's own snippet is sent whatever the setting.

Most rules mask the credential in their own snippet: the catalogue rules and many hand-written ones such as `VNX-SEC-001` replace every run of 12 or more token characters with `***REDACTED***`, and others replace the matched value with `***`. These eight copy the line unmasked into both the local SARIF file and the upload: `VNX-ANDROID-006`, `VNX-CS-010`, `VNX-JAVA-019`, `VNX-JAVA-021`, `VNX-JAVA-025`, `VNX-JWT-003`, `VNX-SEC-022`, `VNX-TF-008`.

> [!CAREFUL] Send no source lines from CI
> To keep credential values out of Vulnetix, run authenticated scans with `--snippet-context 0`. Treat `.vulnetix/sast.sarif` and any `-o` SARIF file as sensitive while the eight rules above copy the line.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | The scan completed and no gate was breached. Findings alone do not fail the run. |
| `1` | A `--fail-on` severity gate was breached, a `--jail` rule was breached, or a fatal error occurred. |
| `3` | `--jail` only: a jail rule could not be evaluated against this scan's coverage. |
