---
title: Provisioning profiles
description: For org admins, how a profile decides which devices it covers, which credential they get and what configuration they run, and how to revoke, uninstall and watch them.
order: 2
nav: Provisioning profiles
sources: [vdb-site/docs/sensor-provisioning-api.md, vdb-site/docs/sensor-feeds-api.md, vdb-site/api/internal/handler/sensor_provisioning.go, saas/prisma/models/runtime.prisma, cli/internal/sensor/agent/agent.go]
updated: 02 Nov 2026
---

A profile replaces the hand-written `/etc/vulnetix-sensor.env` and the per-host flags. It is kept on the site; every device enrolled under it pulls its configuration from there.

Profiles live on **Sensor Provisioning** (`/resolve/sensor-provisioning`, in the Configuration group). Every route behind it needs a signed-in person: an API key or a sensor credential gets `403`.

## Roles

| Action | Owner or admin | Member |
|---|---|---|
| View profiles, devices, org feeds and connectors | Yes | Yes |
| Release or confirm a hold on **Sensors** | Yes | Yes |
| Create, edit or delete a profile | Yes | No |
| Add, edit or delete an org feed or a [threat intel connector](/virtual-patching/sensor/threat-intel-connectors/) | Yes | No |
| Revoke a device, or issue an uninstall code | Yes | No |
| Change a sensor's mode, or promote or demote a rule | Yes | No |

## Create a profile

1. Open **Sensor Provisioning** and add a profile.
2. Name it, set its priority, and say who it matches.
3. Pick the credential mode.
4. Fill in the sensor configuration.
5. Save. A device that enrolls from now on and matches gets it.

## Matching

| Match field | Matches | Limit |
|---|---|---|
| `emails` | A person whose sign-in email is exactly this, case-insensitive | 200 |
| `domains` | The part of the email after `@`. `*` matches everyone in the org. | 50 |
| `mdmIntegrations` | A device enrolling with a key from that [MDM integration](/virtual-patching/sensor/mdm/) | |

Profiles are tried by `priority`, highest first. The first **enabled** profile that matches wins; a disabled profile is skipped. A person may ask for a profile by uuid (`--profile`), and it must still match them. An MDM enroll without `--profile` gets the highest-priority profile that lists its integration.

The console can show which profile a given email would get (`GET /v1/runtime/provisioning/resolve?email=`), which is the quickest check when a person reports a `404`.

## Credential modes

| `credentialMode` | The device gets | Who can enroll | Revoke one device | Use when |
|---|---|---|---|---|
| `device-key` (default) | `Sensor <deviceUuid>:<secret>`. Only the `/v1/runtime/*` sensor routes accept it. The site keeps only a SHA-256 of the secret. | A person or an MDM | Yes | Almost always. A stolen credential can only report as that sensor, and you revoke it by device. |
| `user-key` | The enrolling person's own API key, the one `vulnetix auth login` minted. Every request is attributed to them. | A person only. An MDM enroll is refused with `409`. | No: rotate that person's key, which also signs them out of the CLI | Attribution to a named person matters more than per-device revocation |
| `org-key` | The tenant API key, as an env file holds it today | A person or an MDM | No: rotating the org key affects every integration that uses it | Migrating hosts that already run on the org key, without changing what they hold |

## Configuration

The `config` block is what every device under the profile runs. A flag given on the device's command line still wins over it ([precedence](/virtual-patching/reference/sensor-flags/#precedence)).

| Field | Values | Empty or unset | Same as flag |
|---|---|---|---|
| `mode` | `monitor`, `guard`, `enforce` | `monitor` | `--mode` |
| `hold` | A Go duration, e.g. `15m` | `15m` | `--hold` |
| `feeds` | Up to 100 references: signed feed URLs, `catalog:<id>` or `org:<uuid>`, chosen in the editor's feed picker ([Rule feeds](/virtual-patching/sensor/feeds/)) | A new profile saved without feeds gets the 21 Vulnetix STIX bundles; an explicit empty list loads none | `--feed` |
| `feedKey` | Base64 Ed25519 public key | The key pinned in the sensor | `--feed-key` |
| `egressListen` | An address, e.g. `127.0.0.1:3128` | No outbound proxy | `--egress-listen` |
| `dnsListen` | A UDP address, e.g. `127.0.0.1:53` | No DNS guard | `--dns-listen` |
| `forward` | `["siem"]` copies DNS and egress decisions to Guardian | Nothing forwarded | `--forward` |
| `inventoryEvery` | A Go duration | `6h` | `--inventory-every` |
| `protection` | `standard`, `hardened`, `locked` ([Protection](/virtual-patching/sensor/protection/)) | Set it on every profile | none |
| `allowUserStop` | `true` lets `systemctl stop` work at `hardened` and `locked` | `false` | none |
| `heartbeatAlertMinutes` | 1 to 10080 | `15` | none |

