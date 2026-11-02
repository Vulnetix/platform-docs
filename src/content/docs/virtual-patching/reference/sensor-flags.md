---
title: Sensor flags and environment
description: Every vulnetix-sensor subcommand, flag, environment variable, default and exit code.
order: 1
nav: Sensor flags
sources: [cli/cmd/vulnetix-sensor/main.go, cli/cmd/vulnetix-sensor/lambda.go, cli/internal/sensor/siem/siem.go, cli/internal/sensor/uplink/uplink.go, cli/internal/sensor/decide/decide.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

## Subcommands

| Command | Does |
|---|---|
| `vulnetix-sensor [flags]` | Run the sensor |
| `vulnetix-sensor run [flags] -- <command> [args]` | Start a workload under the seccomp exec guard and exit with its code ([exec guard](/virtual-patching/runtime/sensor-hosts/#the-exec-guard-vulnetix-sensor-run)) |
| `vulnetix-sensor tetragon-policy --feed <url> [--feed-key <key>]` | Print a Tetragon `TracingPolicy` from the feeds' block-mode Sigma rules ([Tetragon](/virtual-patching/runtime/tetragon/)) |
| `vulnetix-sensor inventory [--root /]` | Print, as JSON, which installed packages running processes have mapped |
| `vulnetix-sensor lambda-extension` | The Lambda extension entry point; configured by environment only ([Lambda](/virtual-patching/runtime/sensor-lambda/)) |

## Flags (`vulnetix-sensor` and `run`)

| Flag | Default | Description |
|---|---|---|
| `--mode` | `monitor` | `monitor`, `guard` or `enforce` |
| `--hold` | `15m` | How long guard holds a match for a person to decide |
| `--listen` | none | Address the inbound proxy listens on, e.g. `:8080` |
| `--upstream` | none | The workload the inbound proxy forwards to, e.g. `http://127.0.0.1:8081`. Must be a URL. |
| `--health-path` | none | Repeatable. A path a load balancer probes; never held |
| `--egress-listen` | none | Address the outbound proxy listens on, e.g. `127.0.0.1:3128`. Set `HTTPS_PROXY` to it. |
| `--dns-listen` | none | UDP address the DNS guard answers on, e.g. `127.0.0.1:53` |
| `--dns-upstream` | first `nameserver` in `/etc/resolv.conf` | Resolver the DNS guard forwards to |
| `--tetragon-export` | none | Tetragon's JSON export file; check every process start |
| `--host-root` | `/` | Where the host filesystem is mounted, for hashing what a process ran and for the inventory |
| `--inventory-every` | `6h` | How often the package inventory is reported |
| `--bpf-lsm` | `false` | Refuse execs of exact paths block-mode rules name, with a BPF LSM program. Needs root and the bpf LSM. |
| `--feed` | required | Repeatable. A published feed's base URL |
| `--feed-key` | `VULNETIX_FEED_KEY`, else the key pinned at build | Base64 Ed25519 public key feeds are signed with. Without one every rule reports and never blocks. |
| `--state-dir` | `/var/lib/vulnetix-sensor` | Where the sensor keeps its key |
| `--endpoint` | `https://www.vulnetix.com/api/site` | Vulnetix site API the sensor reports to |
| `--offline` | `false` | Load rules from the feeds and report nothing; no credentials needed |
| `--forward` | none | Repeatable. `siem` sends every DNS and egress decision to Guardian |
| `--siem-token` | `VULNETIX_SIEM_TOKEN` | Guardian events ingest token (`gdn_…`) |
| `--siem-url` | `VULNETIX_SIEM_URL`, else `https://ingest.vulnetix.com/v1/ingest/events` | Guardian events route |
| `--version` | | Print the version and exit |

At least one of `--listen`, `--egress-listen`, `--dns-listen`, `--tetragon-export` or `--bpf-lsm` is required, except under `run`.

## Environment

| Variable | Used by | Meaning |
|---|---|---|
| `VULNETIX_ORG_ID`, `VULNETIX_API_KEY` | all | Credentials. The API key is the hex HMAC-SHA256 of the org id keyed by the org secret. The file `vulnetix auth login` writes works too. |
| `VULNETIX_FEED_KEY` | all | Feed public key, overriding the pinned one |
| `VULNETIX_SIEM_TOKEN`, `VULNETIX_SIEM_URL` | `--forward siem` | As the flags |
| `VULNETIX_SENSOR_FEEDS` | Lambda | Comma-separated feed URLs (required) |
| `VULNETIX_SENSOR_MODE` | Lambda | `monitor` (default), `guard`, `enforce` |
| `VULNETIX_SENSOR_PORT` | Lambda | Runtime API proxy port, default `9009` |
| `VULNETIX_SENSOR_EGRESS` | Lambda | Egress proxy port; unset means no egress proxy |
| `VULNETIX_ENDPOINT` | Lambda | Reporting endpoint, default `https://www.vulnetix.com/api/site` |
| `AWS_LAMBDA_EXEC_WRAPPER` | Lambda | Must be `/opt/vulnetix/wrapper` |

## Fixed behaviour

| | Value |
|---|---|
| Hold breaker | More than 20 distinct subjects held by one rule in 5 minutes |
| YARA scan cap | 64 MB per binary |
| Guardian forwarding queue | 20,000 rows, sent every 10 s or at 1,000 rows, 10 s timeout |

## Startup errors

| Message | Cause |
|---|---|
| `--mode must be monitor, guard or enforce` | Bad `--mode` |
| `at least one --feed is required` | No `--feed` |
| `set --listen with --upstream, --egress-listen, --dns-listen, --tetragon-export, or a combination` | Nothing to intercept |
| `--upstream must be a URL such as http://127.0.0.1:8081` | `--upstream` is not a URL |
| `--dns-listen needs --dns-upstream: /etc/resolv.conf names no nameserver` | No resolver to forward to |
| `no Vulnetix credentials: set VULNETIX_ORG_ID and VULNETIX_API_KEY, or run with --offline` | No credentials |
| `run needs a command after --` | `run` with no workload |
| `a feed key is required: an unverified rule never blocks` | `tetragon-policy` with no key |

## Exit codes

| Code | When |
|---|---|
| `0` | Clean shutdown, or a subcommand finished |
| `1` | Any startup or runtime error |
| the workload's code | `run`, when the workload exits |
