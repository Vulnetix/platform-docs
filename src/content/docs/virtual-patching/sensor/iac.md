---
title: Sensors at scale
description: Enroll vulnetix-sensor on fleets of Linux hosts from cloud-init, SSM, EMR bootstrap actions, Ansible and Terraform, and where containers and Lambda fit.
order: 4
nav: At scale
sources: [vdb-site/docs/sensor-provisioning-api.md, cli/deploy/sensor/install.sh, cli/deploy/sensor/ssm-document.yaml, cli/deploy/sensor/README.md, cli/cmd/vulnetix-sensor/main.go]
updated: 02 Nov 2026
---

A fleet of hosts enrolls the same way an [MDM](/virtual-patching/sensor/mdm/) does: each host holds the private key of an MDM integration, signs its own enrollment, and gets a device credential from the profile that lists that integration. No person signs in, and nothing long-lived is baked into the image: the key is fetched at boot.

Create the integration first: in the console, **Integrations → Device management**, add an integration for the tool that will run the enrollment, and copy the private key and `kid` it shows once. Then add the integration to a [provisioning profile](/virtual-patching/sensor/provisioning-profiles/#matching) with credential mode `device-key` or `org-key`. `user-key` is refused for keyed enrollment.

## Where each compute type is covered

| Compute | How it gets credentials | Page |
|---|---|---|
| EC2, EMR, any systemd Linux host | Keyed enrollment (this page), or the org key in `/etc/vulnetix-sensor.env` | This page, and [Hosts and the exec guard](/virtual-patching/runtime/sensor-hosts/) |
| Kubernetes or ECS, in front of an app | Org key in a Secret | [Sidecar](/virtual-patching/runtime/sensor-sidecar/) |
| Every Kubernetes node | Org key in a Secret | [DaemonSet](/virtual-patching/runtime/sensor-daemonset/) |
| AWS Lambda | Org key in the function environment | [Lambda layer](/virtual-patching/runtime/sensor-lambda/) |
| Fargate exec guard | Org key in the task's secrets | [Exec guard](/virtual-patching/runtime/sensor-hosts/#the-exec-guard-vulnetix-sensor-run) |

## Store the key

Put the integration's private key (the base64 string the console showed) in Secrets Manager:

```bash
aws secretsmanager create-secret --name vulnetix/sensor-mdm-key \
  --secret-string '<private-key-base64>'
```

Every host that enrolls needs read access to it. The instance role:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "secretsmanager:GetSecretValue",
    "Resource": "arn:aws:secretsmanager:<region>:<account>:secret:vulnetix/sensor-mdm-key-*"
  }]
}
```

> [!CAREFUL] Who holds the key can enroll
> Anything that can read the secret can enroll a device under that integration's profile. With `device-key`, what it gets is one more sensor credential that only the sensor routes accept, and the device appears in the list where you can revoke it. Scope the secret to the instance roles that need it, and rotate the key from **Integrations → Device management** (add a new key, move hosts to its `kid`, retire the old one).

## cloud-init on EC2

User data for any AMI with cloud-init, `curl` and the AWS CLI v2 (Amazon Linux 2023 has both; on Ubuntu add the AWS CLI first). `runcmd` runs as root on first boot.

```yaml
#cloud-config
write_files:
  - path: /usr/local/sbin/vulnetix-sensor-enroll
    permissions: "0700"
    content: |
      #!/bin/sh
      set -eu
      VERSION=v3.155.0
      REGION=<region>
      INTEGRATION=<integration-uuid>
      KID=<kid>
      install -d -m 0700 /etc/vulnetix-sensor
      umask 077
      aws secretsmanager get-secret-value --region "$REGION" \
        --secret-id vulnetix/sensor-mdm-key \
        --query SecretString --output text > /etc/vulnetix-sensor/mdm.key
      chmod 0600 /etc/vulnetix-sensor/mdm.key
      curl -fsSL "https://raw.githubusercontent.com/Vulnetix/cli/$VERSION/deploy/sensor/install.sh" \
        | sh -s -- --enroll --mdm-key /etc/vulnetix-sensor/mdm.key \
            --integration "$INTEGRATION" --kid "$KID"
runcmd:
  - [/usr/local/sbin/vulnetix-sensor-enroll]
```

Signed enrollment has a 5 minute clock window, so the instance clock must be right. On EC2 it is synced by the Amazon Time Sync Service from boot. The cloud-init output, including any enroll error, is in `/var/log/cloud-init-output.log`.

Instances replaced by an Auto Scaling group enroll as new devices. Their shutdown shows as `stopped` in the console; revoke old devices from the devices list when you want them gone.

## Terraform

The same user data from a launch template, with the instance role:

```hcl
resource "aws_iam_role_policy" "vulnetix_sensor_key" {
  role = aws_iam_role.app.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "secretsmanager:GetSecretValue"
      Resource = aws_secretsmanager_secret.vulnetix_sensor_key.arn
    }]
  })
}

resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = data.aws_ami.al2023.id
  instance_type = "t4g.small"

  iam_instance_profile { name = aws_iam_instance_profile.app.name }

  user_data = base64encode(templatefile("${path.module}/vulnetix-sensor.cloud-config.yaml", {
    region      = var.region
    integration = var.vulnetix_integration_uuid
    kid         = var.vulnetix_kid
  }))
}
```

In the template, replace the literal values in the script with `${region}`, `${integration}` and `${kid}`. For a single `aws_instance`, pass the rendered string as `user_data` without `base64encode`: the provider encodes it. User data runs once, at first boot; changing it does not re-enroll running instances unless `user_data_replace_on_change` is set.

The private key itself stays out of Terraform state if you create the secret's value outside Terraform (as above) and Terraform only references the secret.

## SSM document

For instances that already run, send the script with the stock `AWS-RunShellScript` document. It runs as root.

```bash
aws ssm send-command --document-name AWS-RunShellScript \
  --targets Key=tag:vulnetix-sensor,Values=on \
  --parameters 'commands=[
    "install -d -m 0700 /etc/vulnetix-sensor",
    "umask 077; aws secretsmanager get-secret-value --secret-id vulnetix/sensor-mdm-key --query SecretString --output text > /etc/vulnetix-sensor/mdm.key",
    "curl -fsSL https://raw.githubusercontent.com/Vulnetix/cli/v3.155.0/deploy/sensor/install.sh | sh -s -- --enroll --mdm-key /etc/vulnetix-sensor/mdm.key --integration <integration-uuid> --kid <kid>"
  ]'
```

Use a State Manager association with the same commands to cover instances as they launch. Running it again on an enrolled host re-enrolls the same device with a new credential, which is harmless.

The older `deploy/sensor/ssm-document.yaml` (`VulnetixSensorInstall`) still works and installs on the org key with per-host flags; see [EC2 fleets with SSM](/virtual-patching/runtime/sensor-hosts/#ec2-fleets-with-ssm).

## EMR

EMR bootstrap actions run on every node as the `hadoop` user, which has passwordless `sudo`. Upload the script from the cloud-init example to S3 and run it with `sudo`:

```bash
aws s3 cp vulnetix-sensor-enroll s3://<bucket>/bootstrap/vulnetix-sensor-enroll

aws emr create-cluster ... \
  --bootstrap-actions Path=s3://<bucket>/bootstrap/run-as-root.sh,Name=vulnetix-sensor
```

```sh
#!/bin/sh
# run-as-root.sh
set -eu
aws s3 cp s3://<bucket>/bootstrap/vulnetix-sensor-enroll /tmp/vulnetix-sensor-enroll
sudo sh /tmp/vulnetix-sensor-enroll
```

The EMR EC2 instance profile needs `secretsmanager:GetSecretValue` on the key and `s3:GetObject` on the scripts.

## Ansible

```yaml
- name: Enroll vulnetix-sensor
  hosts: sensors
  become: true
  vars:
    vulnetix_version: v3.155.0
    vulnetix_integration: <integration-uuid>
    vulnetix_kid: <kid>
    # From Ansible Vault, or a lookup such as amazon.aws.secretsmanager_secret
    vulnetix_mdm_key: "{{ vault_vulnetix_mdm_key }}"
  tasks:
    - name: Config directory
      ansible.builtin.file:
        path: /etc/vulnetix-sensor
        state: directory
        mode: "0700"

    - name: Signing key
      ansible.builtin.copy:
        dest: /etc/vulnetix-sensor/mdm.key
        content: "{{ vulnetix_mdm_key }}\n"
        mode: "0600"
      no_log: true

    - name: Installer
      ansible.builtin.get_url:
        url: "https://raw.githubusercontent.com/Vulnetix/cli/{{ vulnetix_version }}/deploy/sensor/install.sh"
        dest: /usr/local/sbin/vulnetix-sensor-install.sh
        mode: "0700"

    - name: Install and enroll
      ansible.builtin.command:
        argv:
          - sh
          - /usr/local/sbin/vulnetix-sensor-install.sh
          - --enroll
          - --mdm-key
          - /etc/vulnetix-sensor/mdm.key
          - --integration
          - "{{ vulnetix_integration }}"
          - --kid
          - "{{ vulnetix_kid }}"
        creates: /etc/vulnetix-sensor/credential
```

`creates` keeps later runs from re-enrolling. Drop it, or bump the version, to upgrade.

## Kubernetes and other containers

Containers do not enroll today. A pod has no systemd to install a unit into and its filesystem does not outlive it, so the sidecar and DaemonSet read `VULNETIX_ORG_ID` and `VULNETIX_API_KEY` from a Secret, as their pages show, and are configured by their container arguments, not by a profile. The same holds for ECS tasks and Lambda functions. A pod still shows on **Sensors**; it does not appear in the provisioning devices list.
