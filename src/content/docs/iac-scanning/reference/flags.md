---
title: Flags
description: Every flag vulnetix iac accepts, with type, default and effect, including the family flags that do nothing on this command.
order: 1
sources: [cli/cmd/specialized_scans.go, cli/cmd/scan.go, cli/internal/scanopts/surface.go, cli/internal/scanopts/failon.go, cli/cmd/quality_gate_enforce.go]
checked: [cli@2449840]
updated: 02 Nov 2026
---

```text
vulnetix iac [flags]
```

`vulnetix iac` takes the flags of the whole scan family so one command line works for every scanner. They are listed here by what they do on this command.

## What to scan

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--path` | string | `.` | Directory to scan. |
| `--depth` | int | `3` | Directory levels to walk below `--path`. A file deeper than this is not read. |
| `--exclude` | string, repeatable | | Glob, relative to the scan root, of paths not to read. `--ignore` does the same. |
| `--iac-include-ignored` | bool | `false` | Also read files your `.gitignore` matches. `--include-ignored` does the same. |
| `--dry-run` | bool | `false` | Detect files and check memory, then exit with zero API calls. |
| `--no-cache` | bool | `false` | Evaluate every file instead of reusing results kept for files unchanged since an earlier run. |

## Rules

| Flag | Type | Default | Effect |
|---|---|---|---|
| `-R`, `--rule` | string, repeatable | | External rule pack, `org/repo`. Only its rules of kind `iac` run. See [Rule packs](/iac-scanning/guides/rule-packs/). |
| `--rule-registry` | string | `https://github.com` | Registry for every `--rule` repository. |
| `--disable-default-rules` | bool | `false` | Run only the `--rule` packs. |
| `--rule-id` | string | | Run one rule, e.g. `VNX-TF-002` or a pack rule id. |
| `--list-default-rules` | bool | `false` | Print the built-in rule table (every kind) and exit. |
| `--suppress-test-code` | bool | `false` | Drop findings in files attributed to the test suite. |

## What to show

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--view` | string | `auto` | `auto`, `packages`, `findings`, `tree`, `table`, `plain` or `json`. `auto` is `plain` for a pipe or CI. |
| `--min-severity` | string | | Hide findings below `low`, `medium`, `high` or `critical`. Does not change the exit code. |
| `--show` | string, repeatable | | Add `paths`, `files`, `clean`, `scores`, `defences` or `tests`. |
| `--hide` | string, repeatable | | Remove `fixes`, `exploits`, `defences` or `not-affected`. |
| `--sort` | string | `threat` | `threat`, `severity` or `package`. |
| `--explain` | string | | A file path or rule id. Writes nothing, uploads nothing. |
| `-q`, `--quiet` | bool | `false` | Print findings only, nothing when clean. |
| `-v`, `--verbose` | count | | `-v` adds diagnostics and turns off folding; `-vv` adds raw evidence. |
| `--color` | string | `auto` | `auto`, `always` or `never`. |
| `--ascii` | bool | `false` | ASCII instead of Unicode symbols. |
| `--width` | int | terminal | Output width in columns. |

`--filter` is accepted, but its values (`kev`, `reachable`, `fixable` and so on) describe dependency findings and match no IaC finding.

## When to fail

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--fail-on` | string, repeatable | | Exit `1` when any IaC finding is at or above `low`, `medium`, `high` or `critical`. Its dependency values (`kev`, `exploit=…`, `malware`, `eol`, `unpinned`, `unprotected`, `lag=<n>`, `cooldown=<n>d`) never fire here. |
| `--jail` | bool | `false` | After uploading, evaluate the organisation's jail policy. Exits `1` on a breach, `3` when a rule cannot be evaluated. |
| `--strict`, `--accept-defended` | bool | `false` | Dependency gates only. |

When you are authenticated and your organisation's quality gate sets a severity, it replaces `--fail-on`'s for the run and the CLI prints `--severity <yours> superseded by org policy: <org's>`.

## What to write

| Flag | Type | Default | Effect |
|---|---|---|---|
| `-o`, `--output` | string, repeatable | | `json-sarif` or `json-report` to stdout, or a path ending `.sarif`, `.sarif.json` or `.report.json`. |
| `--snippet-context` | int | `-1` | Source lines sent around each uploaded finding. `-1` is 3 lines (5 for a span of 10 or more); `0` sends only the rule's snippet. |
| `--disable-memory` | bool | `false` | Do not read or write `.vulnetix/memory.yaml`. |
| `--vex-file`, `--no-vex` | string, bool | | Apply (or ignore) third-party VEX statements before the gates. |

## Deployment labels

`--project`, `--environment`, `--cluster`, `--namespace` and `--tag key=value` (repeatable) are recorded with the upload so the console can group scans. They do not change what is scanned.

## Global flags

`--org-id`, `--no-banner`, `--no-progress`, `--no-analytics`, `--silent`.

## Accepted, no effect here

`--reachability`, `--sca-autofix` (`--fix`) and its `--sca-autofix-*` options, `--yes`, `--allow`, `--allow-file`, `--license-mode`, `--policy-file`, `--exceptions-file`, `--block-eol-severity`, `--no-ci-package-analysis`, `--no-shell-package-analysis`, `--no-malscan`, `--bom-manufacturer`, `--lifecycle`, and the secrets-stage flags `--ignore-binaries`, `--git-history`, `--ignore-git`, `--git-history-max-commits`, `--git-history-max-files`.

## Superseded flags

Hidden from `--help`, still accepted.

| Old | Use |
|---|---|
| `--severity <sev>` | `--fail-on <sev>` |
| `--results-only` | `-q` |
| `--show-detected` | `--show files` |
| `--format` | `--output` |
