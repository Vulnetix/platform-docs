---
title: Exit codes
description: Every process exit code the vulnetix binary uses, which commands produce each one, and how to branch on them in a pipeline.
order: 3
sources: [cli/cmd/exit_codes.go, cli/main.go, cli/cmd/root.go, cli/cmd/jail.go, cli/cmd/scan_jail.go, cli/cmd/lsp.go, cli/cmd/gha_analysis.go]
checked: [cli@24498404a]
updated: 02 Nov 2026
---

The codes are a contract: what each one means will not change within a major version.

| Code | Name | Meaning | Produced by |
|---|---|---|---|
| `0` | `ExitOK` | Succeeded. Findings without a gate still exit `0`. | Every command |
| `1` | `ExitFailure` | The command failed, or a gate breached | Every command: `--fail-on` and the superseded gate flags, `gha <posture> --fail-on`, `jail` and `scan --jail` breaches, `auth verify` failures, `upload` and `gha upload` failures, unknown flags and bad flag values |
| `2` | `ExitUsage` | A local argument or configuration error before any work | `jail` (bad duration, unwritable artefact path, no credentials) and `config plan`, `config apply` and `config export` (bad arguments). Usage errors in every other command exit `1`. |
| `3` | `ExitIndeterminate` | The gate ran but could not decide: the backend state it needs is stale or missing. Not a pass and not a breach. | `jail` and `scan --jail`, when no rule breached but at least one could not be evaluated against current scan coverage; `config plan` and `config apply`, when the plan is blocked by drift protection or policy (`ExitPlanBlocked`). See [config plan](/platform-iac/cli/plan/#exit-codes). |
| `70` | | The language server panicked; a crash note was written | `vulnetix lsp` |

A breach outranks an undecided rule: when one rule breaches and another cannot be evaluated, the exit is `1`, not `3`.

> [!WHY] Why 3 is separate from 1
> A `1` is a fact about the code and goes to a developer. A `3` is a fact about the pipeline (a scan the jail policy relies on did not run or is stale) and goes to whoever owns the CI configuration. Folding it into `1` would send the wrong person to fix it.

## Messages

Every non-zero exit prints `Error: <message>` on stderr, except where the command has already printed its verdict: a quality-gate breach from `scan`, a licence severity breach, and a jail verdict. `jail` usage errors keep the `Error:` prefix.

## In a pipeline

```sh
set +e
vulnetix scan --fail-on high --jail
code=$?
set -e
case "$code" in
  0) echo "passed" ;;
  1) echo "policy breached or the scan failed"; exit 1 ;;
  3) echo "jail could not decide: check that the required scans ran"; exit 1 ;;
  *) echo "unexpected exit $code"; exit "$code" ;;
esac
```

GitHub Actions: `continue-on-error: true` on the step, then read `steps.<id>.outcome`. GitLab CI: `allow_failure: { exit_codes: [3] }` lets an undecided jail gate warn instead of failing the job.
