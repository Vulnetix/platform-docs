---
title: Sensor flags and environment
description: Every vulnetix-sensor subcommand, flag, environment variable, default and exit code.
order: 1
nav: Sensor flags
sources: [cli/cmd/vulnetix-sensor/main.go, cli/deploy/sensor/install.sh, vdb-site/docs/sensor-provisioning-api.md, cli/cmd/vulnetix-sensor/lambda.go, cli/internal/sensor/siem/siem.go, cli/internal/sensor/uplink/uplink.go, cli/internal/sensor/decide/decide.go, cli/internal/sensor/feed/indicators.go]
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
| `vulnetix-sensor enroll [flags]` | Enroll this host under a provisioning profile, write its credential and config, install and start the unit ([Enrollment](#enrollment)) |
| `vulnetix-sensor status` | Show whether the host is enrolled, its profile, protection level, mode, `configEtag` and service state. Exits `3` when the service is not active. |
| `vulnetix-sensor config` | Print the profile configuration the sensor runs, as JSON |
| `vulnetix-sensor uninstall [--code <code>]` | Record the uninstall, remove the units, polkit rule, credential and config, and stop the sensor. Leaves the binary and the sensor key. A `locked` device needs `--code`. Root only. |
| `vulnetix-sensor goodbye [--reason stop] [--detail <text>]` | Tell the console the sensor is stopping. `--reason` is `signal`, `stop`, `uninstall` or `upgrade`. |
| `vulnetix-sensor guard-check` | What the guard timer runs each minute; see [Protection](/virtual-patching/sensor/protection/#the-guard-timer) |

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
| `--feed` | required | Repeatable. A signed feed's base URL (`https://vulnetix.com/feeds/<org>/<feed>`), `catalog:<id>` or `org:<uuid>` ([Rule feeds](/virtual-patching/sensor/feeds/#reference-forms)). `catalog:` and `org:` lists come from the site with the sensor's credential, report and never block, and are skipped with `--offline`. |
| `--feed-key` | `VULNETIX_FEED_KEY`, else the key pinned at build | Base64 Ed25519 public key feeds are signed with. Without one every rule reports and never blocks. |
| `--state-dir` | `/var/lib/vulnetix-sensor` | Where the sensor keeps its key |
| `--config-dir` | `/etc/vulnetix-sensor` | Where an enrolled sensor's credential and profile config are. The profile's config is the default for every flag not given. |
| `--endpoint` | `https://www.vulnetix.com/api/site` | Vulnetix site API the sensor reports to |
| `--offline` | `false` | Load rules from the feeds and report nothing; no credentials needed |
| `--forward` | none | Repeatable. `siem` sends every DNS and egress decision to Guardian |
| `--siem-token` | `VULNETIX_SIEM_TOKEN` | Guardian events ingest token (`gdn_…`) |
| `--siem-url` | `VULNETIX_SIEM_URL`, else `https://ingest.vulnetix.com/v1/ingest/events` | Guardian events route |
| `--version` | | Print the version and exit |

At least one of `--listen`, `--egress-listen`, `--dns-listen`, `--tetragon-export` or `--bpf-lsm` is required, except under `run`. An enrolled sensor needs neither a feed nor a listener: it still reports its inventory, and a profile edit can add either later.

## Enrollment

### `enroll` flags

Enroll needs root. It uses `--mdm-key` when given; otherwise `--api-key` (or `VULNETIX_API_KEY`); otherwise the CLI sign-in, so `--from-cli-login` is the default. `status`, `config`, `uninstall`, `goodbye` and `guard-check` also take `--config-dir`, `--state-dir` and `--endpoint`.

| Flag | Default | Description |
|---|---|---|
| `--from-cli-login` | on when nothing else is given | Enroll as the person signed in with `vulnetix auth login`. Under `sudo`, reads the invoking user's `~/.vulnetix/credentials.json`; the keyring is not reachable ([Your own laptop](/virtual-patching/sensor/byod-laptop/)) |
| `--api-key` | `VULNETIX_API_KEY` | Enroll with a person's API key. Prefer the environment: a flag shows in `ps`. An org key or service account is refused. |
| `--org-id` | `VULNETIX_ORG_ID` | The API key's organisation; required with `--api-key` |
| `--mdm-key <file>` | | The MDM integration's private key (base64 Ed25519 seed), mode `0600`. Signs the enrollment; no person needed ([MDM](/virtual-patching/sensor/mdm/)). |
| `--integration <uuid>` | | The MDM integration, with `--mdm-key` |
| `--kid <kid>` | | Which of the integration's keys `--mdm-key` is, with `--mdm-key` |
| `--mdm-device-id` | `/sys/class/dmi/id/product_serial`, else `/etc/machine-id` | The device's serial or MDM device id, with `--mdm-key` |
| `--profile <uuid>` | the first enabled match | Ask for a profile. It must still match. |
| `--endpoint` | `https://www.vulnetix.com/api/site` | Site API to enroll with. The other subcommands default to the endpoint the device enrolled with. |
| `--config-dir` | `/etc/vulnetix-sensor` | Where the credential and config are written |
| `--state-dir` | `/var/lib/vulnetix-sensor` | Where the sensor key is kept |
| `--no-start` | `false` | Write the credential, config and units; do not enable or start them |
| `--print` | `false` | Print the units for the enrolled config and exit. Contacts nothing, writes nothing. |
| `--protection` | | With `--print` on a host with no enrolled config: preview `standard`, `hardened` or `locked` |

### `install.sh --enroll`

```bash
install.sh --enroll <enroll flags>
```

Downloads `vulnetix-sensor-linux-<arch>` for the script's release, checks it against `checksums.txt`, installs it to `/usr/local/bin/vulnetix-sensor`, then runs `vulnetix-sensor enroll` with the flags given. Without `--enroll` the script takes the positional arguments on [Hosts](/virtual-patching/runtime/sensor-hosts/#installsh-ec2-emr).

### Files

| Path | Mode | Holds |
|---|---|---|
| `/etc/vulnetix-sensor/credential` | `0600`, root | The credential the profile issued. The unit loads it with `LoadCredential=`, so the sensor reads it from `$CREDENTIALS_DIRECTORY`, not from `/etc`. |
| `/etc/vulnetix-sensor/config.json` | `0644` | The profile's configuration as enroll received it, with its `configEtag`. Holds no secret. |
| `/var/lib/vulnetix-sensor/config.json` | | What the running sensor last pulled (the unit's `StateDirectory`). The sensor uses the newer of the two. |
| `/etc/vulnetix-sensor/mdm.key` | `0600`, root | The MDM signing key, where an MDM or a fleet tool put it |
| `/etc/systemd/system/vulnetix-sensor.service` | `0644` | The unit, written for the profile's protection level. Runs `vulnetix-sensor --config-dir /etc/vulnetix-sensor` as a `DynamicUser`, and still reads `/etc/vulnetix-sensor.env` if it exists. |
| `/etc/systemd/system/vulnetix-sensor-guard.service`, `vulnetix-sensor-guard.timer` | `0644` | The guard, run every minute (`vulnetix-sensor guard-check`) |
| `/etc/polkit-1/rules.d/50-vulnetix-sensor.rules` | | `hardened` and `locked` only: refuses non-root `manage-units` on the sensor units |

### Precedence

| | First wins |
|---|---|
| Each setting | A flag on the command line, then the profile's config snapshot in `config.json`, then the built-in default |
| Credential | `VULNETIX_ORG_ID` and `VULNETIX_API_KEY` in the environment (including `/etc/vulnetix-sensor.env`), then `/etc/vulnetix-sensor/credential`, then the file `vulnetix auth login` writes |

### Fixed behaviour of an enrolled sensor

| | Value |
|---|---|
| Config pull | Every 5 minutes, `If-None-Match` with the held `configEtag` |
| Revoked credential | `401` on the next request; the sensor stops reporting and logs why |
| `SIGTERM`, `SIGINT` | A goodbye with reason `signal`, sent within 2 seconds, so the console shows `stopped`, not `silent` |
| `SIGHUP` | Exit so systemd starts the sensor on the new configuration or unit; enroll and the guard send it |
| Signed enrollment clock window | 5 minutes either side of the site's clock; each nonce is used once |

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
| `at least one --feed is required` | No `--feed`, on a sensor that is not enrolled |
| `set --listen with --upstream, --egress-listen, --dns-listen, --tetragon-export, or a combination` | Nothing to intercept |
| `--upstream must be a URL such as http://127.0.0.1:8081` | `--upstream` is not a URL |
| `--dns-listen needs --dns-upstream: /etc/resolv.conf names no nameserver` | No resolver to forward to |
| `no Vulnetix credentials: run vulnetix-sensor enroll, set VULNETIX_ORG_ID and VULNETIX_API_KEY, or run with --offline` | No credentials |
| `run needs a command after --` | `run` with no workload |
| `a feed key is required: an unverified rule never blocks` | `tetragon-policy` with no key |

## Exit codes

| Code | When |
|---|---|
| `0` | Clean shutdown, or a subcommand finished |
| `1` | Any startup or runtime error |
| the workload's code | `run`, when the workload exits |
