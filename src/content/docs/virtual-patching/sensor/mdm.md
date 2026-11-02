---
title: MDM enrollment
description: Enroll vulnetix-sensor on managed Linux devices with no person signing in, using an integration key your MDM puts on the device, with steps for Intune, JumpCloud, Fleet, Workspace ONE and config management tools.
order: 3
nav: MDM
sources: [vdb-site/docs/sensor-provisioning-api.md, cli/cmd/vulnetix-sensor/provision_cmds.go, cli/internal/sensor/provision/client.go, cli/deploy/sensor/install.sh]
updated: 02 Nov 2026
---

An MDM enrollment needs no person at the device. The MDM puts a private signing key on the device and runs the installer as root; the sensor signs its own enrollment with the key, and the site gives it a credential from the profile that lists the integration.

Linux only today. The vendors without Linux management are listed at the end, with the plan for each.

## How it works

1. An admin creates an **MDM integration** in the console under **Integrations → Device management**. The site generates an Ed25519 key pair, keeps the public key, and shows the private key (base64, a 32-byte seed) and its key id (`kid`) **once**. It is never stored. You can instead paste a public key whose private half you generated yourself.
2. The admin adds the integration to a [provisioning profile](/virtual-patching/sensor/provisioning-profiles/#matching) with credential mode `device-key` (recommended) or `org-key`. A profile with `user-key` refuses MDM enrollment with `409`, because no person is there to attribute it to.
3. The MDM writes the private key to `/etc/vulnetix-sensor/mdm.key`, mode `0600`, owner root, and runs `install.sh --enroll --mdm-key /etc/vulnetix-sensor/mdm.key --integration <uuid> --kid <kid>` as root.
4. The sensor sends `POST /v1/runtime/provisioning/enroll-mdm` with no `Authorization` header. The body carries the integration, `kid`, the sensor's host key, a device id, the time and a random nonce, signed with the key.
5. The site checks the signature against the integration's public key. It refuses (`401`) a bad signature, a timestamp more than 5 minutes from its clock, a nonce it has seen before, or a retired key or integration. On success it answers as a person enroll does, and the device appears in the devices list with an empty **Enrolled by** and the MDM device id.

The device id is `--mdm-device-id` if you pass one, otherwise `/sys/class/dmi/id/product_serial`, otherwise `/etc/machine-id`. Pass the MDM's own device id when you want the console row to match the MDM's.

To rotate a key, add a new key to the integration (it gets a new `kid`), push it and the new `kid` to devices, then retire the old key. Enrolled devices keep working, because the key is used only to enroll. Retiring a whole integration also leaves its devices running until you revoke them.

> [!CAREFUL] The key enrolls devices
> Anyone who can read the key can enroll a device under the integration's profile. With `device-key` that gets them one sensor credential, which only the sensor routes accept and which shows as a new row you can revoke. Keep the key in the MDM's secret store where it has one, and rotate it if it leaks.

## The script

Every provider below runs this script as root, with `MDM_KEY` set however the provider delivers secrets. It does nothing on a device that is already enrolled, so a provider that runs scripts on a schedule can run it again safely.

```sh
#!/bin/sh
# vulnetix-sensor-enroll.sh: run as root.
set -eu
VERSION=v3.156.0
INTEGRATION=<integration-uuid>
KID=<kid>
MDM_KEY="${MDM_KEY:-<private-key-base64>}"

[ -s /etc/vulnetix-sensor/credential ] && exit 0

install -d -m 0755 /etc/vulnetix-sensor
( umask 077; printf '%s\n' "$MDM_KEY" > /etc/vulnetix-sensor/mdm.key )
chmod 0600 /etc/vulnetix-sensor/mdm.key

curl -fsSL "https://raw.githubusercontent.com/Vulnetix/cli/$VERSION/deploy/sensor/install.sh" \
  | sh -s -- --enroll --mdm-key /etc/vulnetix-sensor/mdm.key \
      --integration "$INTEGRATION" --kid "$KID"
```

Needs `curl`, outbound HTTPS to `raw.githubusercontent.com`, `github.com` and `www.vulnetix.com`, systemd, and a correct clock (the 5 minute window). Most managed Linux devices sync time over NTP already.

## Intune

Microsoft Intune runs bash scripts on enrolled Linux devices as **platform scripts**. Supported distributions are listed on [Intune supported platforms](https://learn.microsoft.com/en-us/intune/fundamentals/ref-supported-platforms) (Ubuntu LTS and RHEL at the time of writing; the scripts page lists an older set).

1. In the Intune admin center, go to **Devices → Manage devices → Scripts and remediations → Platform scripts → Add → Linux**.
2. Upload `vulnetix-sensor-enroll.sh` with the key written into the `MDM_KEY` default.
3. Set **Execution context** to **Root**. The default, **User**, runs only when a user signs in and cannot write `/etc`.
4. Keep the default frequency. Intune runs the script again every 15 minutes by default; the script exits at once on an enrolled device.
5. Assign it to the device group.

Intune has no secret variables or file payloads for Linux, so the key is inside the script, readable by Intune admins who can view scripts. Microsoft also says not to put sensitive information in Linux custom configuration. If that is not acceptable, have the script fetch the key from a store the device can authenticate to instead of embedding it. Linux custom compliance scripts run as the user, not root, so they cannot be used for this. The first root script may ask the device user to consent.

Source: [Use custom settings and scripts for Linux devices in Intune](https://learn.microsoft.com/en-us/intune/device-configuration/templates/configure-custom-settings-linux), [custom compliance for Linux](https://learn.microsoft.com/en-us/intune/device-security/compliance/create-custom-script).

## JumpCloud

JumpCloud **Commands** run on Linux devices that have the JumpCloud agent, as the user you pick in **Run As**; Linux commands default to root. A command can carry attached files, which is how the key gets to the device without being in the script.

1. Go to **Device Management → Commands → + Command → Command → Linux**.
2. Paste the script, change the `MDM_KEY=` line to `MDM_KEY="$(cat /tmp/mdm.key)"`, and add `rm -f /tmp/mdm.key` on the line after it.
3. Attach the key as a file named `mdm.key`. An attached file lands at `/tmp/<filename>` unless you set another destination.
4. Run as root. Choose the device groups, and a trigger: **Run Manually** for existing devices, or **Run on Trigger** / the after-agent-install option for new ones.
5. Save and **Run Now**. Output and exit code are under **Commands → Results** for 30 days.

The attached file is stored in the JumpCloud console in the clear, so treat console access to the command as access to the key.

Source: [Create a command manually](https://jumpcloud.com/support/create-a-command-manually), [where attached files land](https://jumpcloud.com/support/configure-ssh-settings).

## Fleet

Fleet runs scripts on Linux hosts as root, in `/bin/sh`, once fleetd has script execution turned on. It is off by default: build the package with `fleetctl package --type=deb --enable-scripts` (or `rpm`), or set `ORBIT_ENABLE_SCRIPTS=true` in `/etc/default/orbit` on existing hosts and restart orbit. Fleet has secret variables, so the key is not in the script.

1. Add the key as a secret variable: **Controls → Variables**, named `FLEET_SECRET_VULNETIX_MDM_KEY` (or the GitOps equivalent). Fleet masks it in the UI and API and expands it on delivery.
2. In the script, set `MDM_KEY="$FLEET_SECRET_VULNETIX_MDM_KEY"`.
3. Save it under **Controls → Scripts**.
4. Run it on hosts: from the host page, `fleetctl run-script --script-path=vulnetix-sensor-enroll.sh --host=<host>`, or the scripts API. A run happens at the host's next check-in, with a 5 minute default timeout.
5. To cover new hosts automatically, add a policy that fails when the sensor is not enrolled, for example `SELECT 1 FROM file WHERE path = '/etc/vulnetix-sensor/credential';`, and set **Policies → Manage automations → Run script** to this script. Fleet runs it when the policy fails.

Source: [Scripts](https://fleetdm.com/guides/scripts), [Policy automation: run script](https://fleetdm.com/guides/policy-automation-run-script), [Secrets in scripts](https://fleetdm.com/guides/secrets-in-scripts-and-configuration-profiles), [Agent configuration](https://fleetdm.com/docs/configuration/agent-configuration).

## Workspace ONE

Omnissa Workspace ONE UEM manages Linux through Intelligent Hub for Linux. Its **Resources → Scripts** and Freestyle Orchestrator do not list Linux; use a **Custom Configuration** profile, which runs a Bash, Python 3, Puppet or Ansible script on the device.

1. Go to **Resources → Profiles & Baselines → Profiles → Add → Add Profile → Linux → Custom Configuration**.
2. Choose **Bash**, paste the script as the **Installation Script** with the key in the `MDM_KEY` default, and put `vulnetix-sensor uninstall` in the **Removal Script** (on a `locked` profile that needs `--code`, so leave it empty there).
3. Leave **Enforce Script** off to run it once, or turn it on to run it again at each Hub data transmit (the script exits at once on an enrolled device).
4. Assign the profile to the smart group.

Omnissa's docs do not say which user a Custom Configuration script runs as. Hub runs as a system service, so it is expected to be root; test on one device first. The key is inline in the profile. Workspace ONE encrypts **Variables** at rest and in transit, but documents them for Linux **Sensors** only, not for Custom Configuration.

Source: [Linux profiles](https://docs.omnissa.com/LinuxDeviceManagement-VSaaS/LinuxProfiles), [Sensors for Linux](https://docs.omnissa.com/LinuxDeviceManagement-VSaaS/SensorsforLinuxBasedDevices), [Requirements](https://docs.omnissa.com/LinuxDeviceManagement-VSaaS/RequirementsforWorkspaceONEUEMonLinux).

## Config management

Ansible, Puppet, Chef and Salt all run as root and have a secret store, so they are the simplest way to enroll Linux machines that no MDM manages. Create an integration for the tool, keep the key in its secret store (Ansible Vault, Hiera eyaml, Chef encrypted data bags or Vault, Salt pillar with GPG), and write it with mode `0600` before running the installer.

The full Ansible playbook is on [At scale](/virtual-patching/sensor/iac/#ansible). The tasks that matter:

```yaml
- ansible.builtin.copy: { dest: /etc/vulnetix-sensor/mdm.key, content: "{{ vulnetix_mdm_key }}\n", mode: "0600" }
  no_log: true
- ansible.builtin.shell: >
    curl -fsSL https://raw.githubusercontent.com/Vulnetix/cli/v3.156.0/deploy/sensor/install.sh
    | sh -s -- --enroll --mdm-key /etc/vulnetix-sensor/mdm.key --integration {{ vulnetix_integration }} --kid {{ vulnetix_kid }}
  args: { creates: /etc/vulnetix-sensor/credential }
```

Puppet:

```puppet
file { ['/etc/vulnetix-sensor']: ensure => directory, mode => '0755' }
file { '/etc/vulnetix-sensor/mdm.key': content => Sensitive(lookup('vulnetix::mdm_key')), mode => '0600', show_diff => false }
exec { 'vulnetix-sensor-enroll': command => '/bin/sh -c "curl -fsSL https://raw.githubusercontent.com/Vulnetix/cli/v3.156.0/deploy/sensor/install.sh | sh -s -- --enroll --mdm-key /etc/vulnetix-sensor/mdm.key --integration <uuid> --kid <kid>"', creates => '/etc/vulnetix-sensor/credential', require => File['/etc/vulnetix-sensor/mdm.key'] }
```

Chef:

```ruby
directory '/etc/vulnetix-sensor' do mode '0755' end
file '/etc/vulnetix-sensor/mdm.key' do content data_bag_item('vulnetix', 'sensor')['mdm_key']; mode '0600'; sensitive true end
execute 'vulnetix-sensor-enroll' do command 'curl -fsSL https://raw.githubusercontent.com/Vulnetix/cli/v3.156.0/deploy/sensor/install.sh | sh -s -- --enroll --mdm-key /etc/vulnetix-sensor/mdm.key --integration <uuid> --kid <kid>'; creates '/etc/vulnetix-sensor/credential' end
```

Salt:

```yaml
/etc/vulnetix-sensor/mdm.key:
  file.managed: [{ contents_pillar: vulnetix:mdm_key }, { mode: "0600" }, { makedirs: true }, { show_changes: false }]
vulnetix-sensor-enroll:
  cmd.run: [{ name: "curl -fsSL https://raw.githubusercontent.com/Vulnetix/cli/v3.156.0/deploy/sensor/install.sh | sh -s -- --enroll --mdm-key /etc/vulnetix-sensor/mdm.key --integration <uuid> --kid <kid>" }, { creates: /etc/vulnetix-sensor/credential }, { require: [{ file: /etc/vulnetix-sensor/mdm.key }] }]
```

## Jamf

Planned. Jamf Pro manages Apple devices only ([Jamf Pro](https://www.jamf.com/products/jamf-pro/)), so it applies once the macOS sensor ships as a launchd `LaunchDaemon`. The intended shape is a policy script that writes the key and enrolls, as on Linux. For Linux devices in a Jamf shop, use [config management](#config-management).

## Kandji

Planned. Kandji (now Iru) lists Apple, Windows and Android devices, not Linux ([device requirements](https://docs.iru.com/en/iru/requirements/device-requirements)). It applies once the macOS and Windows sensors ship.

## Mosyle

Planned. Mosyle manages Apple devices only ([mosyle.com](https://mosyle.com/)). It applies once the macOS sensor ships.

## Google endpoint

Planned for macOS and Windows. Google endpoint management offers only fundamental management and Endpoint Verification on Linux, with no script execution or file delivery ([feature comparison](https://knowledge.workspace.google.com/admin/devices/compare-google-endpoint-management-feature-sets), [Endpoint Verification](https://support.google.com/a/answer/9007320)), so it cannot enroll a Linux sensor. For Linux, use [config management](#config-management), or have users enroll themselves with [their own sign-in](/virtual-patching/sensor/byod-laptop/) under a profile that matches your domain.
