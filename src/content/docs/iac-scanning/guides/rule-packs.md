---
title: Rule packs
description: Add Kubernetes, CloudFormation, ARM, Ansible, Dockerfile and wider Terraform checks with external Rego rule packs, and how the kind lock filters them.
order: 1
sources: [cli/internal/sast/loader.go, cli/internal/sast/registry.go, cli/internal/sast/kinds.go, cli/cmd/scan.go, cli/internal/sast/language_filter.go]
checked: [cli@2449840, community-rules@5869c7c, opa-fugue-regula@34a42c0, opa-checkmarx-kics@8e225c3, opa-aquasecurity-trivy@9cb99da, opa-cigna-tf@5eb05a9, opa-cds-aws-tf@582c7e4, opa-snyk-labs-iac@e008cf9]
updated: 02 Nov 2026
---

The built-in IaC rules are seven Terraform checks for AWS. Everything else comes from rule packs: Git repositories of Rego modules that the CLI fetches and evaluates alongside the built-in rules.

```bash
vulnetix iac --rule Vulnetix/opa-fugue-regula
```

## Packs Vulnetix publishes

All are public on GitHub. Counts are the rules of kind `iac` in each pack at the commit listed on this page; only those run under `vulnetix iac`.

| Pack | `iac` rules | Covers |
|---|---|---|
| `Vulnetix/opa-fugue-regula` | 275 | Terraform (194), Azure Resource Manager JSON (38), CloudFormation YAML or JSON (23), Kubernetes (20). Ported from Fugue Regula. |
| `Vulnetix/opa-checkmarx-kics` | 205 | Terraform (143), Dockerfile (48), Ansible (14). Ported from Checkmarx KICS. |
| `Vulnetix/opa-aquasecurity-trivy` | 107 | Kubernetes YAML (79), Dockerfile (28). Ported from Aqua Trivy. |
| `Vulnetix/opa-cigna-tf` | 88 | Terraform on AWS. Ported from Cigna's policies. |
| `Vulnetix/opa-cds-aws-tf` | 16 | Terraform on AWS: RDS, Lambda, IAM, ECS, WAF, SSM, tagging. |
| `Vulnetix/opa-snyk-labs-iac` | 6 | Terraform examples: S3 ACLs and tags, VPC flow logs, password policy, approved AMIs, branch protection. |
| `Vulnetix/community-rules` | 184 | Collected community policy packs, mostly Terraform, some Kubernetes and Dockerfile. It also has 39 rules of other kinds (`api`, `container`, `sast`, `sca`) that do not run here. |

Rule ids keep the source project's prefix (`FUGUE-ARM-AS-05`, `KICS-ANSIBLE-AWS-ENC-001`, `TRIVY-DS-0011`, `CIGNA-TF-AWS-CF-02`), so the report and the SARIF show where each check came from.

> [!CAREFUL] Dockerfile checks run under iac, not containers
> The KICS and Trivy Dockerfile rules declare kind `iac`. `vulnetix iac --rule Vulnetix/opa-checkmarx-kics` checks your Dockerfiles; `vulnetix containers --rule Vulnetix/opa-checkmarx-kics` does not, because the containers command runs only kinds `oci` and `container`.

## How packs are fetched

| Behaviour | Detail |
|---|---|
| Reference | `org/repo`. `-R` is the short form. Repeat the flag for several packs. |
| Source | `https://github.com/<org>/<repo>`, or `<registry>/<org>/<repo>` with `--rule-registry <url>`. |
| Cache | Shallow-cloned (depth 1) into the user cache directory (`~/.cache/vulnetix/rules/<org>/<repo>` on Linux, `~/Library/Caches/vulnetix/rules/…` on macOS) and pulled on later runs. A failed pull deletes the copy and clones again. A failed clone prints `Warning: rules registry not found: <org>/<repo>` and the scan continues without that pack. |
| Layout | Every `.rego` file under the repository's `rules/` directory is loaded. A pack with none prints `Imported 0 rules from <org>/<repo>`. |

## The kind lock

`vulnetix iac` keeps only rules whose metadata declares `"kind": "iac"`, from the built-in set and from every pack. Library modules (no `id`) are always kept, because rules depend on them. `vulnetix scan` has no lock: there, a pack's rules run under whatever kind they declare, and the embedded rules of kinds you turned off with `--skip` are dropped.

## Running packs only

```bash
vulnetix iac --disable-default-rules --rule Vulnetix/opa-aquasecurity-trivy
```

`--disable-default-rules` drops the seven built-in rules. To try one rule from a pack:

```bash
vulnetix iac --rule Vulnetix/opa-fugue-regula --rule-id FUGUE-ARM-AS-05
```

## Writing your own pack

A pack is a Git repository with `.rego` files under `rules/`. Each rule declares a `metadata` object with at least `id`, `name`, `severity` and `"kind": "iac"`, and a `findings` set whose entries carry `rule_id`, `message`, `artifact_uri`, `severity`, `level` and `start_line`. The input document has `input.file_contents` (path to text) and `input.file_set`. The SAST segment's [custom rules guide](/sast/guides/custom-rules/) is the reference for the module format.
