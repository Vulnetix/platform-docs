---
title: Suppressing findings
nav: Suppression
description: Exclude paths, mark a Terraform line with nosec, or record an ignore rule your organisation shares, for IaC findings.
order: 3
sources: [cli/internal/sast/nosec.go, cli/cmd/suppress.go, cli/cmd/suppress_filter.go, cli/internal/suppress/suppress.go, cli/cmd/scan.go]
checked: [cli@2449840]
updated: 02 Nov 2026
---

Three methods, applied in this order before the report, SARIF, upload and gates:

| Method | Scope | Where it lives |
|---|---|---|
| Path exclusion | Files never read | `--exclude`, `.gitignore` |
| `nosec` comment | One line, or one file | The source file |
| Ignore rule | Rule, file or both, in one repository | `.vulnetix/memory.yaml` and, when authenticated, your Vulnetix organisation |

## Exclude paths

```bash
vulnetix iac --exclude '.terraform/**' --exclude 'examples/**'
```

`--exclude` is a repeatable glob relative to the scan root. Paths your `.gitignore` matches are skipped unless you pass `--iac-include-ignored`. Provider and module downloads under `.terraform/` are usually gitignored already.

## `nosec` comments

`nosec` is recognised in a `#`, `//`, `--` or `;` comment anywhere on the reported line, so both HCL comment styles work.

| Comment | Effect |
|---|---|
| `# nosec` on the finding's line | Drops every finding on that line |
| `# nosec VNX-TF-002,KICS-TF-SG-001` on the line | Drops only those rules on that line |
| `# nosec` on line 1 | Drops every finding in the file |
| `# nosec VNX-TF-006` on line 1 | Drops that rule everywhere in the file |

Rule ids are case-insensitive and separated by commas or spaces.

```hcl
resource "aws_security_group" "bastion" {
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # nosec VNX-TF-002
  }
}
```

The finding is reported on the line the rule names. For `VNX-TF-002` that is the `cidr_blocks` line; for a rule that reports a missing setting (`VNX-TF-006` on an instance with no `metadata_options` block) it is the resource's header line. Check the line in the report before adding the comment.

Each suppressed finding is recorded in `.vulnetix/memory.yaml` and, when authenticated, sent to Vulnetix as a suppression of type `nosec`.

## Ignore rules

```bash
vulnetix ignore add --category iac --rule VNX-TF-001 --file infra/site/bucket.tf \
  --type risk_accepted --reason "public static website bucket"
```

| Flag | Value |
|---|---|
| `--category` | `iac`. Empty matches every category. |
| `--rule` | Rule id, from the built-in set or a pack (`FUGUE-ARM-AS-05`). |
| `--file` | Path relative to the repository; also matches any path ending in `/<file>`. |
| `--type` | `false_positive`, `wont_fix`, `risk_accepted`, `mitigated`, `deferred`, `rego_rule` or `nosec`. Default `rego_rule` with `--rule`, else `risk_accepted`. |
| `--reason` | Free text. |
| `--expires-in` | Days until it stops applying; `0` is never. |

At least one of `--rule`, `--finding`, `--value` or `--file` is required. The rule is written to `.vulnetix/memory.yaml` and, when authenticated, saved to your organisation with the repository and branch. `vulnetix ignore list`, `vulnetix ignore remove` and `vulnetix ignore sync` manage them.

> [!CAREFUL] Line numbers do not narrow IaC rules
> The matcher is given no line for IaC findings, so `--line` and `--line-range` are not applied. A rule with `--file` covers the whole file. To accept one resource, use a `nosec` comment on its line.

## Test code

`--suppress-test-code` drops findings in files attributed to the project's test suite. Without it they are listed under IN TESTS and still count for the SARIF file, the upload and `--fail-on`.
