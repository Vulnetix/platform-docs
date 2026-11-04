---
title: Compute runtime
description: What the compute source reads from SSM inventory, EMR, EKS, ECS, CIS AWS Foundations controls and CloudFormation, its extensions, caps and named gaps.
order: 21
sources: [cloudscan/README.md, cloudscan/compute.go, cloudscan/compute_cis.go, cloudscan/compute_iac.go, cloudscan/compute_network.go, cloudscan/eks_pods.go, vdb-site/api/internal/handler/cloud_native.go, vdb-site/api/internal/handler/assets/aws-pipeline.yaml]
checked: [cloudscan@67eeabb, vdb-site@1a06d67]
updated: 02 Nov 2026
---

The compute source (`compute`) reads what the account already records about its compute and reports two things: the software running on it, and the controls it fails. It uses the AWS API only. Nothing is installed on a workload and no volume is snapshotted. Results appear on **Resolve > Runtime** (`/resolve/runtime`), grouped by resource family, and are filed under the scanner run `Vulnetix AWS Compute`.

## What it reads

| Source | What | Reported as |
|---|---|---|
| SSM inventory | `AWS:Application` on every managed instance, EMR nodes included | OS packages with distro purls, for example `pkg:rpm/amazon/...?distro=amazon-2023` |
| SSM Patch Manager | Non-compliant patch summaries | `SSM-PATCH-1` |
| EMR | Release label, applications and versions, security configuration, block public access | Components; `EMR-1`, `EMR-2` |
| EKS | Node group AMI release, public endpoint CIDRs, audit logging, node SSH | Components; `CIS-EKS-5.4.2`, `CIS-EKS-2.1.1`, `EKS-NG-1` |
| ECS | The image digest each running task pulled, Fargate platform version | Container image components |
| IAM, S3, CloudTrail, Config, EC2 | CIS AWS Foundations 3.0.0 controls the API can answer | `CIS-AWS-1.4`, `1.5`, `1.8`, `1.9`, `1.16`, `2.1.4`, `2.2.1`, `3.1`, `3.2`, `3.3`, `3.5`, `3.7`, `5.2`, `5.3`, `5.4`, `5.6` |
| CloudFormation | Each stack's original template | `CFN-SG-1`, `CFN-S3-1`, `CFN-EBS-1`, `CFN-RDS-1`, `CFN-RDS-2`, `CFN-EC2-1`, `CFN-IAM-1` |

The OS package purls are the ones `vulnetix sbom --include-system` emits on the same host, so a package seen by SSM and by the CLI is one component. Matching is against the distro's release rather than the upstream version, because Amazon Linux and RHEL backport fixes without changing the upstream number.

A template check judges only literal values. A property set by `!Ref`, `!If` or a parameter is unknown, never a failure. Controls that need the IAM credential report are not attempted, because generating the report is a write.

## Gaps

A run is complete only when every region was read without a denial, an error or a known gap. An incomplete run resolves nothing by absence: a finding is not closed because the run did not see it. The named gaps:

| Gap | Cause |
|---|---|
| `ssm-unmanaged` | EC2 instances SSM does not manage |
| `ssm-instance-cap` | More than 1,000 managed instances in a region |
| `ssm-inventory-truncated` | One instance with more than 2,500 packages |
| `cluster-terminated` | An EMR cluster ended before it was described |
| `running-task-cap` | More than 2,000 running ECS tasks in a region |
| `template-cap` | More than 300 stacks in a region |

## Extension: images and Lambda code

Source `compute-artifacts`, policy `vulnetix-reporter-artifacts`. It reads customer code, so it is its own consent. With it on, the probe function gets 1024 MB memory and 2048 MB ephemeral storage.

It reads inside:

- the ECR images that ECS tasks, ECR repositories and EMR on EKS jobs in the region name, in this account's registry only;
- the code and layers of zip-packaged Lambda functions (an image function is an ECR image).

Each artifact is streamed and discarded. What is kept is the software it records: dpkg, apk and rpm databases with `/etc/os-release`, Python dist-info and egg-info, npm `package.json` at a package root in `node_modules`, Go build info in binaries, and Maven coordinates in jars. Whiteouts apply, so a package an image deleted is not reported.

| Cap | Value |
|---|---|
| Image configs per region | 200 |
| Images whose layers are read, per region | 25 |
| Lambda functions per region | 50 |
| One file | 64 MB |
| Held in memory per artifact | 192 MB |
| Lambda zip on disk | 512 MB |

A zstd-compressed layer is not read; the image is marked `artifact-partly-read` rather than reported clean.

## Extension: network logs

Source `network-logs`, policy `vulnetix-reporter-network-logs`. It matches the last 24 hours of your own network logs against malicious indicators from the VDB API (`GET /v2/iocs`, seen in the last 30 days, cached for an hour). Only matches are kept.

| Log | Matched | Finding |
|---|---|---|
| Route 53 Resolver query logs | The name looked up, and its parent domains | `IOC-DNS-1` on the instance or VPC that asked |
| VPC flow logs | Source and destination addresses, in the log's own format | `IOC-NET-1` on the instance or network interface |

Only logs delivered to **CloudWatch Logs** are read. An S3 or Firehose destination is the gap `log-destination-not-cloudwatch`. Indicators that could not be fetched are the gap `indicators-unavailable`, never a clean result. Caps: 20 log groups of each kind per region, 100,000 events per log group.

For continuous detection over every flow and query, rather than a daily match, ship the logs to the SIEM instead: [Guardian AWS log shipping](/siem/sources/aws/).

## Extension: EKS workloads

Source `eks-workloads`, policy `vulnetix-reporter-eks-workloads`. The probe lists each cluster's pods through the Kubernetes API and records each workload's images with their digests, so Container curation can show where an image runs. A pod owned by a ReplicaSet is reported as its Deployment; pods labelled `emr-containers.amazonaws.com/virtual-cluster-id` are reported as EMR on EKS jobs. Up to 5,000 pods are read per cluster.

AWS permissions are not enough. Give the probe's role a read-only cluster role on each cluster with an EKS access entry:

```bash
aws eks create-access-entry --cluster-name <cluster> \
  --principal-arn arn:aws:iam::<your-account-id>:role/vulnetix-reporter-execution
aws eks associate-access-policy --cluster-name <cluster> \
  --principal-arn arn:aws:iam::<your-account-id>:role/vulnetix-reporter-execution \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy \
  --access-scope type=cluster
```

A cluster without an access entry, with a private-only endpoint, or in `CONFIG_MAP` authentication mode is recorded as an `eks:ListPods` gap on the cluster. On a 401 or 403 the probe reads the cluster's access entries and says whether the entry is missing or lacks the view policy.

## Where images run

Every container image the compute pass sees is also a **placement**, one row per resource and image, from ECS task definitions, Lambda container functions (needs `compute-artifacts`), ECR repositories (the 5 most recently pushed tagged images of each, up to 200 repositories per region, no layers read), EMR on EKS virtual clusters (images their jobs used in the last 30 days) and, with `eks-workloads`, EKS pods.
