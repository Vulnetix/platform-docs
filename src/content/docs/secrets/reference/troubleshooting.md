---
title: Secrets troubleshooting
nav: Troubleshooting
description: The errors and warnings vulnetix secrets prints, the credentials it quietly misses, their causes and the fix for each.
order: 50
sources: [cli/cmd/scan.go, cli/cmd/quality_gate_enforce.go, cli/cmd/sarif_persist.go, cli/internal/sast/engine.go, cli/internal/sast/loader.go, cli/internal/sast/registry.go, cli/internal/scanopts/surface.go, cli/internal/scanopts/failon.go]
checked: [cli@v4.17.1]
updated: 04 Nov 2026
---

Use this page when `vulnetix secrets` stops with an error, or finishes clean when you know a credential is there. Errors print as `Error: <message>` on stderr. [Exit codes](/secrets/reference/output/#exit-codes) are on the output page.

## Starting a scan

| Symptom or message | Cause | Fix |
|---|---|---|
| `--fail-on: unknown rule "<value>" (valid: low, medium, high, critical, ...)` | A misspelt severity | Use `low`, `medium`, `high` or `critical`. The dependency values never fire on secrets. |
| `cannot infer output format for "<path>": use .cdx.json for CycloneDX or .sarif for SARIF` | `-o` was given a file name with no recognised extension | End it in `.sarif`, `.sarif.json` or `.report.json`. No SBOM is written by this command. See [Output](/secrets/reference/output/). |

## A credential was not found

| Symptom or message | Cause | Fix |
|---|---|---|
| A key in a deep directory is missed | `--depth` defaults to `3`; `a/b/c/creds.json` is never read | Pass `--depth 10` or more. The history pass is not depth-limited. |
| A key in `.env` is missed | The file is gitignored, so it is skipped and is not in the history either | Pass `--secrets-include-ignored` on a developer machine. See [The working tree](/secrets/guides/what-gets-scanned/#the-working-tree). |
| A key in a test file, `fixtures/` or `testdata/` is missed | The rules skip test file names and those directories by design | See the [skip list](/secrets/guides/what-gets-scanned/#the-working-tree). |
| A key that looks like `...EXAMPLE` or contains `sample` is missed | Placeholder values are dropped before reporting | Expected. See [How a rule decides](/secrets/guides/what-gets-scanned/#how-a-rule-decides). |
| `N file(s) were not content-scanned (over the 1 MiB text cap, unreadable, or binary)` | Those files were over 1 MiB or unreadable | Read the notice before trusting a clean run. |
| `git history was not scanned: <reason>` | The object database could not be read | The working tree was still scanned. Check the clone is complete. |

## Results look wrong

| Symptom or message | Cause | Fix |
|---|---|---|
| A finding under `__git_history__/`, `__binary_strings__/`, `__exif__/` or `__k8s_secret__/` cannot be silenced with `nosec` | Those paths have no source line to carry a comment | Use `vulnetix ignore add --category secrets --file <path>`. See [Suppressing findings](/secrets/guides/suppression/#nosec-comments). |
| An ignore rule with `--line` silences the whole file | Secrets findings are matched without a line | Use a `nosec` comment for one line. |
| `.vulnetix/sast.sarif` holds SAST or IaC results | `sast`, `secrets` and `iac` write the same path | Pass `-o secrets.sarif`. |

## In CI

| Symptom or message | Cause | Fix |
|---|---|---|
| The history pass finds nothing in GitHub Actions | `actions/checkout` fetches one commit by default | Set `fetch-depth: 0`, or a depth at least `--git-history-max-commits`. See [Quickstart](/secrets/get-started/quickstart/#3-fail-the-build). |
| The build fails at a different severity from `--fail-on` | The organisation's quality gate replaced it | Run with `-v` to see `org policy applied: --severity <level>`. See [When to fail](/secrets/reference/flags/#when-to-fail). |
| `/v2/cli.secrets chunk 1/1 submit failed: <error>` | The upload failed | The exit code is unchanged. Check the credential with `vulnetix auth verify`. |
| Credential lines appear in the uploaded snapshot | The default `--snippet-context` reads the line from disk | Run authenticated scans with `--snippet-context 0`. See [What is uploaded](/secrets/reference/output/#what-is-uploaded). |

## Still stuck

Collect the CLI version (`vulnetix version`), the exact command, its output with `-v`, the notifications in `.vulnetix/sast.sarif` or your `-o` file, and `.vulnetix/memory.yaml` if a suppression is involved. Do not attach a SARIF file without checking it first: some rules copy the credential line unmasked. For sign-in and upload errors, start with [Troubleshooting authentication](/cli/authentication/troubleshooting/).
