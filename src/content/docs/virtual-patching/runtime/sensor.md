---
title: Runtime sensor
description: What vulnetix-sensor runs, its monitor, guard and enforce modes, how holds are decided, and where to deploy it.
order: 1
nav: Sensor overview
sources: [cli/cmd/vulnetix-sensor/main.go, cli/deploy/sensor/README.md, vdb-site/docs/sensor-provisioning-api.md, cli/internal/sensor/decide/decide.go, cli/internal/sensor/engine/engine.go, cli/internal/sensor/feed/feed.go, vdb-site/docs/runtime-sensor-api.md, vdb-site/api/main.go]
checked: [cli@4c8c3b7, vdb-site@1a06d67]
updated: 02 Nov 2026
---

`vulnetix-sensor` is a separate binary from the `vulnetix` CLI. It runs inside or beside your workload, loads rules from one or more [detection rule feeds](/virtual-patching/feeds/detection-rule-feeds/), and reports every match to the console's **Sensors** page (`/resolve/sensor`), where a person decides what it held.

Every release of the CLI attaches `vulnetix-sensor-linux-amd64`, `vulnetix-sensor-linux-arm64` (listed in `checksums.txt`) and the Lambda layers `vulnetix-sensor-lambda-layer-amd64.zip` and `vulnetix-sensor-lambda-layer-arm64.zip`. No container image is published: build one from `deploy/sensor/Dockerfile` in the CLI repository.

```bash
docker build -f deploy/sensor/Dockerfile --build-arg VERSION=v3.154.0 -t <registry>/vulnetix-sensor:v3.154.0 .
```

The image is distroless, static, and runs as user `65532`.

## Modes

| `--mode` | A match on a rule that may block |
|---|---|
| `monitor` (default) | Reported. Nothing is blocked. |
| `guard` | Held: the request gets a `403` saying it is held for review, until a person confirms a block, marks a false positive or allows it once. A hold not answered within `--hold` (default `15m`) lapses to allow, and that subject is not held again. |
| `enforce` | Blocked. |

In every mode a rule only reports, never blocks or holds, when:

- its feed could not be verified against the feed key ([Manifest and signature](/virtual-patching/feeds/manifest-and-signature/));
- its `deployMode` is `log`;
- the request is on a `--health-path`;
- its breaker has tripped: a rule that holds more than 20 distinct subjects in 5 minutes reports only, until a person decides about it.

## Deciding on a hold

On `/resolve/sensor`, each hold can be resolved:

| Decision | Result |
|---|---|
| Confirm block | The rule blocks that subject from now on (`confirmed_block`) |
| Allow once | That subject passes (`allowed_once`) |
| False positive | The rule allows everything (`false_positive`) |

A decision can be revoked; sensors drop it on their next poll. Only a signed-in person can decide: a sensor's credentials cannot release its own hold.

## What it runs

| Rule type | Engine | Where it applies |
|---|---|---|
| `MODSECURITY` | Coraza | Inbound HTTP through `--listen` to `--upstream` |
| `REGEX_L7` | Go RE2. A pattern that needs lookaround or backreferences is rejected. | Inbound HTTP |
| `STIX`, `OPENIOC` | Domain, address and hash sets | Outbound calls through `--egress-listen`, lookups through `--dns-listen`, executables seen through Tetragon or `run` |
| `SIGMA` (`process_creation` only) | Evaluated on each process start: `Image`, `CommandLine`, `ParentImage`, `ParentCommandLine`, `CurrentDirectory`, `User` | `--tetragon-export`, `run`, `--bpf-lsm` |
| `YARA` | Pure-Go evaluator over each started binary, up to 64 MB | `--tetragon-export`, `run` |
| `SNORT`, `SURICATA`, `AWS_WAF`, `CLOUDFLARE_WAF`, `NGINX` | none | Reported as `no-engine` |

A Sigma rule for another logsource, or with an unsupported field, modifier or aggregation, is rejected with the reason. YARA supports text strings (`nocase`, `wide`, `ascii`, `fullword`), hex strings with wildcards, jumps and alternation, regexes, and conditions with `and`, `or`, `not`, `N of`, `filesize` and `uintN(offset)`. Modules, `for` loops, counts, offsets, `at`/`in`, `xor` and `base64` are rejected with the reason.

Every rule's load result (compiled, rejected, blocking) is reported, so the console calls a rule *protecting* only where at least one sensor compiled it and runs it in block mode.

## Interception points