Values are checked when you save: an unknown mode, protection or credential mode, a duration that does not parse, a feed reference that is not one of the [three forms](/virtual-patching/sensor/feeds/#reference-forms), an unavailable catalog feed, or more than 100 feeds, 200 emails or 50 domains is refused.

## How edits reach devices

The `configEtag` is the SHA-256 of the configuration and the profile uuid, so it changes exactly when what the device runs changes. A device learns of an edit in two ways:

| Path | How it works |
|---|---|
| Decisions long-poll | An enrolled sensor holds `GET /v1/runtime/decisions` open. The answer carries the profile's current `configEtag`; the site re-reads it about every 2 seconds and answers early when it differs from the etag the sensor runs. The sensor then pulls the new configuration within 10 seconds. |
| Config poll | Every 5 minutes the device pulls `GET /v1/runtime/provisioning/config` with the etag it holds; an unchanged profile answers `304`. This is the fallback when the long-poll is not running. |

An edit reaches a connected sensor within seconds, and every sensor within about 5 minutes. On a change the sensor writes the new configuration, applies a new mode, hold time or feed list live, and restarts itself when the change needs one (a new listener, forwarding or the inventory interval). Nothing is reinstalled.

Changing `credentialMode` on a profile applies to devices that enroll after the change. Existing devices keep the credential they were issued until they enroll again.

## Devices

The devices list shows every enrolled install: profile, hostname, OS, architecture, sensor version, who enrolled it (empty for an MDM enroll), the MDM integration and device id, the credential mode, the `configEtag` it last pulled, its tamper state and when it was last seen. Expand a row for the sensor's CPU, memory and pass timings ([Performance and metrics](/virtual-patching/sensor/performance/)).

### Tamper states

| State | Means | Set by |
|---|---|---|
| `ok` | Registered and reporting | Each register |
| `stopped` | The sensor sent a goodbye with a reason: `signal`, `stop`, `uninstall` or `upgrade`. A host shutdown shows as `signal`. | The sensor, on `SIGTERM` or uninstall |
| `silent` | Nothing heard for longer than the profile's `heartbeatAlertMinutes` (15 if unset), and no goodbye | Computed when you look |
| `revoked` | Revoked by an admin, or uninstalled | The site |

`silent` is the one to chase. A sensor that is stopped politely says so; one that is killed with `SIGKILL`, cut off from the network, or on a host that lost power goes silent instead.

### Revoke

Revoke a device from its row. Its credential stops working on its next request (`401`); the sensor stops reporting and says so in its log. Revoking does not remove the software. With `user-key` and `org-key` there is no per-device credential to stop: revoking marks the device, and you rotate the key itself.

### Uninstall codes

For a device under a `locked` profile, issue an uninstall code from its row. The code is valid once, for 24 hours, for that one device. The person runs `sudo vulnetix-sensor uninstall --code <code>`; the sensor sends it to the site, and only on `200` removes itself and is marked revoked. At `standard` and `hardened` no code is needed and uninstall only records itself.

### Delete a profile

A profile with enrolled devices cannot be deleted (`409`) unless you choose to revoke its devices at the same time.

## Config as code

A profile is the [`RuntimeSensorPolicy`](/platform-iac/kinds/runtime-sensor-policy/) kind of [Platform IaC](/platform-iac/), in the virtual patching group of the [kind catalogue](/platform-iac/kinds/catalogue/#virtual-patching). The config engine applies it, with the console's own checks, and the profile's feeds can refer to a [`DetectionRuleFeed`](/platform-iac/kinds/detection-rule-feed/) by name. Profiles are also managed in the console and through the `/v1/runtime/provisioning/*` routes.
