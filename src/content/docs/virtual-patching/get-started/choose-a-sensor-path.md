---
title: Choose a sensor path
description: Which way to install vulnetix-sensor, and which credential it gets, for a laptop, an org-provisioned device, a cloud fleet or a host that must not be stopped.
order: 2
nav: Choose a path
sources: [vdb-site/docs/sensor-provisioning-api.md, cli/deploy/sensor/README.md, cli/cmd/vulnetix-sensor/main.go, vdb-site/docs/sensor-feeds-api.md]
checked: [cli@4c8c3b7, vdb-site@1a06d67]
updated: 02 Nov 2026
---

An org admin creates **provisioning profiles** on the Resolve Platform's **Sensor Provisioning** page (Configuration group, `/resolve/sensor-provisioning`). A profile says which devices it is for (email addresses, email domains, or an MDM integration), which credential an enrolled device gets, and the configuration the sensor runs: mode, feeds, interception points and protection level. A sensor that enrolls is bound to the first enabled profile that matches it. A profile edit reaches a connected sensor within seconds, and every sensor within 5 minutes, so the admin changes the fleet by editing the profile. Details are on [Provisioning profiles](/virtual-patching/sensor/provisioning-profiles/). The feeds a profile loads, including built-in blocklists and threat intelligence providers, are on [Rule feeds](/virtual-patching/sensor/feeds/).

Enrollment is Linux only today (`amd64` and `arm64`, with systemd). macOS and Windows are planned.

## Pick a path

| Who you are, where it runs | Path | Credential the device gets | Page |
|---|---|---|---|
| You, on your own Linux laptop | `vulnetix auth login`, then `install.sh --enroll --from-cli-login` | What your profile says: a device key (default) or your own user key | [Your own laptop](/virtual-patching/sensor/byod-laptop/) |
| Your org gave you a profile that matches your email or domain | The same as above: your login picks the profile | Device key, user key or org key, as the profile says | [Your own laptop](/virtual-patching/sensor/byod-laptop/) |
| Your org manages the device with an MDM (Intune, JumpCloud, Fleet, Workspace ONE, Ansible, Puppet, Chef, Salt) | The MDM pushes a signing key and runs `install.sh --enroll --mdm-key` as root; no person signs in | Device key or org key (user key is refused) | [MDM enrollment](/virtual-patching/sensor/mdm/) |
| EC2 instances, with a shell or SSM | SSM document, or `install.sh --enroll --mdm-key` with the key from Secrets Manager | Device key or org key | [At scale](/virtual-patching/sensor/iac/#ssm-document) |
| EC2 instances at launch | cloud-init `#cloud-config` user data | Device key or org key | [At scale](/virtual-patching/sensor/iac/#cloud-init-on-ec2) |
| EMR clusters | A bootstrap action on every node | Device key or org key | [At scale](/virtual-patching/sensor/iac/#emr) |
| Ansible or Terraform managed hosts | A playbook, or `user_data` on `aws_instance` or a launch template | Device key or org key | [At scale](/virtual-patching/sensor/iac/#ansible) |
| Kubernetes, in front of an app | Sidecar container | Org key from a Secret | [Sidecar](/virtual-patching/runtime/sensor-sidecar/) |
| Kubernetes, every node | DaemonSet beside Tetragon | Org key from a Secret | [DaemonSet](/virtual-patching/runtime/sensor-daemonset/) |
| ECS (Fargate or EC2) | Sidecar container | Org key from Secrets Manager | [Sidecar](/virtual-patching/runtime/sensor-sidecar/#ecs-fargate-or-ec2) |
| AWS Lambda | Lambda layer | Org key in function environment | [Lambda layer](/virtual-patching/runtime/sensor-lambda/) |
| A host where users, and an attacker with a user shell, must not be able to stop the sensor | Any host path above, with the profile's protection set to `hardened` or `locked` | Unchanged | [Protection](/virtual-patching/sensor/protection/) |

Containers and Lambda do not enroll: they read `VULNETIX_ORG_ID` and `VULNETIX_API_KEY` from their environment, as the pages linked above show.

## Credential modes in one line each

| Mode | Use it when |
|---|---|
| `device-key` (default) | Almost always. Each device has its own credential that only the sensor routes accept, and you can revoke one device. |
| `user-key` | Every report must be attributed to the person who enrolled. Person enrollment only. Revoking means rotating that person's key. |
| `org-key` | You need the device to hold the tenant key, as a hand-written `/etc/vulnetix-sensor.env` does. Not revocable per device. |

## Next

- Install on your laptop: [Your own laptop](/virtual-patching/sensor/byod-laptop/).
- Set up profiles as an admin: [Provisioning profiles](/virtual-patching/sensor/provisioning-profiles/).
- Pick the feeds a profile loads: [Rule feeds](/virtual-patching/sensor/feeds/) and [Threat intel connectors](/virtual-patching/sensor/threat-intel-connectors/).
- What the sensor does once it runs: [Runtime sensor](/virtual-patching/runtime/sensor/).
- What it costs a host and what it reports about itself: [Performance and metrics](/virtual-patching/sensor/performance/).
