---
title: vulnetix sast flags
nav: Flags
description: Every flag vulnetix sast accepts, with type, default and effect, plus the environment variables, legacy aliases and exit codes.
order: 1
sources: [cli/cmd/specialized_scans.go, cli/cmd/scan.go, cli/cmd/sast_rules.go, cli/cmd/sast_cache.go, cli/internal/scanopts/surface.go, cli/cmd/exit_codes.go, cli/cmd/quality_gate_enforce.go, cli/internal/sast/eval_units.go, cli/internal/sast/engine.go, cli/cmd/memory_limit.go, cli/cmd/insights_graph.go, cli/cmd/sarif_persist.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

```text
vulnetix sast [flags]
```

`sast` is `vulnetix scan` with SCA, licences, secrets, containers and IaC switched off and the rule kind locked to `sast`. It registers the same flag set as `scan`, so some flags below are accepted but have no effect on a SAST-only run; they are listed under [Accepted, no effect](#accepted-no-effect). Run `vulnetix sast --help` for the grouped list your build has.

> [!CAREFUL] The help text's "Equivalent to" line is wrong
> `vulnetix sast --help` says it equals `vulnetix scan --evaluate-sast ... --no-sast ...`. The `--no-sast` is a typo in the command's long description; the command runs SAST and nothing else.

## What to scan

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--path` | string | `.` | Directory to scan. `.vulnetix/` output is written inside it. |
| `--depth` | int | `3` | Deepest path to read, counting the file: `a/b/c.py` is depth 3 and is read; `a/b/c/d.py` is not. |
| `--exclude` | string, repeatable | none | `.gitignore`-syntax pattern relative to `--path`; matching files and directories are not read. |
| `--include-ignored` | bool | `false` | Read paths that `.gitignore` excludes. |
| `--sast-include-ignored` | bool | `false` | Same as `--include-ignored`, for this command. |
| `--dry-run` | bool | `false` | Print the rule plan (kinds, `--rule` packs, which are reported as pending and not fetched) and the files that would be read, then show the last stored results. Evaluates no rules and makes no API calls. |

## Rules

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--disable-default-rules` | bool | `false` | Do not load the embedded rules. `--rule` packs still load. |
| `--list-default-rules` | bool | `false` | Print the embedded rules (ID, severity, languages, name) and exit. Lists every kind, not only `sast`. |
| `-R`, `--rule` | string, repeatable | none | Rule pack in `org/repo` form, cloned from `--rule-registry`. See [Custom rules](/sast/guides/custom-rules/). |
| `--rule-registry` | string | `https://github.com` | Base URL for every `--rule` pack: `<registry>/<org>/<repo>`. |
| `--rule-id` | string | none | Run only this rule ID (case-insensitive, e.g. `VNX-GQL-004`). |
| `--suppress-test-code` | bool | `false` | Drop findings in test files and record each as a `test-code` suppression. See [Suppressing findings](/sast/guides/suppressing-findings/#test-code). |
| `--no-cache` | bool | `false` | Evaluate every rule on every file; do not read or write the result cache or the graph cache. |
| `--snippet-context` | int | `-1` | Source lines captured around each finding in the uploaded snapshot. `-1`: 3 lines when the finding spans fewer than 10 lines, else 5. `0`: none. The local SARIF file always carries only the matched line. |

## What to show

| Flag | Type | Default | Values |
|---|---|---|---|
| `--view` | string | `auto` | `auto`, `packages`, `findings`, `tree`, `table`, `plain`, `json`. `auto` is `plain` in a pipe or CI, grouped in a terminal. |
| `--explain` | string | none | A rule ID or a file path. Runs only what that needs; writes and uploads nothing. |
| `--min-severity` | string | none | `low`, `medium`, `high`, `critical`. Hides lower findings from the terminal only; gates and SARIF are unchanged. |
| `--show` | string list | none | `paths`, `files`, `clean`, `scores`, `defences`, `tests`. `tests` ranks test-code findings with the rest. |
| `--hide` | string list | none | `fixes`, `exploits`, `defences`, `not-affected`. |
| `--filter` | string list | none | `kev`, `exploited`, `reachable`, `fixable`, `nofix`, `defended`, `unprotected`, `direct`, `transitive`. These describe dependency findings; on a SAST run they match nothing. |
| `--sort` | string | `threat` | `threat`, `severity`, `package`. |
| `-q`, `--quiet` | bool | `false` | Print findings only; print nothing on a clean run. |
| `-v`, `--verbose` | count | `0` | `-v` shows one snippet per rule, every file it fired in and every rule that can wait, plus diagnostics (cache status, auth notes, quality-gate overrides). `-vv` adds raw evidence. |

## When to fail

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--fail-on` | string list | none | Exit 1 when any condition holds. For SAST the useful values are `low`, `medium`, `high`, `critical`: any finding at or above that severity breaches. The other values (`kev`, `exploit=...`, `malware`, `eol`, `unpinned`, `unprotected`, `lag=<n>`, `cooldown=<n>d`) gate dependency findings. |
| `--jail` | bool | `false` | After uploading, check the repository against the organisation's jail policy. Exit 1 on a breach, 3 when it cannot be evaluated. See [/quality-gates/](/quality-gates/). |
| `--accept-defended` | bool | `false` | Let a recorded, unexpired control satisfy a gate. |
| `--strict` | bool | `false` | Also count findings an advisory rules out by version. SCA only. |

Every finding counts towards `--fail-on`, including those shown under IN TESTS or VENDORED. Suppressed findings do not.

> [!CAREFUL] An organisation quality gate overrides `--fail-on`
> When you are signed in to a (non-community) organisation that has a quality gate, every value the gate sets replaces the matching flag, even one you passed. A gate severity of `high` makes a `--fail-on critical` run fail on high findings. Run with `-v` to see which values were replaced. See [/quality-gates/](/quality-gates/).

## What to write

| Flag | Type | Default | Effect |
|---|---|---|---|
| `-o`, `--output` | string, repeatable | none | `json-sarif` or `json-report` to stdout (one stdout format per run), or a file path whose extension picks the format: `.sarif` / `.sarif.json`, `.report.json`. See [Output formats](/sast/reference/output-formats/). |
| `--color` | string | `auto` | `auto`, `always`, `never`. |
| `--ascii` | bool | `false` | Plain ASCII instead of Unicode symbols. |
| `--width` | int | terminal width or `COLUMNS` | Force the output width. |
| `--disable-memory` | bool | `false` | Do not read or write `.vulnetix/memory.yaml`. Suppressions recorded there are then not applied. |

## Global flags

| Flag | Effect |
|---|---|
| `--no-progress` | No progress bar. Use in CI. |
| `--no-banner` | No startup banner. |
| `--silent` | No log output; only the final result. |
| `--no-analytics` | No anonymous usage analytics. |
| `--org-id` | Organisation UUID for the upload. |

## Accepted, no effect

These are registered on every scan-style command. A SAST-only run ignores them: `--reachability`, `--sca-autofix` (`--fix`), `--sca-autofix-strategy`, `--sca-autofix-manifest`, `--sca-autofix-max-major-bump`, `--yes`, `--allow`, `--allow-file`, `--license-mode`, `--policy-file`, `--exceptions-file`, `--block-eol-severity`, `--bom-manufacturer`, `--lifecycle`, `--vex-file`, `--vex`, `--no-vex`, `--no-malscan`, `--no-ci-package-analysis`, `--no-shell-package-analysis`, `--ignore`, `--ignore-git`, `--ignore-binaries`, `--git-history`, `--git-history-max-commits`, `--git-history-max-files`. The deployment labels `--project`, `--environment`, `--cluster`, `--namespace` and `--tag` are carried on the upload.

## Legacy flags

Still accepted and hidden from help. In an interactive terminal, outside CI, the CLI prints the replacement. `--format` is also accepted and deprecated in favour of `--output`.

| Legacy | Use instead |
|---|---|
| `--severity <level>` | `--fail-on <level>` |
| `--results-only` | `-q` |
| `--show-detected` | `--show files` |

## Environment variables

| Variable | Effect |
|---|---|
| `VULNETIX_SAST_WORKERS` | Rule evaluation workers. Default: one per core, at most 16. Fewer workers use less memory. |
| `VULNETIX_SAST_CACHE_DIR` | Where the result cache lives. Default `<user cache dir>/vulnetix/sast` (`~/.cache/vulnetix/sast` on Linux). |
| `VULNETIX_GRAPH_CACHE_DIR` | Where the parsed-file cache for graph insights lives. Default `<user cache dir>/vulnetix/graph`. |
| `VULNETIX_GRAPH_WORKERS` | Files parsed at once for graph insights. |
| `GOMEMLIMIT` | Go soft memory limit. When unset, the scan sets 75% of physical memory or of the cgroup's `memory.max`, whichever is lower. |
| `CI` | When set, legacy-flag notes are not printed. |

## Cache and performance

A rule that reads only one file's text is cached per file, keyed by path and the SHA-256 of the text. Any other rule is cached per group and evaluated again when the file list, the language directories or any file in the group's languages changes. The cache key includes the CLI build and every rule loaded, so a new release, an edited rule or a new `--rule` pack starts afresh. Rules that call nondeterministic OPA builtins (time, network, randomness, such as token expiry checks) are never cached. `nosec` comments, ignore rules and the organisation policy are applied on every run, cached or not. `--explain` never uses the cache.

When findings are reused, the progress line says so: `Reused results for 1247 unchanged file(s) and 38 rule group(s), evaluated 0 file(s) and 0 group(s)`.

Signed in, the scan also builds the repository's code graph (files, symbols, imports, calls) on a quarter of the cores and uploads it with the results, as `vulnetix analyze` does. An unauthenticated scan builds no graph.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Finished; no gate breached. Findings alone do not fail a run. |
| `1` | A `--fail-on` or quality gate breached, a `--jail` rule breached, or the run failed. |
| `2` | Bad arguments or configuration, before any work. |
| `3` | `--jail` ran but could not reach a verdict. |
