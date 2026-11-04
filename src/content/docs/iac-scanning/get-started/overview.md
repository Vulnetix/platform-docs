---
title: IaC scanning
nav: Overview
description: What vulnetix iac checks in Terraform and other infrastructure code, what the built-in rules cover, and how external rule packs add Kubernetes, CloudFormation, ARM, Ansible and Dockerfile checks.
order: 1
sources: [cli/cmd/specialized_scans.go, cli/cmd/scan.go, cli/internal/sast/kinds.go, cli/internal/sast/language_filter.go, cli/internal/sast/input.go, cli/internal/scan/detector.go, cli/cmd/config_documents.go]
checked: [cli@2449840]
updated: 04 Nov 2026
---

IaC scanning is for engineers who write Terraform and other infrastructure code and want a misconfiguration caught in the file, before it is applied. It reads the code in your repository, so it reports what you are about to deploy. To check what is already running in a connected AWS account, use [Cloud security](/cloud-security/).

`vulnetix iac` checks infrastructure-as-code files for security misconfigurations: a public S3 ACL, a security group open to `0.0.0.0/0`, an IAM policy that allows `*`, an unencrypted EBS volume. It runs the Rego rules of kind `iac` over your files on your machine and reports each problem against the resource you would change. Credentials are optional.

This segment is about scanning your own Terraform, Kubernetes and similar code. Vulnetix's own configuration documents (`QualityGate`, `AiFirewallPolicy`) are covered under [Platform IaC](/platform-iac/).

The command is the IaC stage of `vulnetix scan` on its own. These two run the same rules:

```bash
vulnetix iac
vulnetix scan --only iac
```

## Built-in coverage is Terraform on AWS

The CLI ships seven rules of kind `iac`, all for Terraform (and OpenTofu) on AWS. They read `.tf` and `.tofu` files. HCL in other files (`.tfvars`, `.tf.json`, `.hcl`) is not checked by them.

| Rule | Checks |
|---|---|
| `VNX-TF-001` | S3 bucket or object with a public ACL |
| `VNX-TF-002` | Security group ingress from `0.0.0.0/0` or `::/0` |
| `VNX-TF-003` | Publicly accessible RDS, Redshift or DMS instance |
| `VNX-TF-004` | IAM policy statement that allows `Action = "*"` |
| `VNX-TF-005` | Unencrypted EBS volume |
| `VNX-TF-006` | EC2 instance metadata service v1 (IMDSv1) enabled |
| `VNX-TF-007` | EKS cluster with a public API endpoint open to everyone |

[Rules](/iac-scanning/reference/rules/) has what each one reports and what it leaves alone. Hard-coded AWS keys in Terraform are `VNX-TF-008`, a rule of kind `secrets` that runs under [`vulnetix secrets`](/secrets/), not here.

For Kubernetes manifests, Helm output, CloudFormation, Azure Resource Manager templates, Ansible, Dockerfiles and wider Terraform coverage (Azure, GCP), add an external rule pack:

```bash
vulnetix iac --rule Vulnetix/opa-fugue-regula --rule Vulnetix/opa-aquasecurity-trivy
```

[Rule packs](/iac-scanning/guides/rule-packs/) lists the packs Vulnetix publishes and what each covers.

## What a run does

1. Walks `--path` (default `.`) to `--depth` (default `3`) levels, skipping `.git`, `node_modules`, `vendor`, `.venv`, `.tox`, `__pycache__`, `.cargo`, `.hg`, `.vulnetix`, anything matched by `--exclude`, and anything your `.gitignore` files match.
2. Loads the text of each file up to 1 MiB.
3. Evaluates the built-in rules of kind `iac` and the kind `iac` rules of each `--rule` pack. Rules of every other kind, in the built-in set or in a pack, do not run.
4. Prints the report grouped by resource, writes `.vulnetix/sast.sarif` and `.vulnetix/memory.yaml`, and exits `1` if a `--fail-on` gate is breached.
5. When you are authenticated, submits the findings to `/v2/cli.iac` and prints a snapshot link.

> [!CAREFUL] Default depth is 3
> Terraform repositories often keep modules at `infra/modules/<name>/main.tf` (depth 4). Those files are not read at the default depth. Pass `--depth 10` or more.

> [!CAREFUL] Rules read literals, not evaluated HCL
> The rules match what is written in the file. A value from a variable, a local, a data source, remote state or a module input is unknown to them, and they do not report it. A module whose source is not in the scanned tree is seen only through the calling block's literal arguments.

Nix files (`flake.nix`, `flake.lock`) are detected as IaC manifests, but they only contribute flake inputs to the dependency inventory under [SCA](/sca/). There are no Nix misconfiguration rules.

## Find the page for your task

| I want to | Read |
|---|---|
| Scan a Terraform repository and gate CI on it | [Quickstart](/iac-scanning/get-started/quickstart/) |
| Cover Kubernetes, CloudFormation, ARM or Ansible | [Rule packs](/iac-scanning/guides/rule-packs/) |
| Read the NEEDS ACTION and CAN WAIT groups | [Reading the report](/iac-scanning/guides/reading-the-report/) |
| Accept a finding on one resource | [Suppressing findings](/iac-scanning/guides/suppression/) |
| Look up a flag | [Flags](/iac-scanning/reference/flags/) |
| Feed SARIF to a code-scanning dashboard | [Output and exit codes](/iac-scanning/reference/output/) |
| Fix a problem with a scan | [Troubleshooting](/iac-scanning/reference/troubleshooting/) |

## GitHub Actions

Run it in a workflow with the [iac GitHub Action](/iac-scanning/github-actions/iac/): it uploads the findings to code scanning under the `vulnetix/iac/` category, keeps the files as an artifact and attests them.

## Platform IaC

IaC scanning has no config kind of its own. Its pass or fail threshold can come from the organisation's quality gate, the [`QualityGate`](/platform-iac/kinds/quality-gate/) kind, which `vulnetix config apply` sets, or the imperative `vulnetix config set quality-gate`. The Software Factory's scanners are the [`ScannerProfile`](/platform-iac/kinds/scanner-profile/) kind. See the [kind catalogue](/platform-iac/kinds/catalogue/).
