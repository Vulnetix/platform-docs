---
title: Sensor on hosts, and the exec guard
description: Install vulnetix-sensor as a systemd service on EC2 or EMR with SSM, and use vulnetix-sensor run to refuse execs where there is no eBPF, such as Fargate.
order: 5
nav: EC2, EMR, exec guard
sources: [cli/deploy/sensor/install.sh, cli/deploy/sensor/ssm-document.yaml, cli/deploy/sensor/README.md, cli/cmd/vulnetix-sensor/main.go, cli/internal/sensor/execguard]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

## Enroll instead

`install.sh --enroll` installs the binary and then runs `vulnetix-sensor enroll`, which gets the credential and the configuration from a [provisioning profile](/virtual-patching/sensor/provisioning-profiles/) instead of from an env file and flags. A person enrolls with their CLI sign-in; a fleet enrolls with a signing key fetched at boot:

```bash
# A person, after vulnetix auth login --store home
curl -fsSL https://raw.githubusercontent.com/Vulnetix/cli/v3.158.0/deploy/sensor/install.sh \
  | sudo sh -s -- --enroll --from-cli-login

# A host, with an MDM integration key in /etc/vulnetix-sensor/mdm.key
curl -fsSL https://raw.githubusercontent.com/Vulnetix/cli/v3.158.0/deploy/sensor/install.sh \
  | sudo sh -s -- --enroll --mdm-key /etc/vulnetix-sensor/mdm.key --integration <integration-uuid> --kid <kid>
```

See [Your own laptop](/virtual-patching/sensor/byod-laptop/) and [At scale](/virtual-patching/sensor/iac/) for cloud-init, SSM, EMR, Ansible and Terraform. The rest of this page is the install with an env file and positional arguments, which keeps working.

## Any Linux host

```bash
VERSION=v3.154.0 ARCH=amd64     # or arm64
curl -fsSLO "https://github.com/Vulnetix/cli/releases/download/$VERSION/vulnetix-sensor-linux-$ARCH"
curl -fsSL "https://github.com/Vulnetix/cli/releases/download/$VERSION/checksums.txt" \
  | grep " \*\?vulnetix-sensor-linux-$ARCH\$" | sha256sum -c -
sudo install -m 0755 vulnetix-sensor-linux-$ARCH /usr/local/bin/vulnetix-sensor
vulnetix-sensor --version
```

## `install.sh` (EC2, EMR)

`deploy/sensor/install.sh` in the CLI repository installs the binary (checked against `checksums.txt`; a mismatch stops the install) and a hardened systemd unit.

```bash
install.sh <version> <feed-url> <feed-key> [mode] [listen] [upstream]
```

| Argument | Default | |
|---|---|---|
| `version` | required | A CLI release tag, e.g. `v3.154.0` |
| `feed-url` | required | A published feed URL |
| `feed-key` | required | The feed public key, base64 |
| `mode` | `monitor` | `monitor`, `guard` or `enforce` |
| `listen`, `upstream` | none | Set both to put the inbound proxy in front of a local app |

The unit always starts the egress proxy on `127.0.0.1:3128`; set `HTTPS_PROXY` for the services you want covered. Credentials are not arguments, because they would land in the process list and the SSM history: put them in `/etc/vulnetix-sensor.env` first.

```bash
sudo install -m 0600 /dev/null /etc/vulnetix-sensor.env
printf 'VULNETIX_ORG_ID=%s\nVULNETIX_API_KEY=%s\n' "<org-uuid>" "<hmac>" | sudo tee /etc/vulnetix-sensor.env >/dev/null
curl -fsSLO https://raw.githubusercontent.com/Vulnetix/cli/v3.154.0/deploy/sensor/install.sh
sudo sh install.sh v3.154.0 https://vulnetix.com/feeds/<org-uuid>/<feed-uuid> <feed-key> monitor
systemctl status vulnetix-sensor
```

The unit runs with `DynamicUser=yes`, `NoNewPrivileges=yes`, `ProtectSystem=strict`, `ProtectHome=yes`, `PrivateTmp=yes`, `MemoryMax=256M` and `Restart=always`.

### EMR

Write `/etc/vulnetix-sensor.env` and run `install.sh` from a bootstrap action, on every node.

### EC2 fleets with SSM

`deploy/sensor/ssm-document.yaml` is a Command document that reads the credentials from Secrets Manager, writes `/etc/vulnetix-sensor.env`, then runs `install.sh`.

| Parameter | Default |
|---|---|
| `Version` | required |
| `FeedUrl` | required |
| `FeedKey` | required |
| `Mode` | `monitor` |
| `CredentialsSecret` | `vulnetix/vdb-credentials`, a secret holding `{"orgId": "…", "secret": "…"}` (the org secret, not the HMAC; the document derives the key) |
| `Listen`, `Upstream` | empty |

```bash
aws ssm create-document --name VulnetixSensorInstall --document-type Command \
  --document-format YAML --content file://ssm-document.yaml

aws ssm send-command --document-name VulnetixSensorInstall \
  --targets Key=tag:vulnetix-sensor,Values=on \
  --parameters Version=v3.154.0,FeedUrl=https://vulnetix.com/feeds/<org-uuid>/<feed-uuid>,FeedKey=<feed-key>,Mode=monitor
```

The instance role needs `secretsmanager:GetSecretValue` on the secret, and the host needs `python3` and the AWS CLI. Use a State Manager association with the same document to keep new instances covered.

## The exec guard: `vulnetix-sensor run`

Where there is no eBPF (Fargate, locked-down hosts), `run` starts the workload itself under a seccomp filter that stops every `execve` and `execveat` until the sensor answers. Each exec is checked against the feeds' Sigma `process_creation` rules, indicator hashes and YARA rules before it runs. In `guard` or `enforce` a match is refused with `EPERM`; a shell reports exit `126`. In guard the exec is held like a request. Every other system call runs untouched.

```bash
vulnetix-sensor run --mode guard --feed https://vulnetix.com/feeds/<org-uuid>/<feed-uuid> -- /app/server --port 8080
```

`run` takes every sensor flag, then `--` and the command, and exits with the workload's exit code.

Use it as the container entrypoint, with the binary copied into your image:

```dockerfile
FROM <your app image>
COPY --from=<registry>/vulnetix-sensor:v3.154.0 /usr/local/bin/vulnetix-sensor /usr/local/bin/vulnetix-sensor
ENTRYPOINT ["/usr/local/bin/vulnetix-sensor", "run", "--mode", "guard", \
            "--feed", "https://vulnetix.com/feeds/<org-uuid>/<feed-uuid>", "--"]
CMD ["/app/server"]
```

It needs no capability beyond what any process has. It sets `no_new_privs`, so a setuid binary in the workload no longer gains privilege. The sensor reports `seccomp` on.

> [!CAREFUL] Exec guard limits
> It covers the workload it started and that workload's children, nothing else on the host. The path is read from the workload's memory while the exec waits, so a workload with a second thread could change it between the check and the kernel's read: this is a policy control for software that is not already hostile. It has been tested on Linux 7.2 (amd64). Seccomp user notifications need kernel 5.0 or later; Fargate platform 1.4 (kernel 5.10) should work and has not been run yet.

The sensor does not use ptrace.
