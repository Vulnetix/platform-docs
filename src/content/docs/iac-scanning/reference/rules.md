---
title: Built-in IaC rules
nav: Rules
description: The seven built-in rules of kind iac, with the resources each one reads, what it reports and what it deliberately leaves alone.
order: 2
sources: [cli/internal/sast/rules/vnx-tf-001.rego, cli/internal/sast/rules/vnx-tf-002.rego, cli/internal/sast/rules/vnx-tf-003.rego, cli/internal/sast/rules/vnx-tf-004.rego, cli/internal/sast/rules/vnx-tf-005.rego, cli/internal/sast/rules/vnx-tf-006.rego, cli/internal/sast/rules/vnx-tf-007.rego, cli/internal/sast/rules/vnx-tf-008.rego]
checked: [cli@2449840]
updated: 02 Nov 2026
---

Seven rules declare `"kind": "iac"`. All are Terraform rules that read `.tf` and `.tofu` files, and all are severity `high`, SARIF level `error`. Each rule's own page has its full metadata (CWE, CAPEC, ATT&CK, CWSS vector).

| Rule | Name | CWE | Reports |
|---|---|---|---|
| [`VNX-TF-001`](/sast/rules/vnx-tf-001/) | S3 bucket or object with a public ACL | 200 | `acl = "public-read"`, `"public-read-write"` or `"authenticated-read"` in `aws_s3_bucket`, `aws_s3_bucket_acl`, `aws_s3_object`, `aws_s3_bucket_object`, `alicloud_oss_bucket` or an S3 module; a grant to the `AllUsers` or `AuthenticatedUsers` group. |
| [`VNX-TF-002`](/sast/rules/vnx-tf-002/) | Security group with unrestricted ingress | 1220 | `0.0.0.0/0` or `::/0` in an `ingress` block of `aws_security_group`, an `aws_security_group_rule` of type `ingress`, `cidr_ipv4`/`cidr_ipv6` of `aws_vpc_security_group_ingress_rule`, and the terraform-aws-modules security-group module's ingress inputs. |
| [`VNX-TF-003`](/sast/rules/vnx-tf-003/) | RDS instance publicly accessible | 1220 | `publicly_accessible = true` in `aws_db_instance`, `aws_rds_cluster_instance`, `aws_redshift_cluster`, `aws_redshiftserverless_workgroup`, `aws_dms_replication_instance`, or a module whose source names `rds`, `redshift` or `dms`. |
| [`VNX-TF-004`](/sast/rules/vnx-tf-004/) | IAM policy with wildcard Action | 269 | `Action = "*"` (or a list containing `"*"`) in a statement whose effect is `Allow` or unset: in `jsonencode()`, heredoc JSON, escaped one-line JSON, `aws_iam_policy_document` `actions`, or an `azurerm_role_definition` permissions block. |
| [`VNX-TF-005`](/sast/rules/vnx-tf-005/) | EBS volume unencrypted | 311 | `encrypted = false` in `aws_ebs_volume`, `aws_ebs_snapshot_copy`, an instance's `root_block_device` or `ebs_block_device`, or a launch template's `ebs` block; an `aws_ebs_volume` that sets neither `encrypted` nor `snapshot_id`. |
| [`VNX-TF-006`](/sast/rules/vnx-tf-006/) | EC2 instance metadata service v1 enabled | 918 | `http_tokens = "optional"` in `metadata_options` of `aws_instance`, `aws_spot_instance_request`, `aws_launch_template` or `aws_launch_configuration` (or the matching terraform-aws-modules input); a `metadata_options` block with no `http_tokens`; one of those resources with no `metadata_options` at all. |
| [`VNX-TF-007`](/sast/rules/vnx-tf-007/) | EKS cluster public API endpoint enabled | 200 | An `aws_eks_cluster` whose endpoint is public (`endpoint_public_access = true`, or unset, which is the AWS default) with no `public_access_cidrs` or with `0.0.0.0/0` in them; an EKS module with public access on and no restricting CIDR list. |

## What each rule leaves alone

The rules are written to report only what is certain from the file.

| Rule | Not reported |
|---|---|
| `VNX-TF-001` | `private`, `log-delivery-write` and other canned ACLs; an ACL from a variable; grants to canonical users or the LogDelivery group; a bucket whose `aws_s3_bucket_public_access_block` (in any file) sets `block_public_acls` or `ignore_public_acls`; any bucket when an `aws_s3_account_public_access_block` does; comments. |
| `VNX-TF-002` | Egress; routes and network ACLs; restricted or variable CIDRs; security-group-to-security-group rules; ingress limited to exactly port 80 or exactly port 443 (a public web listener). Any other port, a range or all protocols is reported. |
| `VNX-TF-003` | `publicly_accessible = false`; a value from a variable, even one defaulting to `true`; the attribute on MQ brokers and Neptune. |
| `VNX-TF-004` | `Effect = "Deny"`; service-scoped wildcards (`"s3:*"`, `"ec2:Describe*"`); `NotAction`; principals and resources of `"*"`. |
| `VNX-TF-005` | `encrypted = true`; a variable; a volume restored from a snapshot; every volume when the project declares `aws_ebs_encryption_by_default` with `enabled = true`; database `storage_encrypted`; EFS. |
| `VNX-TF-006` | `http_tokens = "required"`; a variable; `http_endpoint = "disabled"` in the same block; an `aws_instance` using a `launch_template`; every instance when the project declares `aws_ec2_instance_metadata_defaults` with `http_tokens = "required"`. |
| `VNX-TF-007` | `endpoint_public_access = false`; a public endpoint restricted to specific CIDRs or a variable list; a module left at its default (off). |

## VNX-TF-008 is a secrets rule

[`VNX-TF-008`](/sast/rules/vnx-tf-008/) (literal AWS access key pair in `.tf`, `.tofu` or `.tfvars`) declares kind `secrets`. It runs under `vulnetix secrets` and `vulnetix scan`, not under `vulnetix iac`. See [Secrets rules](/secrets/reference/rules/).

## Listing the rules

`vulnetix iac --list-default-rules` prints the built-in rule table and exits. It lists every built-in rule of every kind (about 1,900), not only these seven.
