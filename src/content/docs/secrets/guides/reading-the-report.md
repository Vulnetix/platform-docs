---
title: Reading the report
description: How the terminal report groups secrets by credential, what each group means, and what --explain prints.
order: 2
sources: [cli/internal/report/code_secrets.go, cli/internal/report/code.go, cli/cmd/code_enrich.go, cli/internal/scanopts/surface.go]
checked: [cli@2449840]
updated: 02 Nov 2026
---

The terminal report is organised by **credential**, because a credential is what you rotate. The same key written in three files is one row, and rotating it once fixes all three. Two findings are the same credential when the same rule matched and the line holds the same most-random-looking token. The token is hashed in memory to decide that. It is never printed or stored by the report.

```text
 ✖ SECRETS 5 credentials in 7 places          2 to rotate · 1 not committed · 1 can wait · 1 in tests
   1092 rules ran · one value in several files counts once · values are never printed

 ROTATE NOW · 2 credentials · committed to production code
 ──────────────────────────────────────────────────────────────────────────────────────────────
 ● CRITICAL  AWS access key ID       VNX-SEC-001  .env.example:3
             committed in a1b2c3d, 41 days ago   also in deploy/prod.tfvars:14 +1 more

 NOT COMMITTED · 1 credential · remove it now and it never reaches the history
 ──────────────────────────────────────────────────────────────────────────────────────────────
 ● HIGH      Slack webhook URL       VNX-SEC-042  internal/notify/slack.go:31
```

## Groups

| Group | What is in it |
|---|---|
| ROTATE NOW | Critical and high credentials in production code that are in git history, or whose history could not be read. |
| NOT COMMITTED | Critical and high credentials found only in the working tree: an untracked file, or a line not committed yet. Remove them now and they never reach the history. |
| CAN WAIT | Medium and low matches, such as generic high-entropy strings. |
| IN TESTS | Credentials in test code, listed and not ranked. `--show tests` ranks them with the rest. |
| VENDORED | Credentials under `third_party/`, `vendor/`, `node_modules/` and similar trees. |

Within a group, rows sort by severity, then by how many places hold the credential.

## Where the commit note comes from

After the scan, the CLI runs `git blame` on each finding's line, for at most 200 findings. The result decides ROTATE NOW against NOT COMMITTED and gives the note `committed in a1b2c3d, 41 days ago`, using the oldest commit, which is when the credential was first exposed.

A copy found only by the history pass is reported as `removed from the tree, still in history: committed in …`. The file no longer holds it, but anyone with a clone does.

Outside a git repository nothing is blamed, and every critical or high credential lands in ROTATE NOW without a note. An unknown history is not treated as a clean one.

## `--explain`

```bash
vulnetix secrets --explain VNX-SEC-001
vulnetix secrets --explain deploy/prod.tfvars
```

With a rule id or a file path, `--explain` prints the rotation steps in order (revoke at the provider, check its access logs from the commit date, issue a replacement, remove the copies) and then each place with its status: `committed a1b2c3d · 2026-09-03`, `in git history` or `not committed`. It never prints the value or its line, because the match span is not recorded and a wrong guess at it would print the secret.

An `--explain` run writes nothing and uploads nothing.

## Display flags

These change the terminal view only. SARIF, the JSON report, uploads and gates see every finding at its own severity.

| Flag | Effect |
|---|---|
| `--min-severity <sev>` | Hide findings below `low`, `medium`, `high` or `critical`. |
| `--show tests` | Rank test-code credentials instead of listing them. |
| `--show files` | Print the detected files and the "Analysing N file(s)" banner. |
| `-q`, `--quiet` | Print findings only, and nothing when clean. |
| `-v` | Add diagnostics. `-vv` adds the raw evidence. |
| `--view <view>` | `auto`, `packages`, `findings`, `tree`, `table`, `plain` or `json`. `auto` picks `plain` for a pipe or CI. |
| `--color`, `--ascii`, `--width` | Terminal rendering. |
