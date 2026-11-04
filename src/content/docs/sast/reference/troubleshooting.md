---
title: SAST troubleshooting
nav: Troubleshooting
description: The errors and warnings vulnetix sast prints, the quiet failures that print nothing, their causes and the fix for each.
order: 50
sources: [cli/cmd/scan.go, cli/cmd/quality_gate_enforce.go, cli/cmd/sarif_persist.go, cli/internal/sast/loader.go, cli/internal/sast/registry.go, cli/internal/sast/engine.go, cli/internal/scanopts/surface.go, cli/internal/scanopts/failon.go, cli/cmd/exit_codes.go]
checked: [cli@v4.17.1]
updated: 04 Nov 2026
---

Use this page when `vulnetix sast` stops with an error, warns and carries on, or finishes with a result you do not trust. Errors print as `Error: <message>` on stderr. A bad flag exits `2` before any work; see [exit codes](/sast/reference/flags/#exit-codes).

## Starting a scan

| Symptom or message | Cause | Fix |
|---|---|---|
| `invalid rule reference "<value>": expected org/repo` | `--rule` was given a bare name, a URL or a path | Pass `org/repo`, for example `--rule Vulnetix/opa-gosec`. Put a different host in `--rule-registry`. See [Custom rules](/sast/guides/custom-rules/#loading-packs). |
| `--fail-on: unknown rule "<value>" (valid: low, medium, high, critical, ...)` | A misspelt severity, or a value from another command | Use `low`, `medium`, `high` or `critical`. The other listed values gate dependencies and never fire on SAST. |
| `cannot infer output format for "<path>": use .cdx.json for CycloneDX or .sarif for SARIF` | `-o` was given a file name with no recognised extension | End the name in `.sarif`, `.sarif.json` or `.report.json`. See [Output formats](/sast/reference/output-formats/). |
| `nothing to explain: no finding matches "<query>". ...` | `--explain` named a rule that did not fire, a file with no findings, or a rule from a pack that was not loaded | Repeat the `--path`, `--depth`, `--exclude` and `--rule` flags of the run you are explaining. See [Explain one rule or file](/sast/guides/reading-results/#explain-one-rule-or-file). |

## Rule packs

| Symptom or message | Cause | Fix |
|---|---|---|
| `Warning: rules registry not found: <org>/<repo>: <error>` | The pack could not be cloned: a typo, a private repository without a token, or a network block | The scan continues without the pack. Check the name, or put a short-lived read-only token in `--rule-registry`. See [Private repositories](/sast/guides/custom-rules/#loading-packs). |
| Pack loaded, but none of its rules ran | `vulnetix sast` runs only rules of kind `sast`; a rule with a deeper package (`vulnetix.rules.a.b`) or no `id` produces nothing | Check `kind` and the [module contract](/sast/guides/custom-rules/#module-contract). IaC and container rules run under their own commands. |
| `warning: SAST evaluation failed: <error>` | A rule in a loaded pack does not parse or compile (`parse <file>: ...`, `compile: ...`), so no rule was evaluated | Fix the module, or test it with `opa eval` first; see [Testing a rule](/sast/guides/custom-rules/#testing-a-rule). A pack cannot import `data.vulnetix.helpers`. |

> [!CAREFUL] Pack and engine warnings do not fail the run
> A pack that fails to clone, and a pack that fails to compile, both print a warning and can still exit `0`. In CI, check the `Imported` line, or run with `--disable-default-rules` so a missing pack shows up as zero rules.

## Results look wrong

| Symptom or message | Cause | Fix |
|---|---|---|
| A file you expected is never reported | It is deeper than `--depth` (default `3`, counting the file), gitignored, over 1 MiB, binary, or under an always-skipped directory | Pass `--depth 10` or more. See [What is read](/sast/#what-is-read) and `--include-ignored`. |
| `N file(s) were not content-scanned (over the 1 MiB text cap, unreadable, or binary)` | A SARIF notification: those files were seen by no rule | Read the notifications in `runs[0].invocations[0]` before trusting a clean run. See [Output formats](/sast/reference/output-formats/#runs0invocations0toolexecutionnotifications). |
| A rule is silenced on lines with no `nosec` comment | A line-level `nosec` is recorded as a suppression and matched by rule and file on later runs | Name the rule in the comment and check the file. See [Suppressing findings](/sast/guides/suppressing-findings/#nosec-comments). |
| `json-report` output has no findings | The JSON report is the dependency report | Use SARIF (`-o json-sarif` or `-o <file>.sarif`). |

## In CI

| Symptom or message | Cause | Fix |
|---|---|---|
| The SARIF upload step fails on a clean run | `.vulnetix/sast.sarif` is deleted when there are no findings | Write `-o vulnetix-sast.sarif`, which is written on every run. See [Quickstart](/sast/get-started/quickstart/#5-upload-sarif-to-github-code-scanning). |
| The build fails on high findings although you passed `--fail-on critical` | The organisation's quality gate replaced the flag's severity | Run with `-v` to see `org policy applied: --severity <level>`. See [When to fail](/sast/reference/flags/#when-to-fail). |
| A high finding in a test file fails the gate | IN TESTS and VENDORED change only the terminal view | Suppress it, or `--exclude` the directory. See [Suppressing findings](/sast/guides/suppressing-findings/). |
| `/v2/cli.sast chunk 1/1 submit failed: <error>` | The upload was rejected or could not be sent | The scan result and exit code stand. Check the credential with `vulnetix auth verify`; see [Troubleshooting authentication](/cli/authentication/troubleshooting/). |

## Still stuck

Collect the CLI version (`vulnetix version`), the exact command, the output of the same command with `-v`, the `toolExecutionNotifications` from `.vulnetix/sast.sarif` or your `-o` file, and `.vulnetix/memory.yaml` if a suppression is involved. For a `--rule` pack, include the `Imported` line and the pack's `org/repo`. For sign-in and upload errors, start with [Troubleshooting authentication](/cli/authentication/troubleshooting/).
