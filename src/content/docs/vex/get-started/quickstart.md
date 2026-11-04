---
title: VEX quickstart
nav: Quickstart
description: Apply a vendor's VEX document to a scan with --vex, read how many findings it hid, and check the document with vulnetix vex validate.
order: 1.5
sources: [cli/cmd/vex.go, cli/cmd/scan.go, cli/internal/vex/read.go, cli/internal/vex/vex.go]
checked: [cli@v4.17.1]
updated: 04 Nov 2026
---

A supplier's VEX document says which of its vulnerabilities do not affect your product. This page applies one to a scan so the quality gates stop counting those findings, then checks the document is usable.

## Prerequisites

- The Vulnetix CLI on your `PATH`, v4.2.0 or later for `--vex` ([installing the CLI](/cli/get-started/install/)).
- A VEX document in OpenVEX, CycloneDX VEX or CSAF VEX. No Vulnetix credentials are needed to apply it.

## 1. Look at the document

Save the vendor's file, for example `vendor.openvex.json`:

```json
{
  "@context": "https://openvex.dev/ns/v0.2.0",
  "@id": "https://vex.example.com/acme/2026-001",
  "author": "Example Vendor",
  "timestamp": "2026-11-01T00:00:00Z",
  "version": 1,
  "statements": [
    {
      "vulnerability": { "name": "CVE-2021-23337" },
      "products": [ { "@id": "pkg:npm/lodash@4.17.20" } ],
      "status": "not_affected",
      "justification": "vulnerable_code_not_in_execute_path"
    }
  ]
}
```

List what it asserts:

```bash
vulnetix vex ls --vex vendor.openvex.json
```

```text
Vulnerability         Status              Justification               Product                   Source
CVE-2021-23337        not_affected        vulnerable_code_not_in_...  pkg:npm/lodash@4.17.20    vendor.o...

1 statement(s) from 1 document(s)
```

## 2. Apply it to a scan

```bash
vulnetix scan --vex vendor.openvex.json
```

`--vex` also takes a directory or an `https://` URL, and can be repeated. Statements are applied once, before the quality gates, so every gate honours them.

## 3. Read the count

In a repository that depends on `lodash` 4.17.20, the scan prints the VEX result on stderr:

```text
VEX: 1 statement(s) from 1 document(s), 1 hidden as VEX not affected, 0 effective
  CVE-2021-23337       VEX not affected (vendor.openvex.json)
```

Only `not_affected` and `fixed` hide a finding. A statement that matched no finding adds a `note:` line asking you to check it describes this product. The hidden finding stays in `.vulnetix/sbom.cdx.json` with an `analysis` block.

## 4. Validate before relying on it

A scan fails only on a document it cannot parse. `vex validate` runs the semantic checks:

```bash
vulnetix vex validate --vex vendor.openvex.json
```

```text
1 statement(s) across 1 document(s)

[OK] No problems found.
```

It exits `1` on a fatal problem, such as `not_affected` with no justification. Run it in CI ahead of the scan.

## Next

- [VEX in a scan](/vex/scans/vex-file/) for directories, URLs and declared VexSource documents.
- [vex ls, validate and merge](/vex/commands/ls-validate-merge/) for every check.
- [vulnetix vex apply](/vex/commands/apply/) to apply VEX to an SBOM without scanning.
- [VEX sent to Vulnetix](/vex/suppression/sent-to-vulnetix/) for what an authenticated scan uploads.
