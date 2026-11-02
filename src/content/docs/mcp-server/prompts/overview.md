---
title: Prompts
description: The 18 workflow prompts generated from the Pix skills, their arguments, chains and output budgets, and how to invoke them in each client.
order: 1
nav: Overview
sources:
  - mcp-server/src/prompts/register.ts
  - mcp-server/src/prompts/generated.ts
  - mcp-server/scripts/generate-prompts.mjs
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Tools answer one question. Prompts hand your agent a whole procedure. The server serves the 18 Pix skills as MCP prompts, generated from each skill's `SKILL.md` by `scripts/generate-prompts.mjs`. CI runs `yarn prompts:check` and fails when the generated file drifts from the skills.

Every prompt needs your machine: it reads or writes files, runs a package manager or calls a scanner. The server has no filesystem, so each prompt body starts with this notice and your agent runs the steps with the [Vulnetix CLI](/cli/):

```text
> **This workflow needs your local machine.** It reads or writes files in the repo,
> runs package managers, or shells out to scanners. The MCP server has no filesystem,
> so run these steps yourself with the Vulnetix CLI. Install it with:
> `curl -fsSL https://cli.vulnetix.com/install.sh | sh`
```

Lookups (a CVE, a KEV check, a package's advisories) are tools only, so one question has one answer.

## The prompts

| Prompt | Skill | Argument shape | Chains to | Budget |
|---|---|---|---|---|
| `vulnetix_container_scan` | `container-scan` | `[--paths Dockerfile1 Dockerfile2] [--image registry/img:tag]` | `verify-fix` | short |
| `vulnetix_dashboard` | `dashboard` | none | `repo-impact` | medium |
| `vulnetix_dep_resolve` | `dep-resolve` | `<package-name> [--target-version X]` | `dependency-choice`, `fix`, `verify-fix` | medium |
| `vulnetix_dependency_choice` | `dependency-choice` | `<capability or package name> [--ecosystem npm\|pypi\|...]` | `typosquat-check`, `fix` | medium |
| `vulnetix_detection_rules` | `detection-rules` | `<vuln-id>` | `exploit-test`, `verify-fix` | short |
| `vulnetix_eol_check` | `eol-check` | `[--strict]` | `dep-resolve`, `fix` | short |
| `vulnetix_exploit_test` | `exploit-test` | `<vuln-id> [--target URL]` | `verify-fix` | short |
| `vulnetix_fix` | `fix` | `<vuln-id>` | `verify-fix`, `vex-publish` | medium |
| `vulnetix_iac_scan` | `iac-scan` | `[--paths file1 file2]` | `verify-fix` | short |
| `vulnetix_license_check` | `license-check` | `[--policy permissive\|copyleft-aware\|strict]` | none | short |
| `vulnetix_repo_impact` | `repo-impact` | `<CVE-…\|GHSA-…>` | `fix`, `dependency-choice` | short |
| `vulnetix_sast_scan` | `sast-scan` | `[--rule-id ID] [--paths file1 file2] [--baseline]` | `secure-code-write`, `verify-fix` | medium |
| `vulnetix_sbom_generate` | `sbom-generate` | `[--format cyclonedx\|spdx\|both] [--sign] [--output PATH]` | `vex-publish` | short |
| `vulnetix_secret_scan` | `secret-scan` | `[--paths file1 file2] [--staged-only]` | `verify-fix` | short |
| `vulnetix_secure_code_write` | `secure-code-write` | `[<file-path>] \| [<topic: auth\|crypto\|sql\|xss\|deser>]` | `sast-scan` | medium |
| `vulnetix_typosquat_check` | `typosquat-check` | `[<package-name>] \| [--installed]` | `dependency-choice` | short |
| `vulnetix_verify_fix` | `verify-fix` | `<vuln-id>` | `vex-publish` | short |
| `vulnetix_vex_publish` | `vex-publish` | `[--format openvex\|cyclonedx] [--upload]` | none | short |

`vulnetix_secure_code_write`, `vulnetix_detection_rules` and `vulnetix_exploit_test` are also tool names. Prompts and tools are separate namespaces in MCP: the tool returns data, the prompt is the local procedure that uses it.

## Arguments

A prompt with an argument shape takes one optional string, `arguments`. `prompts/get` with no arguments is valid; the workflow asks for what it needs. When you pass a value, it is appended to the body as `Arguments for this run: ...`.

## Metadata

| `_meta` key | Meaning |
|---|---|
| `vulnetix/skill` | Source skill directory |
| `vulnetix/chain` | Skills that usually follow |
| `vulnetix/outputBudget` | `short` or `medium`: how much output the workflow aims for |
| `vulnetix/localExecution` | `true` for every prompt |

## Invoking a prompt

| Client | How |
|---|---|
| Claude Code | `/mcp__vulnetix__vulnetix_repo_impact CVE-2021-44228` |
| VS Code | `/mcp.vulnetix.vulnetix_repo_impact`, then fill the argument |
| Claude Desktop | The + menu in the message box, under the server. The steps cannot run there. |
| Any other client | Ask by name: `Use the vulnetix_repo_impact workflow for CVE-2021-44228.` The agent fetches it with `prompts/get`. |

## Related

- [Skills](/mcp-server/prompts/skills/): the same 18 workflows as Agent Skills, with their supporting files.
- [Local workflows](/mcp-server/prompts/local-workflows/): what each prompt needs on your machine.
