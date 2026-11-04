---
title: "VNX-TF-003: Terraform AWS RDS instance publicly accessible"
nav: "VNX-TF-003"
description: "Detect AWS database instances in Terraform (aws_db_instance, aws_rds_cluster_instance, aws_redshift_cluster, aws_redshiftserverless_workgroup, aws_dms_replication_instance or an RDS module) configured with publicly_accessible = true."
order: 983
sources: ["cli/internal/sast/rules/vnx-tf-003.rego", "cli/internal/sast/docs/vnx-tf-003.md"]
checked: ["cli@1700795"]
updated: "05 Nov 2026"
generated: true
---

| Field | Value |
|---|---|
| Rule ID | `VNX-TF-003` |
| Severity | High |
| SARIF level | `error` |
| Kind | `iac` |
| Languages | Terraform |
| CWE | [CWE-1220](https://cwe.mitre.org/data/definitions/1220.html) |
| CAPEC | [CAPEC-1](https://capec.mitre.org/data/definitions/1.html) |
| ATT&CK | [T1190](https://attack.mitre.org/techniques/T1190/) |
| CWSS vector | `CWSS:1.0/TI:H/AP:RU/AL:S/IC:N/FC:LT/RP:RU/RL:S/AV:L/AS:N/IN:A/SC:A/BI:H/DI:H/EX:H/EC:N/P:H` |
| Tags | `rds` `database` `public-access` `aws` `terraform` |
| Source | [`internal/sast/rules/vnx-tf-003.rego`](https://github.com/Vulnetix/cli/blob/main/internal/sast/rules/vnx-tf-003.rego) |

## Overview

This rule flags Terraform `.tf` files where `publicly_accessible = true` appears anywhere inside an `aws_db_instance`, `aws_rds_cluster_instance`, `aws_redshift_cluster` or `aws_dms_replication_instance` resource, or a module whose source names rds, redshift or dms. When this setting is enabled, AWS assigns a publicly routable DNS endpoint to the database, making it reachable from any IP address on the internet (subject to security group rules). A value taken from a variable, other resource types and comments are not reported.

Database instances contain an application's most sensitive data: user records, transaction history, session information, and application state. Direct internet exposure of a database endpoint dramatically increases the risk of unauthorized access through credential brute-forcing, exploitation of database engine vulnerabilities, and attacks against the authentication protocol itself.

This rule corresponds to [CWE-1220: Insufficient Granularity of Access Control](https://cwe.mitre.org/data/definitions/1220.html).

## Why this matters

Database services are among the highest-value targets in any infrastructure. A successful unauthorized connection to a production database typically results in complete data exfiltration, as the attacker gains access to the entire dataset through standard query interfaces without needing any application-level exploits.

Internet-exposed RDS endpoints face continuous automated attacks. Within hours of a new database instance becoming publicly accessible, automated scanners will identify the open port, enumerate the database version, and attempt authentication with common credential sets. MySQL, PostgreSQL, and MSSQL all have well-documented default accounts and authentication bypass vulnerabilities that are continuously probed by attackers.

Even when strong passwords are used, a publicly accessible database endpoint provides no defence in depth. If a zero-day vulnerability is discovered in the database engine, all publicly accessible instances become immediately exploitable. Keeping the database in a private subnet means an attacker must first compromise a system inside the VPC before they can even reach the database, providing time to detect and respond.

## What gets flagged

```hcl
resource "aws_db_instance" "main" {
  identifier          = "app-db"
  engine              = "postgres"
  instance_class      = "db.t3.micro"
  publicly_accessible = true          # FLAGGED
}

resource "aws_redshift_cluster" "analytics" {
  cluster_identifier  = "analytics"
  publicly_accessible = true          # FLAGGED
}

module "orders_db" {
  source              = "terraform-aws-modules/rds/aws"
  publicly_accessible = true          # FLAGGED
}
```

Not flagged: `publicly_accessible = false`, `publicly_accessible = var.public`, or a commented-out line.

## Remediation

1. **Set `publicly_accessible = false` and place the instance in private subnets.** This is the baseline secure configuration for any database that should only be accessed by application servers within the same VPC:

```hcl
# SAFE: RDS in private subnets, not publicly accessible
resource "aws_db_instance" "app_db" {
  engine              = "postgres"
  instance_class      = "db.t3.medium"
  publicly_accessible = false
  db_subnet_group_name = aws_db_subnet_group.private.name

  vpc_security_group_ids = [aws_security_group.database.id]
}

resource "aws_db_subnet_group" "private" {
  subnet_ids = var.private_subnet_ids
}
```

2. **Use a bastion host or AWS Systems Manager Session Manager for administrative access.** If developers need direct database access for debugging, route the connection through a bastion in a private subnet or use AWS SSM port forwarding rather than making the database publicly accessible:

```bash
# SAFE: SSM port forwarding for local access, no public endpoint needed
aws ssm start-session \
  --target i-0123456789abcdef0 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "host=mydb.cluster.us-east-1.rds.amazonaws.com,portNumber=5432,localPortNumber=5432"
```

3. **Use IAM authentication for RDS** to avoid long-lived passwords entirely, requiring short-lived tokens generated from IAM credentials.

## References

- [CWE-1220: Insufficient Granularity of Access Control](https://cwe.mitre.org/data/definitions/1220.html)
- [AWS RDS – Controlling access with security groups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.RDSSecurityGroups.html)
- [AWS RDS – Hiding a DB instance in a VPC](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html)
- [CIS AWS Foundations Benchmark – RDS controls](https://www.cisecurity.org/benchmark/amazon_web_services)
- [OWASP Infrastructure as Code Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Infrastructure_as_Code_Security_Cheat_Sheet.html)
- [Terraform aws_db_instance documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance)

## Suppressing this rule

Put a `nosec` comment on the line, or on line 1 to cover the whole file. Use the comment marker of the file's language (`#`, `//`, `--` or `;`):

```text
# nosec vnx-tf-003
// nosec vnx-tf-003
```

Or record an ignore rule: `vulnetix ignore add --rule vnx-tf-003 --reason "..."`. See [Suppressing findings](/sast/guides/suppressing-findings/).
