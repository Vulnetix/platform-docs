---
title: Flags
description: Every flag vulnetix secrets accepts, with type, default and effect, including the family flags that do nothing on this command.
order: 1
sources: [cli/cmd/specialized_scans.go, cli/cmd/scan.go, cli/internal/scanopts/surface.go, cli/internal/scanopts/failon.go, cli/internal/scanopts/deployment.go, cli/cmd/root.go]
checked: [cli@2449840]
updated: 02 Nov 2026
---

```text
vulnetix secrets [flags]
```

`vulnetix secrets` takes the flags of the whole scan family (`scan`, `sca`, `sast`, `secrets`, `containers`, `iac`) so a pipeline can pass the same words to each. This page lists them by what they do on this command. `vulnetix secrets --help` prints the same set.

## What to scan

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--path` | string | `.` | Directory to scan. |
| `--depth` | int | `3` | Directory levels to walk below `--path`. A file at a greater depth is not read. |
| `--exclude` | string, repeatable | | Glob, relative to the scan root, of paths not to read. |
| `--ignore` | string, repeatable | | Same as `--exclude`; documented for the secrets stage. |
| `--secrets-include-ignored` | bool | `false` | Also read files your `.gitignore` matches. `--include-ignored` does the same. |
| `--ignore-binaries` | bool | `false` | Skip binary files instead of extracting their printable strings and image metadata. |
| `--git-history` | bool | `true` | Read files changed in past commits. `--git-history=false` turns it off. |
| `--ignore-git` | bool | `false` | Skip the history pass. The `.git` directory is never read as source either way. |
| `--git-history-max-commits` | int | `500` | Commits to walk, newest first. `0` is no cap. |
| `--git-history-max-files` | int | `5000` | Past file versions to extract. `0` is no cap. |
| `--dry-run` | bool | `false` | Detect files and check memory, then exit with zero API calls. |
| `--no-cache` | bool | `false` | Evaluate every file instead of reusing results kept for files unchanged since an earlier run. |

## Rules

| Flag | Type | Default | Effect |
|---|---|---|---|
| `-R`, `--rule` | string, repeatable | | External Rego rule pack, `org/repo`, fetched from GitHub or `--rule-registry`. Only its rules of kind `secrets` run here. |
| `--rule-registry` | string | `https://github.com` | Registry for every `--rule` repository. |
| `--disable-default-rules` | bool | `false` | Run only the `--rule` packs. |
| `--rule-id` | string | | Run one rule, e.g. `VNX-SEC-001`. |
| `--list-default-rules` | bool | `false` | Print the built-in rule table and exit. It lists rules of every kind. |
| `--suppress-test-code` | bool | `false` | Drop findings in files attributed to the test suite. |

## What to show

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--view` | string | `auto` | `auto`, `packages`, `findings`, `tree`, `table`, `plain` or `json`. `auto` is `plain` for a pipe or CI. |
| `--min-severity` | string | | Hide findings below `low`, `medium`, `high` or `critical`. Does not change the exit code. |
| `--show` | string, repeatable | | Add `paths`, `files`, `clean`, `scores`, `defences` or `tests`. `tests` ranks test-code credentials. |
| `--hide` | string, repeatable | | Remove `fixes`, `exploits`, `defences` or `not-affected`. |
| `--filter` | string, repeatable | | Keep findings matching all of `kev`, `exploited`, `reachable`, `fixable`, `nofix`, `defended`, `unprotected`, `direct`, `transitive`. These describe dependency findings; on secrets they match nothing. |
| `--sort` | string | `threat` | `threat`, `severity` or `package`. |
| `--explain` | string | | A rule id or a file path. Prints the rotation steps and every place, writes nothing, uploads nothing. |
| `-q`, `--quiet` | bool | `false` | Print findings only, nothing when clean. |
| `-v`, `--verbose` | count | | `-v` adds diagnostics; `-vv` adds raw evidence. |
| `--color` | string | `auto` | `auto`, `always` or `never`. |
| `--ascii` | bool | `false` | ASCII instead of Unicode symbols. |
| `--width` | int | terminal | Output width in columns. |

## When to fail

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--fail-on` | string, repeatable | | Exit `1` when any secrets finding is at or above `low`, `medium`, `high` or `critical`. The other values (`kev`, `exploit=…`, `malware`, `eol`, `unpinned`, `unprotected`, `lag=<n>`, `cooldown=<n>d`) are dependency gates and never fire here. |
| `--jail` | bool | `false` | After uploading, evaluate the organisation's jail policy. Exits `1` on a breach and `3` when a rule cannot be evaluated. See [jail](/quality-gates/). |
| `--strict`, `--accept-defended` | bool | `false` | Dependency gates only. |

When you are authenticated and your organisation's quality gate sets a severity, that severity replaces `--fail-on`'s for this run, and the CLI prints a note saying so.

## What to write

| Flag | Type | Default | Effect |
|---|---|---|---|
| `-o`, `--output` | string, repeatable | | `json-sarif` or `json-report` to stdout, or a file path ending `.sarif`, `.sarif.json` or `.report.json`. See [Output and exit codes](/secrets/reference/output/). |
| `--snippet-context` | int | `-1` | Source lines captured around each uploaded finding. `-1` is 3 lines (5 for a span of 10 or more), `0` sends only the rule's own snippet. |
| `--disable-memory` | bool | `false` | Do not read or write `.vulnetix/memory.yaml`. |

## Deployment labels

Recorded with the upload, so the console can group scans. They do not change what is scanned.

| Flag | Type | Effect |
|---|---|---|
| `--project` | string | Project the scan belongs to. |
| `--environment` | string | e.g. `production`, `staging`. |
| `--cluster`, `--namespace` | string | Where the artefact runs. |
| `--tag` | string, repeatable | `key=value` label. |

## Global flags

`--org-id`, `--no-banner`, `--no-progress`, `--no-analytics`, `--silent`. See [global flags](/cli/reference/global-flags/).

## Accepted, no effect here

These belong to other scanners in the family and are accepted so a shared command line does not fail: `--reachability`, `--sca-autofix` (`--fix`), `--sca-autofix-strategy`, `--sca-autofix-manifest`, `--sca-autofix-max-major-bump`, `--yes`, `--allow`, `--allow-file`, `--license-mode`, `--policy-file`, `--exceptions-file`, `--block-eol-severity`, `--no-ci-package-analysis`, `--no-shell-package-analysis`, `--no-malscan`, `--bom-manufacturer`, `--lifecycle`. `--vex-file` and `--no-vex` apply third-party VEX statements before the gates; see [VEX](/vex/).

## Superseded flags

Hidden from `--help`, still accepted. At a terminal (not in CI) the CLI prints the replacement once.

| Old | Use |
|---|---|
| `--severity <sev>` | `--fail-on <sev>` |
| `--results-only` | `-q` |
| `--show-detected` | `--show files` |
| `--format` | `--output` |
