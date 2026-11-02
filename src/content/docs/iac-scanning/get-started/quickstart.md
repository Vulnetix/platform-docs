---
title: Quickstart
description: Scan a Terraform repository for misconfigurations, add a rule pack, and fail a CI job on high findings.
order: 2
sources: [cli/cmd/specialized_scans.go, cli/cmd/scan.go, cli/internal/sast/rules/vnx-tf-001.rego, cli/internal/sast/rules/vnx-tf-002.rego, cli/internal/scanopts/failon.go]
checked: [cli@2449840]
updated: 02 Nov 2026
---

You need the Vulnetix CLI on your `PATH` ([installing the CLI](/cli/get-started/install/)). No sign-in is needed.

## 1. Scan

From the root of the Terraform code:

```bash
vulnetix iac --depth 10
```

Given this file:

```hcl
# infra/storage/main.tf
resource "aws_s3_bucket_acl" "logs" {
  bucket = "example-logs"
  acl    = "public-read"
}

resource "aws_security_group" "admin" {
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

the report has one row per resource:

```text
 ✖ IAC 2 problems on 2 resources in 1 file          2 need action

 NEEDS ACTION · 2 problems on 2 resources
 ────────────────────────────────────────────────────────────────────────────────
 aws_s3_bucket_acl.logs  infra/storage/main.tf:1                       1 problem
  ● HIGH      Terraform S3 bucket or object with a public ACL   :3    VNX-TF-001
 aws_security_group.admin  infra/storage/main.tf:6                     1 problem
  ● HIGH      Terraform AWS security group with unrestricted …  :11   VNX-TF-002
```

Show every problem in one file with its lines:

```bash
vulnetix iac --depth 10 --explain infra/storage/main.tf
```

## 2. Add a rule pack

The built-in rules cover seven AWS checks. Add the Regula and Checkmarx KICS packs for several hundred more Terraform, CloudFormation, ARM and Kubernetes checks:

```bash
vulnetix iac --depth 10 \
  --rule Vulnetix/opa-fugue-regula \
  --rule Vulnetix/opa-checkmarx-kics
```

Several packs often flag the same line for the same weakness; the report folds those into one problem and lists every rule that raised it. See [Rule packs](/iac-scanning/guides/rule-packs/).

## 3. Fail the build

```bash
vulnetix iac --depth 10 --fail-on high -o iac.sarif
```

The run exits `1` when any IaC finding is `high` or `critical`. A GitHub Actions step:

```yaml
- name: IaC scan
  run: |
    curl -fsSL https://cli.vulnetix.com/install.sh | sh
    vulnetix iac --depth 10 --rule Vulnetix/opa-fugue-regula --fail-on high -o iac.sarif
```

## 4. Accept a finding

For a bucket that is public on purpose, put a `nosec` comment on the reported line:

```hcl
resource "aws_s3_bucket_acl" "site" {
  bucket = "example-public-site"
  acl    = "public-read" # nosec VNX-TF-001 static website
}
```

[Suppressing findings](/iac-scanning/guides/suppression/) covers organisation-wide ignore rules too.
