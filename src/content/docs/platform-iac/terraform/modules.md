---
title: Terraform modules
nav: Modules
description: The two Terraform modules for AWS, aws-onboarding, which connects an AWS account to Vulnetix, and aws-siem-shipping, which ships an account's logs to Guardian. Released, installed from Git until the Terraform registry lists them. Inputs, outputs, requirements, limits and removal.
order: 4
sources: ["terraform-vulnetix-aws-onboarding/README.md", "terraform-vulnetix-aws-onboarding/variables.tf", "terraform-vulnetix-aws-onboarding/outputs.tf", "terraform-vulnetix-aws-siem-shipping/README.md", "terraform-vulnetix-aws-siem-shipping/variables.tf", "terraform-vulnetix-aws-siem-shipping/outputs.tf"]
checked: ["terraform-vulnetix-aws-onboarding@v1.0.1", "terraform-vulnetix-aws-siem-shipping@v1.0.0"]
updated: 03 Nov 2026
---

> [!CAREFUL] Released, but not on the Terraform registry yet
> `aws-onboarding` v1.0.1 and `aws-siem-shipping` v1.0.0 are released on GitHub. They are not listed on the Terraform registry, so install them by Git source, as below. The registry addresses the READMEs name, `Vulnetix/aws-onboarding/vulnetix` and `Vulnetix/aws-siem-shipping/vulnetix`, do not resolve yet.
>
> The Vulnetix build team has not exercised either module against a real AWS account beyond `terraform validate`, `tflint` and read-only plans. Plan in a non-production account first and read what it will create.

These two modules are for AWS, and are separate from the [provider](/platform-iac/terraform/). They work with Terraform and OpenTofu 1.5 or later. The provider manages Vulnetix's own settings; the modules create the AWS resources that connect an account to Vulnetix. The Vulnetix side of both is the [`AwsConnection`](/platform-iac/kinds/aws-connection/), [`AwsAccount`](/platform-iac/kinds/aws-account/), [`CloudSensors`](/platform-iac/kinds/cloud-sensors/) and [`LogSource`](/platform-iac/kinds/log-source/) kinds.

## aws-onboarding

