---
title: Sensor protection levels
description: What the standard, hardened and locked protection levels change in the systemd unit, who can still stop the sensor at each, and how a stop shows in the console.
order: 5
nav: Protection
sources: [vdb-site/docs/sensor-provisioning-api.md, cli/cmd/vulnetix-sensor/main.go, cli/deploy/sensor/install.sh, cli/internal/sensor/provision/units.go]
updated: 02 Nov 2026
---

The profile's `protection` field sets how hard the sensor is to stop on an enrolled Linux host. `vulnetix-sensor enroll` writes the systemd unit to match, and rewrites it when the profile's level changes.

> [!CAREFUL] Root can always stop it
> A process running as root can stop or remove any other local process, including this one: it can edit or delete the unit, disable the guard timer, kill the sensor, block its network, or boot another kernel. No protection level prevents that. The aim is that every stop is visible in the console, so a stop you did not expect is something you hear about.

## The three levels

| | `standard` | `hardened` | `locked` |
|---|---|---|---|
| Starts at boot (`WantedBy=multi-user.target`, enabled) | Yes | Yes | Yes |
| Restarts after a crash or kill (`Restart=always`) | Yes | Yes | Yes |
| Goodbye on `SIGTERM`, so the console shows `stopped` | Yes | Yes | Yes |
| `RefuseManualStop=yes`: `systemctl stop` and `restart` are refused | No | Yes, unless `allowUserStop` | Yes, unless `allowUserStop` |
| `WatchdogSec=30`: systemd restarts a sensor that stops sending `sd_notify` keepalives | No | Yes | Yes |
| `StartLimitIntervalSec=0`: systemd never gives up restarting it | No | Yes | Yes |
| polkit rule denying non-root `manage-units` on the sensor units | No | Yes | Yes |
| `vulnetix-sensor-guard.timer`, every minute, as root: keep the units in step with the profile | Yes | Yes | Yes |
| The guard also unmasks and enables the unit, starts it if it is not running (unless `allowUserStop`), and reports what it found | No | Yes | Yes |
| Uninstall needs a one-time code from the console | No | No | Yes |
| Runs as a systemd dynamic user with `CAP_NET_BIND_SERVICE`, `CAP_SYS_PTRACE` and `CAP_DAC_READ_SEARCH` only, `NoNewPrivileges=yes`, `ProtectSystem=strict`, `MemoryMax=256M` | Yes | Yes | Yes |

`CAP_NET_BIND_SERVICE` lets a listener bind a port below 1024, such as the DNS guard on `:53`. `CAP_SYS_PTRACE` and `CAP_DAC_READ_SEARCH` let the package inventory read `/proc/<pid>/maps` and the `exe` links of other users' processes, so it can tell which packages they have loaded. They are used read-only: the sensor attaches to no process. See [Performance and metrics](/virtual-patching/sensor/performance/#capabilities).

### The polkit rule

`/etc/polkit-1/rules.d/50-vulnetix-sensor.rules` leaves root alone and, for anyone else, answers *no* to:

- `org.freedesktop.systemd1.manage-units` (start, stop, restart) on `vulnetix-sensor.service` and the `vulnetix-sensor-guard.*` units;
- `org.freedesktop.systemd1.manage-unit-files` (enable, disable, mask) on every unit, because systemd does not say which unit that action is for. On a `hardened` or `locked` host, enabling or disabling any unit needs `sudo`.

That covers a desktop user whose distribution would otherwise let an admin-group member manage units after a password prompt. It does not apply to `sudo`, which runs as root.

### The guard timer

`vulnetix-sensor-guard.timer` runs `vulnetix-sensor guard-check` one minute after boot and every minute after that. Every level gets it, so raising a profile from `standard` to `hardened` takes effect without a reinstall: the guard rewrites the units. From `hardened` up, a masked unit is unmasked and enabled, a disabled one is enabled, and a sensor that is not running is started, unless the profile sets `allowUserStop`. Each time it restores something the guard sends a goodbye with reason `stop` and a detail such as `restored by guard: was masked, was not running`, so the console shows that the unit was tampered with and not only that it came back. The guard is a separate unit, so stopping the sensor does not stop the guard, and at `hardened` and `locked` the timer refuses a manual stop too.

### Watchdog

At `hardened` and `locked` the unit is `Type=notify` and the sensor sends a keepalive to systemd every 15 seconds, half of `WatchdogSec=30`. A sensor that hangs, or is frozen with `SIGSTOP`, misses the window and systemd kills and restarts it.

### Upgrades and config changes

`RefuseManualStop` blocks a person's `systemctl stop` and `restart`, not the sensor's own exit. When a profile change needs a restart, the sensor logs it and exits, and `Restart=always` starts it again 5 seconds later. Enroll and the guard send it `SIGHUP` for the same purpose after they rewrite its configuration or unit. Upgrade the binary by running `install.sh --enroll ...` again, which reuses the device.

## Who can do what

| Actor | `standard` | `hardened` | `locked` |
|---|---|---|---|
| Normal user, no `sudo` | Cannot stop, mask or edit the unit, or read the credential (`/etc/vulnetix-sensor/credential` is `0600`, root) | Same | Same |
| Normal user with polkit admin rights | Can stop it with a password prompt; console shows `stopped` | Refused by the polkit rule | Refused |
| Local admin with `sudo` | `systemctl stop`, `disable`, `uninstall`: all work, all visible | `systemctl stop` refused. `kill` restarts it. `mask` or `disable` is undone by the guard within a minute and reported. `vulnetix-sensor uninstall` works and is recorded. | As `hardened`, but uninstall needs a code an admin issued for this device |
| Attacker with a user shell | Cannot stop it | Cannot stop it | Cannot stop it |
| Attacker with root | Can stop it. A `SIGTERM` stop shows `stopped`; `SIGKILL` with the unit removed shows `silent` after `heartbeatAlertMinutes`. | Has to defeat the unit, the watchdog and the guard timer; each step that is noticed is reported, and anything else ends as `silent` | As `hardened`. Without a code, uninstall through the sensor is refused, so removal has to be by force, which ends as `silent`. |

## In the console

The device's tamper state on Sensor Provisioning, and the sensor's on Sensors, read `ok`, `stopped`, `silent` or `revoked` ([what each means](/virtual-patching/sensor/provisioning-profiles/#tamper-states)). Set `heartbeatAlertMinutes` on the profile to how long a device may be quiet before it counts as `silent`: lower for servers that never sleep, higher for laptops that do.

## Hosts and laptops

| | Recommended | Why |
|---|---|---|
| Cloud hosts (EC2, EMR, long-lived VMs) | `hardened`, `allowUserStop: false`, `heartbeatAlertMinutes` around `10` | Nobody needs to stop it by hand, and a host that goes quiet is worth a look. Instances that are replaced on deploy have nothing to uninstall: their shutdown shows as `stopped`. |
| Hosts that hold regulated data, or where removal must be approved | `locked` | Uninstall is a recorded decision with a one-time code |
| Developer laptops | `hardened` with `allowUserStop: true`, or `standard` | The owner can stop it for a benchmark or a flight, and it still says goodbye. A higher `heartbeatAlertMinutes` (`60` or more) keeps sleeping laptops out of the `silent` list. |
| Shared or kiosk machines | `locked` | Users are not admins, and removal needs a code |

## Planned: macOS and Windows

Not available. The intended shape is the same profiles, MDM keys and protection levels, with the platform's own service manager in place of systemd: a launchd `LaunchDaemon` on macOS and a Windows service on Windows. What each level maps to on those platforms is not settled.
