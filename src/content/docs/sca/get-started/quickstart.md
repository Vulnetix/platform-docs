---
title: SCA quickstart
nav: Quickstart
description: Run a first dependency scan, gate a CI build on it, and apply fixes.
order: 2
sources: [cli/cmd/specialized_scans.go, cli/cmd/scan.go, cli/internal/scanopts/surface.go, cli/internal/scanopts/failon.go, cli/cmd/fix.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

Install the CLI first: see [Install](/cli/get-started/install/).

## 1. Scan

```bash
cd your-project
vulnetix sca
```

The scan walks three directory levels below `--path` (default `.`). Raise it for deep monorepos:

```bash
vulnetix sca --path . --depth 6
```

Commit a lockfile, or install dependencies first, for every manifest that declares ranges. A `package.json` or `requirements.txt` with neither a lock nor installed packages is skipped with a note. See [Lockfiles and resolution](/sca/scanning/resolution/).

## 2. Read the results

The default view groups findings by package in a terminal and prints plain text in a pipe or CI. Useful switches:

```bash
vulnetix sca --view findings              # one row per advisory
vulnetix sca --filter kev,reachable       # only KEV-listed findings your code reaches
vulnetix sca --min-severity high          # hide low and medium (display only)
vulnetix sca --show paths                 # how each transitive package was introduced
vulnetix sca --explain CVE-2021-23337     # why one finding applies, with the evidence
```

## 3. Gate a build

```bash
vulnetix sca --fail-on high,malware,kev
```

Exit `1` means a gate was breached. `--min-severity` never changes the exit code; `--fail-on` does. When the scan runs under an organisation with a [quality gate](/quality-gates/), the organisation's values replace yours. See [Gates and exit codes](/sca/gates/fail-on/).

GitHub Actions:

```yaml
- name: SCA
  run: vulnetix sca --fail-on high --output sbom.cdx.json
  env:
    VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
    VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
```

## 4. Export

```bash
vulnetix sca --output json-cyclonedx > sbom.cdx.json     # CycloneDX to stdout
vulnetix sca --output sca.report.json --output sbom.cdx.json   # files, by extension
```

See [Output formats](/sca/scanning/output/).

## 5. Fix

```bash
vulnetix fix --dry-run    # the plan, nothing changed
vulnetix fix --yes        # apply it, no prompts
```

`fix` edits manifests, runs your package manager, rescans and writes VEX for what it resolved. See [vulnetix fix](/sca/autofix/fix/).