| Flag | What it intercepts |
|---|---|
| `--listen` + `--upstream` | Inbound HTTP: the sensor is a reverse proxy in front of the app |
| `--egress-listen` | Outbound HTTP and HTTPS `CONNECT`: set `HTTPS_PROXY` and `HTTP_PROXY` in the app to it |
| `--dns-listen` | DNS over UDP: point the app's resolver at it. An indicator domain or any subdomain answers `NXDOMAIN` in enforce, is held in guard, is reported in monitor. Covers software that ignores `HTTPS_PROXY`. |
| `--tetragon-export` | Process starts from Tetragon's JSON export. Detects and reports; does not stop the process. |
| `vulnetix-sensor run -- <cmd>` | Every `execve` of the workload it starts, under seccomp. Can refuse. |
| `--bpf-lsm` | Exec of an exact path a block-mode Sigma rule names, in the kernel. Can refuse. |

At least one of `--listen`, `--egress-listen`, `--dns-listen`, `--tetragon-export` or `--bpf-lsm` is required, except under `run`.

## Credentials

A Linux host can get its credential in two ways:

| Way | Credential | Configuration | Page |
|---|---|---|---|
| Enroll with `vulnetix-sensor enroll` | Issued by a [provisioning profile](/virtual-patching/sensor/provisioning-profiles/): a per-device key by default, or the enrolling person's key, or the org key. Kept in `/etc/vulnetix-sensor/credential`. | Pulled from the profile every 5 minutes | [Choose a path](/virtual-patching/get-started/choose-a-sensor-path/) |
| Set it yourself | `VULNETIX_ORG_ID` and `VULNETIX_API_KEY` (the hex HMAC-SHA256 of the org id, keyed by the org secret), or the file `vulnetix auth login` writes | Flags on the command line | This page and the deploy pages |

Containers and Lambda functions use the second way. The order the sensor looks in is on [Sensor flags](/virtual-patching/reference/sensor-flags/#precedence). Without any credential it refuses to start unless `--offline` is set, in which case rules load from the feeds and nothing is reported.

It registers itself and reports to `--endpoint` (default `https://www.vulnetix.com/api/site`), at `/v1/runtime/*`. Its own key is kept in `--state-dir` (default `/var/lib/vulnetix-sensor`).

## Package inventory

Every `--inventory-every` (default `6h`) the sensor reports which installed packages running processes have mapped, read from `--host-root`. A finding page can then say whether the vulnerable package is loaded, and where. Run it once by hand:

```bash
sudo vulnetix-sensor inventory --root /
```

| Field | Means |
|---|---|
| `loaded` | A live process maps a file the package installed |
| `stale-loaded` | A process maps a file that was replaced or deleted on disk. The package on disk may be fixed while the process runs the old code: restart it. |
| `unowned` | Executable files mapped that no package installed |
| `memfdExec` | Processes running code from an anonymous memory file. Fileless malware does this, and so do JIT runtimes and browsers. |
| `unreadable` | Processes it could not read; run as root |

## Deploy

Start at [Choose a sensor path](/virtual-patching/get-started/choose-a-sensor-path/) if you are not sure which one fits.

| Compute | Page |
|---|---|
| Your own Linux laptop | [Your own laptop](/virtual-patching/sensor/byod-laptop/) |
| Devices your MDM manages | [MDM enrollment](/virtual-patching/sensor/mdm/) |
| Fleets of hosts: cloud-init, SSM, EMR, Ansible, Terraform | [At scale](/virtual-patching/sensor/iac/) |
| Hosts where the sensor must be hard to stop | [Protection](/virtual-patching/sensor/protection/) |
| Kubernetes or ECS, in front of an app | [Sidecar](/virtual-patching/runtime/sensor-sidecar/) |
| Every Kubernetes node, with Tetragon | [DaemonSet](/virtual-patching/runtime/sensor-daemonset/) |
| AWS Lambda | [Lambda layer](/virtual-patching/runtime/sensor-lambda/) |
| EC2, EMR, any Linux host; Fargate exec guard | [Hosts and the exec guard](/virtual-patching/runtime/sensor-hosts/) |
| Kernel exec blocking | [Tetragon and BPF LSM](/virtual-patching/runtime/tetragon/) |
| Copy DNS and egress decisions to Guardian | [Forwarding to Guardian](/virtual-patching/runtime/forwarding-to-guardian/) |

Every flag is on [Sensor flags](/virtual-patching/reference/sensor-flags/).
