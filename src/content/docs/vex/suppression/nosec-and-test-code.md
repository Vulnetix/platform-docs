---
title: nosec comments and test code
nav: nosec and test code
description: Suppress a finding on its line with a gosec-compatible nosec comment, how scans fold nosec into org rules and track moved code, and the test-code suppression.
order: 2
sources: [cli/internal/sast/nosec.go, cli/cmd/suppress_sync.go, cli/cmd/suppress_report.go, cli/cmd/testsuite_scan.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

## nosec comments

SAST-family scans (`sast`, `secrets`, `iac`, `containers`, and `scan`) read gosec-compatible `nosec` comments in `#`, `//`, `--` and `;` comment styles, case-insensitive, anywhere on the line.

| Comment | Effect |
|---|---|
| `// nosec` on a finding's line | Drops every finding on that line |
| `# nosec vnx-315,vnx-320` on a finding's line | Drops only those rule ids on that line |
| `// nosec` on line 1 of a file | Drops every finding in the file |
| `# nosec vnx-315` on line 1 of a file | Drops only those rule ids, in the whole file |

The rule-id list is split on commas, spaces or tabs. An empty list means all rules.

```go
password := os.Getenv("DB_PASSWORD") // nosec vnx-sec-014 read from the environment, not hard-coded
```

Each scan reports what it hid:

```text
3 finding(s) suppressed by nosec comments
1 finding(s) suppressed by ignore rules
```

## How scans keep nosec rules

You do not run `ignore add` for a `nosec` comment. A SAST-family scan:

1. Writes each directive to `.vulnetix/memory.yaml` as a suppression with `type: nosec` and `origin: nosec`. Its identity is the rule id plus the code snippet, so a moved comment updates the same record.
2. When authenticated, sends the reconciled set with the scan's SARIF upload. The backend upserts one rule per directive.
3. Follows code drift. Using git blame and rename following, the scanner relocates each snippet-anchored rule's file and line as the code moves. When the comment, or the line a manual rule was pinned to, is deleted, the rule is deactivated with the reason `anchor removed`. This is reversible and recorded in the audit trail.

## Test-code findings

A SAST-family scan recognises findings in your test suite: a test file corroborated by a test-runner config file or a declared test dependency. Those findings are always lowered to LOW. With `--suppress-test-code` the scan also records a `test-code` suppression for each, so they leave the active findings list.

```bash
vulnetix sast --suppress-test-code
```

These are written to `.vulnetix/memory.yaml` and synced like nosec rules. See [SAST](/sast/) for how test files are detected.

## Reported to Vulnetix

Every finding an ignore rule or a nosec comment hid before upload is listed in `localSuppressions` on the run's `cli.finalize` call, with the rule's uuid, source (`memory`, `remote` or `nosec`), type and reason. The platform records which rule hid which finding. Findings hidden by a `--vex-file` statement are not in that list, because a VEX statement is not a rule.
