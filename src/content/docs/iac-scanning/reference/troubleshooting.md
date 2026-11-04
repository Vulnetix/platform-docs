---
title: IaC scanning troubleshooting
nav: Troubleshooting
description: The errors and warnings vulnetix iac prints, the misconfigurations it quietly does not report, their causes and the fix for each.
order: 50
sources: [cli/cmd/scan.go, cli/cmd/quality_gate_enforce.go, cli/cmd/sarif_persist.go, cli/internal/sast/loader.go, cli/internal/sast/registry.go, cli/internal/sast/kinds.go, cli/internal/scanopts/surface.go, cli/internal/scanopts/failon.go]
checked: [cli@v4.17.1]
updated: 04 Nov 2026
---

Use this page when `vulnetix iac` stops with an error, or reports less than you expect. Errors print as `Error: <message>` on stderr. [Exit codes](/iac-scanning/reference/output/#exit-codes) are on the output page.

## Starting a scan

| Symptom or message | Cause | Fix |
|---|---|---|
| `invalid rule reference "<value>": expected org/repo` | `--rule` was given a URL or a bare name | Pass `org/repo`, for example `--rule Vulnetix/opa-fugue-regula`. Set another host with `--rule-registry`. |
| `--fail-on: unknown rule "<value>" (valid: low, medium, high, critical, ...)` | A misspelt severity | Use `low`, `medium`, `high` or `critical`. |
| `cannot infer output format for "<path>": use .cdx.json for CycloneDX or .sarif for SARIF` | `-o` was given a file name with no recognised extension | End it in `.sarif`, `.sarif.json` or `.report.json`. See [Output](/iac-scanning/reference/output/). |

## Rule packs

| Symptom or message | Cause | Fix |
|---|---|---|
| `Warning: rules registry not found: <org>/<repo>: <error>` | The pack could not be cloned | The scan continues without it and can exit `0`. Check the name, access and network. See [How packs are fetched](/iac-scanning/guides/rule-packs/#how-packs-are-fetched). |
| A pack's Dockerfile checks do not run under `vulnetix containers` | The KICS and Trivy Dockerfile rules are kind `iac` | Run them with `vulnetix iac --rule ...`. See [Rule packs](/iac-scanning/guides/rule-packs/). |
| A pack's `sast`, `container` or `api` rules do not run | `vulnetix iac` keeps only rules of kind `iac` | Use the matching command, or `vulnetix scan --rule`. See [The kind lock](/iac-scanning/guides/rule-packs/#the-kind-lock). |

> [!CAREFUL] A missing pack does not fail the build
> In CI, check for the `Imported N rules from ...` line, or run with `--disable-default-rules` so a pack that did not load shows up as zero rules.

## Results look wrong

| Symptom or message | Cause | Fix |
|---|---|---|
| Nothing reported for Kubernetes, CloudFormation, ARM or Ansible | The seven built-in rules are Terraform on AWS only | Add a rule pack. See [Rule packs](/iac-scanning/guides/rule-packs/#packs-vulnetix-publishes). |
| A module under `infra/modules/<name>/main.tf` is not checked | It is at depth 4; the default `--depth` is `3` | Pass `--depth 10` or more. |
| A misconfiguration set through a variable, local or module input is not reported | The rules read literals, not evaluated HCL | Expected. See [Overview](/iac-scanning/). |
| Hard-coded AWS keys in Terraform are not reported | `VNX-TF-008` is a `secrets` rule | Run [`vulnetix secrets`](/secrets/). |
| `nosec` on the resource does not silence a finding | The comment is not on the line the rule reports | Check the line in the report first. See [`nosec` comments](/iac-scanning/guides/suppression/#nosec-comments). |
| An ignore rule with `--line` silences the whole file | IaC findings are matched without a line | Use a `nosec` comment for one resource. |

## In CI

| Symptom or message | Cause | Fix |
|---|---|---|
| The build fails at a different severity from `--fail-on` | The organisation's quality gate replaced it | Run with `-v` to see `org policy applied: --severity <level>`. |
| `.vulnetix/sast.sarif` holds SAST or secrets results | `sast`, `secrets` and `iac` write the same path | Pass `-o iac.sarif`. |
| `/v2/cli.iac chunk 1/1 submit failed: <error>` | The upload failed | The exit code is unchanged. Check the credential with `vulnetix auth verify`. |

## Still stuck

Collect the CLI version (`vulnetix version`), the exact command including every `--rule`, its output with `-v` (with the `Imported` line), the SARIF from `.vulnetix/sast.sarif` or your `-o` file, and `.vulnetix/memory.yaml` if a suppression is involved. For sign-in and upload errors, start with [Troubleshooting authentication](/cli/authentication/troubleshooting/).
