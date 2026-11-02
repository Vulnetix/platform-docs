---
title: Enroll your own laptop
description: Install vulnetix-sensor on a Linux laptop you use, enroll it with your own Vulnetix sign-in, and leave again when you need to.
order: 1
nav: Your own laptop
sources: [vdb-site/docs/sensor-provisioning-api.md, cli/cmd/vulnetix-sensor/main.go, cli/deploy/sensor/install.sh, cli/cmd/auth.go]
updated: 02 Nov 2026
---

Your sign-in decides which [provisioning profile](/virtual-patching/sensor/provisioning-profiles/) the laptop gets. The profile, not you, sets the sensor's mode, feeds and protection level.

## 1. Check the prerequisites

| | |
|---|---|
| OS | Linux on `amd64` or `arm64`, with systemd. macOS and Windows are planned. |
| Root | You can run `sudo`. The installer writes to `/usr/local/bin`, `/etc/vulnetix-sensor` and `/etc/systemd/system`. |
| A profile | An org admin has an enabled profile whose match includes your email address, your email domain, or `*`. Ask them: the console can show which profile an email address would get. |
| The CLI | `vulnetix` installed: [CLI install](/cli/get-started/install/). |

## 2. Sign in with the home store

```bash
vulnetix auth login --store home
```

This writes `~/.vulnetix/credentials.json`. Use `--store home` rather than `keyring`: the enroll step runs under `sudo`, and a desktop keyring belongs to your user session, which root cannot read.

The key the login mints names you as a person. A tenant org key or a service account key cannot enroll a device (`403`, "enroll as a person").

## 3. Install and enroll

```bash
curl -fsSL https://raw.githubusercontent.com/Vulnetix/cli/v3.158.0/deploy/sensor/install.sh \
  | sudo sh -s -- --enroll --from-cli-login
```

`install.sh --enroll` downloads `vulnetix-sensor-linux-<arch>` for that release, checks it against `checksums.txt` (a mismatch stops the install), installs it to `/usr/local/bin/vulnetix-sensor`, and then runs `vulnetix-sensor enroll --from-cli-login`. Enroll:

1. reads the credential your login wrote. Under `sudo` it reads `~/.vulnetix/credentials.json` of the user who ran `sudo` (`SUDO_USER`), not root's;
2. calls `POST /v1/runtime/provisioning/enroll` with the sensor's host key, hostname, OS, architecture and version;
3. writes the credential the profile hands out to `/etc/vulnetix-sensor/credential` and the profile's configuration to `/etc/vulnetix-sensor/config.json`;
4. installs and starts the systemd unit, which loads the credential with `LoadCredential=`.

Add `--profile <uuid>` to ask for a particular profile. It must still match you. Add `--no-start` to write the credential, config and units without enabling or starting them, or `--print` to print the units your profile would get and contact nothing.

Running enroll again on the same machine is safe: the site revokes the old credential and issues a new one on the same device.

## 4. Check it

```bash
vulnetix-sensor status
```

It shows whether the host is enrolled, the profile, the protection level, the mode, the `configEtag` of the configuration it runs, and the service's state. It exits `3` when the service is not active. `vulnetix-sensor config` prints the whole profile configuration as JSON.

Enroll itself ends by printing the device id, profile, credential scheme, mode, protection level, feed count and service state.

## What the console shows

On **Sensor Provisioning** your laptop appears under the profile's devices with your email as **Enrolled by**, its hostname, OS, architecture, version and a tamper state. On **Sensors** (`/resolve/sensor`) it appears as a sensor like any other, with the profile name next to it.

| Tamper state | Means |
|---|---|
| `ok` | Running and reporting |
| `stopped` | The sensor said goodbye: it was stopped, uninstalled or upgraded, or got `SIGTERM` (a shutdown does this) |
| `silent` | No report for longer than the profile allows (15 minutes by default), with no goodbye |
| `revoked` | An admin revoked the device, or it was uninstalled |

Your admin can see each of these. A laptop that is off shows `stopped` from its shutdown, then `ok` again at the next boot.

## What you can stop

That depends on the profile's protection level. See [Protection](/virtual-patching/sensor/protection/) for the detail.

| Level | `sudo systemctl stop vulnetix-sensor` | Survives reboot | Uninstall |
|---|---|---|---|
| `standard` | Works. The console shows `stopped`. | Yes | `sudo vulnetix-sensor uninstall` |
| `hardened` | Refused, unless the profile sets `allowUserStop`. Without `allowUserStop`, a guard timer starts it again within a minute if it is stopped another way. | Yes | `sudo vulnetix-sensor uninstall` |
| `locked` | As `hardened` | Yes | `sudo vulnetix-sensor uninstall --code <code>`, with a one-time code from your admin |

A user without `sudo` cannot stop or reconfigure the unit at `hardened` or `locked`.

## Leave

```bash
sudo vulnetix-sensor uninstall
```

This tells the site (a goodbye with reason `uninstall`, and the uninstall itself), removes the sensor and guard units, the polkit rule, the credential and the config, and stops the sensor. The site marks the device revoked. The binary `/usr/local/bin/vulnetix-sensor` and the sensor key in `/var/lib/vulnetix-sensor` are left; delete them by hand if you want them gone. On a `locked` profile ask an admin for an uninstall code first: it is valid once, for 24 hours, for that one device. The site checks it before anything is stopped, so a wrong code changes nothing.

```bash
sudo vulnetix-sensor uninstall --code <code>
```

## Troubleshooting

| You see | Cause | Fix |
|---|---|---|
| `404 no provisioning profile matches you@example.com` | No enabled profile matches your email or domain | Ask an admin to add you, or to check which profile your address resolves to |
| `403 enroll as a person` | The credential on disk is an org key or a service account | Run `vulnetix auth login --store home` as yourself |
| `401` from enroll | Your CLI key was rotated or revoked | Run `vulnetix auth login --store home` again |
| The sensor logs that its credential was revoked, and stops reporting | An admin revoked the device | Ask why; enroll again only if they agree |
| `the keyring is not reachable under sudo` | You signed in with `--store keyring` | Run `vulnetix auth login --store home` as yourself, then enroll again |
| `sign in first with vulnetix auth login --store home` | No CLI credential for the user who ran `sudo` | Sign in as that user, or pass `--api-key` and `--org-id` |
| `systemctl stop` says the operation is refused | The profile is `hardened` or `locked` | Expected. Use `vulnetix-sensor uninstall`, or ask for `allowUserStop` |
| `this sensor's profile is locked: get an uninstall code ...` | `uninstall` without `--code` on a `locked` profile | Ask an admin for a code |
| `enroll needs root: run it with sudo` | Enroll was run without `sudo` | Run it with `sudo` |
| `warning: /etc/vulnetix-sensor.env sets Vulnetix credentials, which win over the device credential` | An older install left an env file with credentials | Remove the `VULNETIX_*` lines from it so the sensor reports as this device |

## Next

- What the sensor is doing: [Runtime sensor](/virtual-patching/runtime/sensor/).
- Every subcommand and file: [Sensor flags](/virtual-patching/reference/sensor-flags/#enrollment).
