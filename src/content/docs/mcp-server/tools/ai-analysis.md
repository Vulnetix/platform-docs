---
title: AI analysis tools
description: The five tools that return VDB data plus an optional model-written analysis, when the analysis runs, what each analysis contains, and how prompt injection is contained.
order: 6
nav: AI analysis
sources:
  - mcp-server/src/tools/analysis.ts
  - mcp-server/src/ai/augment.ts
  - mcp-server/src/ai/gateway.ts
  - mcp-server/src/env.ts
  - mcp-server/src/shaping/filters/detection.ts
checked: [mcp-server@1725a04]
updated: 02 Nov 2026
---

Each of these tools fetches VDB data, returns it complete, and then may add an `analysis` object produced by a model through Cloudflare AI Gateway. The data half never depends on the model: if analysis is skipped or fails, the tool still answers.

## When analysis runs

Checked in this order. The first that applies sets `analysis: null` and an `analysisSkipped` reason.

| Check | Skip code in `_meta["vulnetix/ai"].skipped` |
|---|---|
| You passed `ai: false` | `disabled` |
| Deployment has `INFERENCE_MODE` other than `gateway` | `disabled` |
| `CF_AIG_TOKEN` or `CF_AIG_ACCOUNT_ID` is unset | `unconfigured` |
| `X-VDB-Plan` is not `pro`, `teams` or `enterprise` | `gated` |

When it runs, the payload gets `analysisNote` ("Derived by a language model from the data above, not retrieved from the VDB...") and `_meta["vulnetix/ai"]` records the model and token counts with `derived: true`. The hosted deployment uses `workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast`.

## The tools

| Tool | VDB data returned | `analysis` fields | Parameters that steer the analysis |
|---|---|---|---|
| `vulnetix_triage_reason` | `vulnerability`: the `vulnetix_vuln` summary | `priority` (`P1` act now to `P4` track only), `rationale`, `dominantFactors`, `wouldChangeIf` | `context`, for example `internal only, behind a WAF` |
| `vulnetix_secure_code_write` | `guidance`: CWE guidance for the advisory, or one CWE in full with `cweId` | `summary`, `unsafeExample`, `safeExample`, `reviewChecks` | `language`, `cweId` |
| `vulnetix_detection_rules` | `snort` (up to 10 rules), `yara` (up to 8), `nuclei` (up to 5 templates), whole rules | `deployFirst`, `falsePositiveRisks`, `coverageGaps` | `families`, `stack`, for example `Suricata 7 at the perimeter, no TLS inspection` |
| `vulnetix_exploit_test` | `nuclei` templates and a `safety` notice | `command`, `interpretation`, `prerequisites`, `destructive` | `target`, the authorised host to put in the command |
| `vulnetix_fix_plan` | `package`, `advisories` (the unshaped `GET /{ecosystem}/{package}` body), `versions` (the unshaped `/versions` body) | `recommendedVersion`, `manifestEdit`, `installCommand`, `verifyCommand`, `rollback`, `majorBump`, `risks` | `currentVersion`, `targetVersion` |

`vulnetix_fix_plan` requires `ecosystem`. It sends only coordinates; no file content reaches the server.

Detection rule text (`rawText`) requires Pro. Below Pro the rules and their metadata are returned with `rawText: null`, and the family section carries `gated: true` and a `note`.

> [!CAREFUL] `vulnetix_exploit_test` never runs anything
> It returns a command as text for a person to run against a system they are authorised to test. The server has no way to execute it.

## How upstream text is contained

CVE descriptions, advisory prose and proof-of-concept code are written by people outside your control. The gateway client applies four rules to every call:

1. Upstream data goes inside a delimited `<untrusted-data>` block, never into the instructions.
2. A fixed system prompt says the block is data to analyse, and that instructions inside it are ignored.
3. Output must be JSON matching a fixed schema per tool, so the model cannot add free-form prose.
4. Output never selects a tool, endpoint or parameter. It is added to a finished result.

Treat the analysis as interpretation and verify it before acting. See [Security model](/mcp-server/design/security/).

## Examples

```json
{ "identifier": "CVE-2021-44228", "context": "internal batch service, no untrusted input, Java 8, behind a WAF" }
```

```json
{ "identifier": "CVE-2021-44228", "cweId": "CWE-502", "language": "java" }
```

```json
{ "packageName": "log4j-core", "ecosystem": "maven", "currentVersion": "2.14.1" }
```
