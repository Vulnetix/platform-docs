---
title: VEX in a scan
nav: --vex-file
description: Apply third-party VEX documents to a scan with --vex-file so every quality gate honours them, and read the summary line that says how many findings VEX hid.
order: 1
sources: [cli/cmd/scan.go, cli/cmd/vex.go, cli/internal/scanopts/fromcobra.go, cli/internal/vex/read.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

`--vex-file` and `--no-vex` are registered on every scan command: `scan`, `sca`, `sast`, `secrets`, `containers` and `iac`.

```bash
vulnetix sca --vex-file vendor.openvex.json
vulnetix scan --vex-file ./vex/ --severity high
vulnetix sca --vex-file ./vex/ --no-vex     # --no-vex wins
```

| Flag | Default | Description |
|---|---|---|
| `--vex-file` | | VEX file or directory to apply before the gates run. Repeatable. |
| `--no-vex` | `false` | Ignore every `--vex-file` |

## Where it is applied

The statements are matched against the package vulnerabilities in the scan's SBOM, once, immediately before the quality gates. Every gate therefore honours VEX. A finding closed by a `not_affected` or `fixed` statement is removed from the gate input but stays in the SBOM with its `analysis` block, and the SBOM file is rewritten with the annotations.

A document that cannot be read or parsed fails the scan, rather than silently letting the gate run with fewer statements than you asked for.

## What the output says

The count of hidden findings is printed on stderr, so `-o json` and CycloneDX output on stdout stay clean:

```text
VEX: 12 statement(s) from 1 document(s), 12 hidden as VEX not affected, 0 effective
  CVE-2021-23337       VEX not affected (vendor.openvex.json)

  1 packages | 0 vulnerabilities | 12 hidden as VEX not affected
```

The label is "VEX not affected" or "VEX fixed", never "suppressed by rule". A VEX statement is its author's assertion, not an ignore rule your team wrote, and these findings are not reported to Vulnetix as rule applications.

## What is sent to Vulnetix

When the scan is authenticated, the `--vex-file` documents are sent with origin `scan_vex_file`, tied to this run's SCA snapshot. The VEX files the scan's own reconciliation wrote under `.vulnetix/` are sent with origin `reconcile`. See [VEX sent to Vulnetix](/vex/suppression/sent-to-vulnetix/).

## In CI

```yaml
- name: Scan, honouring vendor VEX
  run: vulnetix scan --vex-file .vulnetix/vendor-vex/ --severity high
  env:
    VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
    VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
```

Check the documents first with `vulnetix vex validate --vex .vulnetix/vendor-vex/`: the scan does not run the semantic checks.