[`Vulnetix/terraform-vulnetix-aws-onboarding`](https://github.com/Vulnetix/terraform-vulnetix-aws-onboarding) connects an AWS account to Vulnetix. It deploys the same `vulnetix-security-bootstrap` CloudFormation stack the Vulnetix console deploys, which holds two things:

- `vulnetix-cloudtrail-<account id>`: the CloudTrail log bucket, private and encrypted, writable only by this account's Vulnetix trail.
- `VulnetixSecurityAuditor`: the role Vulnetix assumes. It trusts only the Vulnetix AWS account, and only with your tenant uuid as the external ID.

Vulnetix then uses the role to deploy the `vulnetix-security-pipeline` stack: the trail, the EventBridge rule, the queue and the Vulnetix probe. The role's policy is scoped to exactly those two stacks and the resources they declare.

```hcl
module "vulnetix_onboarding" {
  source = "git::https://github.com/Vulnetix/terraform-vulnetix-aws-onboarding.git?ref=v1.0.1"

  external_id = "<your Vulnetix tenant uuid>"
}

output "auditor_role_arn" {
  value = module.vulnetix_onboarding.auditor_role_arn
}
```

Apply it with credentials that can create IAM roles, such as an IAM Identity Center administrator. Then give the account id and `auditor_role_arn` to the AWS integration in the Vulnetix console, which deploys the pipeline stack and verifies log delivery. One account has one bootstrap stack, named `vulnetix-security-bootstrap`. Deploy it in the region the trail should log from. The stack name is fixed, because the console and the role's policy both refer to it, so the module cannot create a second one in the same account and region. Pin `ref=v1.0.1` or later; do not use v1.0.0.

**Adopting a stack the console already deployed.** If the console created `vulnetix-security-bootstrap`, import it instead of creating it, and use v1.0.1. v1.0.0 plans to replace an imported stack, which would delete the `VulnetixSecurityAuditor` role and the CloudTrail log bucket; v1.0.1 ignores the create-only `on_failure` argument that caused it, so an import adopts the stack in place. Import the stack by its name, `terraform import module.vulnetix_onboarding.aws_cloudformation_stack.bootstrap vulnetix-security-bootstrap`, and read the plan before you apply. The module's [README](https://github.com/Vulnetix/terraform-vulnetix-aws-onboarding/blob/v1.0.1/README.md) does not walk through an import yet, so treat that plan as the check.

| Input | Default | Meaning |
|---|---|---|
| `external_id` (required) | none | Your Vulnetix tenant (organization) uuid. The role only trusts an assume that carries it as the external ID. |
| `vulnetix_account_id` | `061882422009` | The AWS account the Vulnetix service assumes the role from. Change it only when Vulnetix support asks you to. |
| `tags` | `{}` | Tags for the stack. CloudFormation copies them onto every resource it creates. `ManagedBy = "terraform"` is always added. |
| `timeout_minutes` | `30` | How long to wait for the stack to create, update or delete. |

| Output | Meaning |
|---|---|
| `auditor_role_arn` | The `VulnetixSecurityAuditor` role. Give it to the Vulnetix console. |
| `log_bucket_name` | The bucket CloudTrail delivers into and the probe bundle is staged in. |
| `external_id` | The external ID the role requires: your tenant uuid. |
| `stack_id` | The bootstrap stack's id. |

It needs `hashicorp/aws` 5.0 or later. The template is a copy of the one the console deploys, so a stack made here and one made from the console are the same stack.

**Removing it.** `terraform destroy` deletes the stack. Remove the pipeline stack first, from the Vulnetix console or with `aws cloudformation delete-stack --stack-name vulnetix-security-pipeline`, since it is deployed with the role this stack holds. CloudFormation cannot delete the log bucket while it holds objects; empty it first.

## aws-siem-shipping

[`Vulnetix/terraform-vulnetix-aws-siem-shipping`](https://github.com/Vulnetix/terraform-vulnetix-aws-siem-shipping) ships an AWS account's logs to Vulnetix Guardian, the Vulnetix SIEM. It is the Terraform form of the CloudFormation stack the Guardian Sources page launches, with the same resource names, so use one or the other in each region: a region that already has the Guardian Sources stack cannot also have this module. It creates three Firehose delivery streams that post to `ingest.vulnetix.com` over HTTPS with your Guardian ingest token:

- `vulnetix-siem-flow`: VPC flow logs for the VPCs you name, in the format Guardian parses.
- `vulnetix-siem-dns`: Route 53 Resolver query logs for the same VPCs.
- `vulnetix-siem-cloudtrail`: CloudTrail management write events and console sign-ins, through an EventBridge rule.

Batches Guardian refuses after five minutes of retries land in `vulnetix-siem-errors-<account>-<region>`, kept for 14 days by default. Nothing here grants Vulnetix any access to the account.

> [!CAREFUL] Flow logs capture all traffic
> The flow log for each VPC in `vpc_ids` records accepted and rejected traffic, with `traffic_type = "ALL"`, and Resolver query logs record every DNS query in those VPCs. Volume, and with it Firehose and Guardian ingest cost, grows with the traffic. Start with one VPC, or send CloudTrail only, and watch the volume before adding more.

```hcl
module "vulnetix_siem" {
  source = "git::https://github.com/Vulnetix/terraform-vulnetix-aws-siem-shipping.git?ref=v1.0.0"

  ingest_token = var.guardian_ingest_token # gdn_..., from the Guardian Sources page
  vpc_ids      = ["vpc-0abc1234def567890"]
}
```

With no `vpc_ids`, only CloudTrail is sent. CloudTrail events reach EventBridge only while a trail logs management events; the trail from `aws-onboarding` does, and so does any organization trail.

| Input | Default | Meaning |
|---|---|---|
| `ingest_token` (required) | none | The Guardian ingest token (`gdn_...`) from the Guardian Sources page. Sensitive. |
| `ingest_host` | `ingest.vulnetix.com` | The Guardian ingest host. |
| `vpc_ids` | `[]` | VPCs to send flow logs and DNS query logs for. Empty sends CloudTrail only. |
| `send_flow_logs`, `send_resolver_logs`, `send_cloudtrail` | `true` | Which of the three streams to create. |
| `error_retention_days` | `14` | Days to keep refused batches. |
| `force_destroy_error_bucket` | `false` | Let `terraform destroy` delete the error bucket while it holds batches. |
| `tags` | `{}` | Tags for every resource that takes them. `ManagedBy = "terraform"` is always added. |

| Output | Meaning |
|---|---|
| `stream_names`, `stream_arns` | The delivery streams, by kind (`flow`, `dns`, `cloudtrail`). |
| `error_bucket` | The bucket holding refused batches. |
| `flow_log_ids` | The VPC flow log ids, by VPC id. |
| `resolver_query_log_config_id` | The Resolver query logging config, or null when resolver logs are off. |
| `cloudtrail_rule_arn` | The EventBridge rule, or null when CloudTrail is off. |

It needs `hashicorp/aws` 6.0 or later.

> [!CAREFUL] The token is in the state
> Firehose sends the ingest token as the access key on every delivery, and the AWS provider keeps a Firehose access key in the Terraform state. Pass the token from a secret store and keep the state encrypted. To rotate it, issue a new token on the Guardian Sources page and apply with the new value.

To declare the Guardian side of a source, such as its label, see [`LogSource`](/platform-iac/kinds/log-source/).
