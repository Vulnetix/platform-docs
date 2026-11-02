---
title: Quickstart
description: From a finding with no fix to a rule running in log-only mode at your edge, and recorded so the next scan knows.
order: 2
sources: [cli/cmd/defend.go, cli/internal/defences/defences.go, cli/internal/defences/control.go, cli/internal/scanopts/failon.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

This walks one finding through the CLI. It assumes the CLI is installed and signed in ([CLI install](/cli/get-started/install/)) and that you have run `vulnetix scan` in the project, so the CLI knows which package carries the advisory.

## 1. See what exists

```bash
vulnetix defend CVE-2025-12345
```

The output has a **BLOCK** section (virtual patches) and a **DETECT** section (countermeasures). Each rule shows its confidence, the mode it is safe to start in, its false-positive risk and what it does not cover. Formats your repository suggests are listed first and marked *fits your repo*: the CLI found Terraform for `aws_wafv2_web_acl`, a `cloudflare_ruleset`, a `.conf` with `SecRule`, an `nginx.conf`, `suricata.yaml` or `snort.conf`/`snort.lua`. That is inference from files, not proof of what is deployed.

Reading needs no plan. Without Pro you see the counts and formats only.

## 2. Save the rule your edge loads

```bash
vulnetix defend CVE-2025-12345 --for modsecurity -O defences/
```

This writes `defences/<rule-id>-modsecurity.conf`. The body is checked against the SHA-256 the database sends; a body that does not match is not written. Use `--for fits` to save every format your repository suggests, or `--for all`.

## 3. Load it in log-only mode

Most rules start in `log`. Load the file, watch the logs for matches on legitimate traffic, then switch to block. For ModSecurity:

```apache
# modsecurity.conf, or the file your server includes
SecRuleEngine DetectionOnly
Include /etc/modsecurity/vulnetix/*.conf
```

The other systems are on the [runtime pages](/virtual-patching/#three-ways-to-get-a-rule-into-production).

## 4. Record the control

```bash
vulnetix defend CVE-2025-12345 --for modsecurity \
    --record "ModSecurity, prod-eu ingress" --until 2027-01-10
```

This writes `.vulnetix/controls.json` and `.vulnetix/vex-compensating-controls.json` and sends the VEX statement to Vulnetix. The finding stays `affected` and counted. The next `vulnetix scan` lists it under **PROTECTED** (a block rule) or **MONITORED** (a detection, or a block rule still in `log` mode) until the date passes. Without `--until` the control lasts 90 days.

## 5. Gate the pipeline

```bash
vulnetix scan --fail-on unprotected
```

Fails when a finding has no fix and no unexpired recorded control. Add `--accept-defended` to let a recorded control satisfy the severity, exploit and malware gates for the finding it covers.

## Next

- Serve the rule to many systems from one URL: [Detection rule feeds](/virtual-patching/feeds/detection-rule-feeds/).
- Run it inside the workload with a person approving each block: [Runtime sensor](/virtual-patching/runtime/sensor/).
