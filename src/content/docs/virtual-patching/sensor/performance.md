---
title: Sensor performance and metrics
description: What vulnetix-sensor costs a host in CPU and memory, measured, the metrics it reports on each heartbeat, where the console shows them, and the installed-package inventory a host SBOM is built from.
order: 8
nav: Performance and metrics
sources: [vdb-site/docs/runtime-sensor-api.md, saas/prisma/models/runtime.prisma, cli/internal/sensor/agent/agent.go, cli/internal/sensor/agent/metrics.go, cli/cmd/vulnetix-sensor/main.go, cli/internal/sensor/provision/units.go, cli/deploy/sensor/install.sh, website/src/shared/sensor-metrics.ts]
checked: [cli@4c8c3b7, vdb-site@1a06d67]
updated: 02 Nov 2026
---

## What it costs

Measured on one host: an Arch Linux desktop with 518 processes and 1,853 installed packages, running `vulnetix-sensor` v3.156.2.

| Measure | Result |
|---|---|
| Steady-state CPU | Below what the measurement could resolve, across 180 one-second samples |
| Resident memory (RSS) | 28 MB steady, 32 MB peak |
| Package inventory pass | 0.41 s of CPU |

Releases before the inventory fix peaked at 224 to 240 MB RSS on the same host, during the inventory pass. One host is one measurement: a host with many more processes or packages will cost more during the inventory pass.

### How memory is held down

| Control | Value | Effect |
|---|---|---|
| Soft Go heap limit | 64 MiB, unless `GOMEMLIMIT` is set | The garbage collector works harder as the heap nears it, rather than letting a burst grow toward the cap |
| Return after inventory | `debug.FreeOSMemory()` at the end of each inventory pass | The memory used to read the package databases goes back to the OS at once instead of being held until the next pass, 6 hours later by default |
| systemd `MemoryMax` | `256M`, in the unit `enroll` writes and the one `install.sh` writes | The kernel's hard cap for the service |
| Event post backoff | 5 seconds, doubled per consecutive failure, at most 5 minutes | A site that is down or refusing posts does not get a request every 5 seconds |

### Capabilities

The unit `vulnetix-sensor enroll` writes runs as a systemd dynamic user with `CAP_NET_BIND_SERVICE`, `CAP_SYS_PTRACE` and `CAP_DAC_READ_SEARCH`, both ambient and as the bounding set. The last two let the inventory read `/proc/<pid>/maps` and the `exe` links of processes owned by other users, which needs `PTRACE_MODE_READ`. They are used to read only: the sensor attaches to no process. The unit `install.sh` writes without enrolling does not add them, so its inventory sees only what the dynamic user can read.

## What it reports

Every heartbeat (a register, every 5 minutes) carries a `metrics` object of the sensor's own footprint:

| Field | Means |
|---|---|
| `startedAt` | When this process started, Unix ms |
| `uptimeSec` | Seconds since start |
| `cpuSec` | CPU seconds used since start |
| `rssBytes` | Resident memory |
| `heapBytes` | Go heap in use |
| `sysBytes` | Memory the Go runtime holds from the OS |
| `goroutines` | Goroutines running |
| `numGc` | Garbage collections since start |
| `passes` | One entry per periodic job: `inventory`, `feeds`, `config`, `hostchecks`, `events` |

Each pass entry has `lastAt`, `durationMs`, `ok`, `error` (when the last run failed), `runs` and `failures`.

The site stores the latest `metrics` on the sensor, and one history row per heartbeat that carried metrics, at most one a minute per sensor, kept 14 days. A history row keeps the uptime, CPU seconds, RSS, heap, goroutine count, and each pass's duration and outcome.

`cpuPct` is computed by the site, not sent by the sensor: the CPU seconds used between two consecutive heartbeats divided by the wall-clock time between them, as a percentage of one core. It is empty on the first heartbeat after a restart, where there is no interval to measure. A restart shows as a break in the charts.

## Where to see it

| Page | Lens | Shows |
|---|---|---|
| **Sensors** (`/resolve/sensor`) | Fleet | Every sensor |
| **Sensor Provisioning** (`/resolve/sensor-provisioning`) | Devices | Enrolled devices |

Expand a row to see its performance:

- Tiles from the latest heartbeat: CPU (of one core, last interval), memory (resident), heap and goroutines, uptime with total CPU since start, and the last inventory's duration. A figure the sensor did not send reads **Not reported**, never zero.
- Any pass whose last run failed, with its error and how many of its runs failed.
- Charts of CPU, and of memory and heap, over the last hour, 24 hours (the default), 7 days or 14 days, with the number of restarts in the window.
- Per pass over the window: runs, last, average and longest duration, and failures.

## Installed packages for a host SBOM

Every `--inventory-every` (default `6h`) the sensor posts the host's packages to `POST /v1/runtime/inventory`. The report has every package a running process maps, and every other installed OS package, so the site holds the whole list a host SBOM is built from.

| `state` | Means |
|---|---|
| `loaded` | A live process maps a file the package installed |
| `stale-loaded` | A process maps a file that was replaced or deleted on disk; restart it |
| `installed` | On the host, mapped by no process |

`ecosystem` is `deb`, `rpm`, `apk` or `arch`. A report holds at most 20,000 packages and 10 example processes each; rows past that are dropped and counted, and the rest is stored. Each report replaces the previous one.

Only `loaded` and `stale-loaded` count as runtime evidence on a finding page. An `installed` package is on disk but not in memory.
