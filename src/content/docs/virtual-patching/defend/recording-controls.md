---
title: Recording a control
description: What defend --record writes, how a recorded control changes scan output and gates, and when it expires.
order: 2
nav: Recording controls
sources: [cli/cmd/defend.go, cli/internal/defences/control.go, cli/internal/scanopts/failon.go, cli/internal/scanopts/fromcobra.go, cli/cmd/scan.go, cli/cmd/scan_report.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

A recorded control is your statement that a rule is deployed. The CLI cannot see your WAF, so it cannot check, and every output says so.

```bash
vulnetix defend CVE-2025-12345 --for modsecurity \
    --record "ModSecurity, prod-eu ingress" --until 2027-01-10
```

## Which lane

The lane comes from, in order: the rule being saved with `--for`, the first format named in `--for`, then `--lane`. With none of them the command fails with `say what kind of control this is: --for <format> or --lane block|detect`.

To record a control you deployed by other means (a rule you wrote yourself, a vendor rule):

```bash
vulnetix defend CVE-2025-12345 --lane block --mode block \
    --record "F5 ASM signature 200101234, all ingress" --package legacy-xml
```

## What is written

### `.vulnetix/controls.json`

```json
{
  "version": 1,
  "controls": [
    {
      "vulnId": "CVE-2025-12345",
      "package": "legacy-xml",
      "version": "3.1.4",
      "ecosystem": "maven",
      "lane": "block",
      "kind": "MODSECURITY",
      "where": "ModSecurity, prod-eu ingress",
      "recordedAt": "2026-11-02T03:00:00Z",
      "until": "2027-01-10T23:59:59Z",
      "mode": "log",
      "ruleSha256": "…"
    }
  ]
}
```

One entry per package the advisory is on in the last scan (or the `--package` you named). Recording again for the same advisory and package replaces the entry.

### `.vulnetix/vex-compensating-controls.json`

An OpenVEX document regenerated from every unexpired control. Each statement is `affected`, with an action statement of the form:

```text
compensating-control: ModSecurity, prod-eu ingress (log only) until 2027-01-10
```

The suffix is `(blocking)`, `(log only)` or `(detection only)`. A virtual patch never makes a package `not_affected`, so the statement never says so. When no control is active the file is deleted. The document is also sent to Vulnetix as VEX with origin `defend`.

Commit both files so CI sees the same controls.

## In `vulnetix scan`

| Group | When |
|---|---|
| **PROTECTED** | An unexpired control in the block lane whose mode is not `log`. A `--lane block` record with no `--mode` and no rule counts as blocking, so pass `--mode log` if the rule only logs. |
| **MONITORED** | An unexpired detection, or a block-lane rule still in `log` mode. It stops nothing. |
| needs action | No control, or the control expired. The reason says which. |

The finding stays counted in every case.

`scan` also runs the defence lookup for every package whose advisories have no fix and prints one line under it:

| Line | Meaning |
|---|---|
| `◆ block …` / `◆ detect …` | Rules exist, with their formats |
| `◆ 2 block rules and 1 detection exist · Pro unlocks the rules` | They exist; bodies need Pro |
| `◆ nothing published for this yet` | Asked, and nothing is built. It does not mean the vulnerability cannot be defended. |
| `◆ not indexed: …` | The identifier is not one the database can look up |
| `◆ not checked (…)` / `◆ lookup failed (…)` | No answer, which is not the same as none |

`--hide defences` skips the lookup.

## Gates

| `scan` flag | Effect |
|---|---|
| `--fail-on unprotected` | Fails when a finding has no fix and no unexpired recorded control |
| `--accept-defended` | An unexpired recorded control satisfies the severity, exploit and malware gates for the finding it covers. Off by default, because the CLI cannot confirm the rule is live. |

## Expiry

A control expires at the end of its `--until` day, or 90 days after it was recorded. The finding then returns to needs action, because a compensating control is a loan against a patch that has not arrived. Record it again with a new date if the rule is still the only defence.
