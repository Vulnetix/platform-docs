---
title: Troubleshooting the sensor
description: What to check when a sensor does not update itself, does not pick up a profile change, is not analysed, shows packages as not checked, or rolled an update back.
order: 10
nav: Troubleshooting
sources: [cli/cmd/vulnetix-sensor/selfupdate.go, cli/cmd/vulnetix-sensor/selfupdate_safety.go, cli/cmd/vulnetix-sensor/updatehealth.go, cli/cmd/vulnetix-sensor/provision_cmds.go, cli/internal/sensor/provision/units.go, vdb-site/api/internal/handler/runtime_analysis_state.go, vdb-site/docs/runtime-sensor-api.md]
checked: [cli@d84127e34, vdb-site@07561f7]
updated: 05 Nov 2026
---

The sensor runs as two systemd units: `vulnetix-sensor.service` (the sensor) and `vulnetix-sensor-guard.timer`, which runs `vulnetix-sensor-guard.service` as root every minute. The guard keeps the units in step with the profile, restores a stopped sensor under hardened and locked protection, and installs new releases ([Self-update](/virtual-patching/sensor/provisioning-profiles/#self-update)).

Most of what follows needs a shell on the host. Start with:

```sh
vulnetix-sensor status
systemctl status vulnetix-sensor.service vulnetix-sensor-guard.service
journalctl -u vulnetix-sensor-guard.service -u vulnetix-sensor.service --since -1h
```

## It does not update itself

- **The profile turns it off.** `"autoUpdate": false` pins the sensor. A release with a higher major version is held until the profile sets `"allowMajorUpdate": true`; the sensor list says which release is waiting.
- **The last check failed.** The guard retries after 10 minutes, 30, 2 hours, then 6. The journal says why: `guard: self-update not applied: …`. A host behind a proxy needs `HTTPS_PROXY` in the sensor's environment file (`/etc/vulnetix-sensor.env`), which the guard reads too; a host with no route to GitHub needs a [mirror](/virtual-patching/sensor/provisioning-profiles/#self-update) (`updateBaseUrl`).
- **The guard is not the unit's binary.** The guard replaces only the binary its unit runs, and only when it can write it. A sensor started by hand from another path, or installed on a read-only file system, logs `guard: self-update skipped: …` once and is left alone.
- **The release was rolled back here before.** A release that did not reach the server after its swap is restored to the previous one and never taken again on that host; the next release is. The sensor list shows "Rolled back vX" with the reason.
- **An update is waiting to prove itself.** After a swap nothing newer is taken until the new sensor has reported to the server, or the guard has rolled it back.
- **The sensor is older than v3.165.** It has no self-update. Upgrade it once with `install.sh`.

### The guard is stuck in `activating`

A guard unit written by a sensor before v4.10 ran the previous binary as `vulnetix-sensor.prev guard-rescue`. A previous binary that did not know that word started as a second sensor, and the guard never finished, so nothing after it ran. A current sensor rewrites its guard unit to the `--guard-rescue` form with a five-minute limit on its own. To unstick a host still on the old unit, remove the previous binary and restart the guard; the guard then updates the sensor and rewrites its unit:

```sh
sudo systemctl stop vulnetix-sensor-guard.service
sudo rm /usr/local/bin/vulnetix-sensor.prev
sudo systemctl start vulnetix-sensor-guard.service
```

The next update writes a new `.prev`.

## A profile change does not show

The running sensor polls its profile and logs `profile "<name>" config changed (<old> -> <new>)` within seconds of an edit; a change that needs a restart (a listener, forwarding, the inventory interval) restarts it. `vulnetix-sensor status` run as an ordinary user reads the copy written at enrolment, because the live copy is in a directory only root can read; it says so. Run it with `sudo` to see the configuration the sensor runs.

## A host is not analysed

Open **Sensors**, the **Packages** lens, and read the analysis line.

| It says | Means |
|---|---|
| Waiting to be checked | The package set changed and the analysis is queued. It is handed on within a minute, or as soon as the host's previous analysis finishes |
| Being checked | Handed on; findings appear when the pipeline finishes, usually within minutes |
| The last check failed | The reason follows. It is retried every 30 minutes; **Re-check now** tries at once |
| Too large to check | The host's SBOM is over the 25 MiB analysis cap |
| Not checked | No package carries a distribution package URL (an old sensor), or the organisation's plan does not include host analysis |

An unchanged host is not analysed again on its own. **Re-check now** checks its packages against the current advisories.

## Packages show as not checked

"Not checked: distribution" means the vulnerability database holds no advisories for the host's distribution, so its packages are not matched: that is not the same as clean. "Not checked: sensor too old" means the sensor sent no distribution package URL; it goes away once the sensor updates. See [Coverage](/virtual-patching/sensor/packages-and-findings/#coverage).

An "incomplete report" banner means the sensor could not read one of the package databases (the reason is shown) and the list is the last complete one. A NixOS or Gentoo host has no database the sensor reads.

## Findings stay open after a fix

An upgrade resolves the findings of the old version once the host reports again (within minutes of the package change) and the analysis finishes. A finding that stays open is either still affected at the new version, or was held: an analysis that would resolve more than half of a host's findings at once resolves nothing, because that is usually a package database that was not read. The next complete report and analysis settles it.

A host that is gone for good is resolved by retiring it (**Retire host**), or automatically after 30 days without a report.
