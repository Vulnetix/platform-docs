---
title: EOL policy
description: How the Quality Gate grades an end-of-life date into retired, within-30-days, this-quarter and next-quarter severities, and which of them fail a build.
order: 2
sources: [cli/internal/scan/eol_severity.go, cli/cmd/scan.go, cli/cmd/quality_gate_enforce.go, cli/cmd/config.go, saas/prisma/models/quality-gate.prisma]
checked: [cli@4c8c3b7, saas@50cedf37]
updated: 02 Nov 2026
---

With `--block-eol` (or the organization's **Block EOL**) on, the scan looks up the end-of-life date of each detected runtime (Go, Node.js, Python, Ruby version pins) and of each package the VDB has EOL data for. Each date falls into one horizon, and the horizon maps to a severity.

## Horizons

Checked in this order; the first that matches wins.

| Horizon | Matches an EOL date that is | Default severity |
|---|---|---|
| `retired` | today or in the past | `critical` |
| `within-30-days` | within the next 30 days | `high` |
| `this-quarter` | before the end of the current calendar quarter | `medium` |
| `next-quarter` | before the end of the next calendar quarter | `low` |
| beyond | later, or no parseable date | not reported |

Quarters are calendar quarters: Q1 January to March, Q2 April to June, Q3 July to September, Q4 October to December. A feed that marks a release EOL without a date counts as `retired`. Dates are read as `2006-01-02`, RFC 3339 or `2006/01/02`; anything else is "beyond".

Each horizon's severity is one of `skip`, `low`, `medium`, `high`, `critical`. `skip` means that horizon produces nothing at all.

## What fails the build

Only EOL components graded at or above the block floor fail the build. The floor is the scan flag `--block-eol-severity`, default `critical`. Everything graded below it is reported as approaching end of life and does not fail.

| Setup | Fails on |
|---|---|
| Defaults | `retired` only (`critical` meets the `critical` floor) |
| `--block-eol-severity high` | `retired` and `within-30-days` |
| `--block-eol-severity low` | every reported horizon |
| `retired` set to `high`, floor `critical` | nothing fails; retired components are reported |

The breach output has one entry per severity, so it reads as a priority list.

> [!CAREFUL] The floor is a scan flag, not an org setting
> There is no Quality Gate field for the block floor yet, so an organization cannot make next-quarter EOLs fail every pipeline. The buckets decide the severity org-wide; each pipeline decides the floor with `--block-eol-severity`.

## The buckets are read only with Block EOL

The scan reads the four severities from the organization only when `--block-eol` is in effect, whether from the flag or from the organization's **Block EOL**. With Block EOL off, EOL dates are not graded at all.

## Configure

```bash
vulnetix config set eol-policy --next-quarter-severity skip --this-quarter-severity low
vulnetix config set quality-gate --block-eol true
vulnetix config get eol-policy
```

`config set eol-policy` writes only the buckets you pass. In a `QualityGate` document:

```yaml
apiVersion: vulnetix.com/v1
kind: QualityGate
metadata:
  name: default
spec:
  eol:
    block: true
    severities:
      nextQuarter: skip
      thisQuarter: low
      within30Days: high
      retired: critical
```

Jail's `EOL` rules grade with the same horizons; see [Jail rules](/quality-gates/jail/rules/).
