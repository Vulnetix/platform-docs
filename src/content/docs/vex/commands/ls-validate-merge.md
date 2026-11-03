---
title: vex ls, validate and merge
description: List the statements in a set of VEX documents, check them for problems that make a statement unusable, and merge them into one OpenVEX 0.2.0 document.
order: 2
sources: [cli/cmd/vex.go, cli/internal/vex/vex.go, cli/internal/vex/merge.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

All three take `--vex <file|dir>` (repeatable, required) and `-o pretty|json`. Inputs may mix OpenVEX, CycloneDX VEX and CSAF VEX.

## vex ls

Lists every statement and what it asserts, so you can review a set of documents before trusting it to suppress anything.

```bash
vulnetix vex ls --vex ./vex/
vulnetix vex ls --vex ./vex/ --status not_affected
vulnetix vex ls --vex vendor.openvex.json -o json
```

| Flag | Default | Description |
|---|---|---|
| `--status` | | Only list this status: `not_affected`, `affected`, `fixed`, `under_investigation` |

## vex validate

A document can parse and still assert nothing usable. `validate` reports these problems.

```bash
vulnetix vex validate --vex vendor.openvex.json
vulnetix vex validate --vex ./vex/ -o json
```

| Problem | Fatal | Why |
|---|---|---|
| The document has no statements | yes | Nothing to apply |
| A statement names no vulnerability | yes | Nothing to match |
| A status outside `not_affected`, `affected`, `fixed`, `under_investigation` | yes | Cannot be acted on |
| `not_affected` with neither a justification nor an impact statement | yes | Invalid per OpenVEX |
| `not_affected` with a justification outside the OpenVEX list | no | Read, but not a standard reason |
| `affected` with no action statement | no | Tells a consumer nothing to do |
| A statement names no product | no | Applies to everything the document describes |

The OpenVEX justifications are `component_not_present`, `vulnerable_code_not_present`, `vulnerable_code_not_in_execute_path`, `vulnerable_code_cannot_be_controlled_by_adversary` and `inline_mitigations_already_exist`.

Exits `1` when any problem is fatal.

> [!CAREFUL] Scans only fail on unreadable documents
> `--vex-file` and `--vex` on a scan fail the scan when a document cannot be read or parsed. It does not run these semantic checks. Run `vex validate` in CI before relying on a document.

## vex merge

Combines documents into one OpenVEX 0.2.0 document.

```bash
vulnetix vex merge --vex vendor.openvex.json --vex ours.json --out merged.openvex.json
vulnetix vex merge --vex ./vex/ --out merged.openvex.json
```

| Flag | Default | Description |
|---|---|---|
| `--out` | stdout | Write the merged document here |

Statements are keyed by `(vulnerability, product)`. When two documents disagree about the same pair, the newer timestamp wins: a vendor who published `under_investigation` in March and `not_affected` in June has said the second thing.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success, and for `validate` no fatal problem |
| `1` | A fatal problem (`validate`), `--vex` missing, a document unreadable, or a flag invalid |
