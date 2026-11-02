---
title: Suricata and Snort
description: Load a SURICATA or SNORT feed as a rules file, alert first, then switch rules to drop on an inline IPS.
order: 13
nav: Suricata and Snort
sources: [vdb-site/api/internal/handler/detection_rule_feeds_publish.go, vdb-manager/scripts/go-processors/internal/defence/validate/network.go, cli/internal/defences/stack.go]
checked: [vdb-site@1a06d67, vdb-manager@1cb0079, cli@4c8c3b7]
updated: 02 Nov 2026
---

| Feed type | File | Engine |
|---|---|---|
| `SURICATA` | `suricata.rules` | Suricata |
| `SNORT` | `local.rules` | Snort 2 and Snort 3 |
| `SNORT_YARA` (legacy) | `snort.rules` and `rules.yar` | third-party catalogue rules |

Generated rules carry `msg`, `rev` and a `sid` between 3000000 and 3999999, a range Vulnetix keeps for its own rules. Check it against any local rules you already number in that range. A disabled rule is published commented out with `# `; an enabled rule is always published uncommented.

Snort and Suricata rules are written for a specific dialect. Use the feed type that matches your engine: a Suricata feed holds only Suricata rules.

## Fetch

```bash
#!/bin/sh
# /usr/local/bin/vulnetix-ids-update suricata.rules /etc/suricata/rules/vulnetix.rules
set -eu
FEED="https://vulnetix.com/feeds/<org-uuid>/<feed-uuid>"
FILE="$1"; DEST="$2"
TMP="$(mktemp)"
curl -fsSL "$FEED/$FILE" -o "$TMP"
[ "$(curl -fsSL "$FEED/$FILE.sha256")" = "$(sha256sum "$TMP" | cut -d' ' -f1)" ] || { rm -f "$TMP"; exit 1; }
install -m 0644 "$TMP" "$DEST"
rm -f "$TMP"
```

## Suricata

```yaml
# /etc/suricata/suricata.yaml
default-rule-path: /etc/suricata/rules
rule-files:
  - suricata.rules
  - vulnetix.rules
```

```bash
/usr/local/bin/vulnetix-ids-update suricata.rules /etc/suricata/rules/vulnetix.rules
suricata -T -c /etc/suricata/suricata.yaml        # test the configuration
suricatasc -c reload-rules                        # live reload, needs unix-command enabled
```

If you manage rules with `suricata-update`, it rewrites `suricata.rules` from its sources on every run. Keep `vulnetix.rules` as a separate entry in `rule-files` so `suricata-update` does not drop it.

Matches appear in `eve.json` as `event_type: alert` with the rule's `signature_id` and `signature`.

### Moving to drop

Rules are published with the action their author chose, usually `alert`. On an inline IPS (NFQUEUE, or AF_PACKET in IPS mode), promote a rule to `drop` once it has run clean. Do it in the fetch script after the checksum passes, so the next fetch does not undo it:

```bash
# promote one rule by sid
sed -i -E '/sid:3000123;/ s/^alert /drop /' /etc/suricata/rules/vulnetix.rules
```

The Vulnetix sid range is 3000000 to 3999999, so `/sid:3[0-9]{6};/` matches every generated rule.

## Snort 3

```lua
-- snort.lua
ips =
{
    variables = default_variables,
    rules = [[
        include /etc/snort/rules/local.rules
        include /etc/snort/rules/vulnetix.rules
    ]]
}
```

```bash
/usr/local/bin/vulnetix-ids-update local.rules /etc/snort/rules/vulnetix.rules
snort -c /etc/snort/snort.lua -T                   # validate
systemctl reload snort3                            # or restart, per your packaging
```

## Snort 2

```text
# snort.conf
include $RULE_PATH/vulnetix.rules
```

```bash
/usr/local/bin/vulnetix-ids-update local.rules /etc/snort/rules/vulnetix.rules
snort -T -c /etc/snort/snort.conf
systemctl restart snort
```

## Schedule it

```ini
# /etc/systemd/system/vulnetix-ids-update.service
[Service]
Type=oneshot
ExecStart=/usr/local/bin/vulnetix-ids-update suricata.rules /etc/suricata/rules/vulnetix.rules
ExecStartPost=/usr/bin/suricatasc -c reload-rules

# /etc/systemd/system/vulnetix-ids-update.timer
[Timer]
OnCalendar=hourly
RandomizedDelaySec=10m

[Install]
WantedBy=timers.target
```

```bash
systemctl enable --now vulnetix-ids-update.timer
```

The fetch exits non-zero on a checksum mismatch, so the reload is skipped and the previous rules stay loaded.

## The Vulnetix sensor does not run these

Snort and Suricata rules need a packet engine. The [Vulnetix sensor](/virtual-patching/runtime/sensor/) reports a Snort or Suricata rule as `no-engine` and does not run it.
