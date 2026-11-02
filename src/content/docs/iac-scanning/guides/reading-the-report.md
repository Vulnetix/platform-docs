---
title: Reading the report
description: How the terminal report groups IaC findings by resource, folds duplicate findings from several rule packs, and what --explain prints.
order: 2
sources: [cli/internal/report/code_resources.go, cli/internal/report/code.go, cli/cmd/code_enrich.go]
checked: [cli@2449840]
updated: 02 Nov 2026
---

The report is organised by **resource**, the thing you change in the file: `aws_s3_bucket.logs`, `Deployment/api`, `module.net`. The resource is read from the file after the scan:

| File | Resource name |
|---|---|
| Terraform | The nearest `resource`, `data` or `module` block above the finding's line, as `<type>.<name>` or `module.<name>` |
| Kubernetes YAML | `kind/metadata.name` of the YAML document holding the line |
| Docker Compose | The service the line belongs to |
| Anything else | The file path |

```text
 ✖ IAC 7 problems on 3 resources in 4 files          4 need action · 3 can wait · 1 in tests
   9 findings · 2 folded as the same problem · 774 of 2865 rules ran

 NEEDS ACTION · 4 problems on 3 resources
 ────────────────────────────────────────────────────────────────────────────────────────────────
 aws_s3_bucket.logs  infra/storage.tf:12                                               2 problems
  ● HIGH      No server-side encryption        :12    TRIVY-S3-ENC
  ● HIGH      Bucket is publicly readable      :15    VNX-TF-001 · KICS-S3-ACL · REGULA-S3-1
```

## Folding

Several rule packs often flag the same line. Two findings are one problem when they are on the same line of the same file and name the same set of CWEs; the row lists every rule that raised it. A finding with no CWE never folds, and a different weakness on the same line stays its own problem. `-v` folds nothing and shows every finding with its rule id.

The headline counts findings and problems separately (`9 findings · 2 folded as the same problem`) so you can see how much the packs overlap.

## Groups

| Group | What is in it |
|---|---|
| NEEDS ACTION | Resources with critical or high problems in production code. |
| CAN WAIT | Medium and low problems, one row per problem, with how many resources it is on. Seven rows are shown unless `-v`. |
| IN TESTS | Critical and high problems in test code, as files with a count. `--show tests` ranks them. |
| VENDORED | The same for `third_party/`, `vendor/` and similar trees. |

## `--explain`

```bash
vulnetix iac --explain infra/storage.tf    # every problem in the file, with its lines
vulnetix iac --explain VNX-TF-002          # the rule and every place it fires
```

An `--explain` run writes nothing and uploads nothing.

## Terminal only

Folding and grouping change only what is printed. SARIF, the JSON report, uploads and gates see every finding at its own severity. `--min-severity`, `--show`, `-q`, `--view`, `--color`, `--ascii` and `--width` behave as for every scanner; see [Flags](/iac-scanning/reference/flags/#what-to-show).
