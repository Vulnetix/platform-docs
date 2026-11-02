---
title: Diff, merge and tree
description: Compare two SBOMs as a CI gate with vulnetix bom diff, combine documents with bom merge, and walk the dependency graph forwards or inverted with bom tree.
order: 2
sources: [cli/cmd/bom.go, cli/internal/bom/diff.go, cli/internal/bom/tree.go]
checked: [cli@4c8c3b71c]
updated: 02 Nov 2026
---

All three commands accept CycloneDX or SPDX on either side, through the same loader as [`bom import`](/sbom/read/import-and-validate/).

## bom diff

```bash
vulnetix bom diff <before> <after> [flags]
```

```bash
vulnetix bom diff before.cdx.json after.cdx.json
vulnetix bom diff v1.cdx.json v2.spdx.json -o markdown
vulnetix bom diff base.cdx.json head.cdx.json --fail-on vuln-added,downgraded
```

| Flag | Default | Description |
|---|---|---|
| `-o`, `--output` | `pretty` | `pretty` (alias `table`), `json`, `markdown` |
| `--fail-on` | `none` | Comma-separated conditions that exit `1` |

### `--fail-on` conditions

| Value | Also accepted | Exits `1` when |
|---|---|---|
| `none` | | never (the default) |
| `any` | | any component changed |
| `added` | | a component was added |
| `removed` | | a component was removed |
| `downgraded` | | a component moved to a lower version |
| `vuln-added` | `vuln_added`, `vulns-added` | a vulnerability appeared |
| `license-regression` | `license-changed`, `license` | a licence changed |

An unknown condition is an error.

### Change kinds in the report

| Kind | Meaning |
|---|---|
| `added` | Only in `<after>` |
| `removed` | Only in `<before>` |
| `upgraded` | Same component, higher version |
| `downgraded` | Same component, lower version |
| `version-changed` | Same component, but the two versions cannot be ordered (a git SHA replacing a tag, a distro epoch) |
| `license-changed` | Same component, different licence |

The summary also counts vulnerabilities gained and resolved, and dependency edges that moved.

```text
Change           Component             Version               Licence           Direct
removed          left-pad              1.3.0                 WTFPL             transitive
downgraded       express               4.18.2 → 4.18.1       -                 direct
license-changed  express               4.18.2 → 4.18.1       MIT → Apache-2.0  direct
upgraded         lodash                4.17.20 → 4.17.21     -                 direct
added            chalk                 5.3.0                 MIT               direct
```

### How components are matched

Components are paired by the first key both sides share, in this order:

1. purl without its version
2. `bom-ref`
3. `name@version`
4. bare name, when the name is unique in the document

That is why a dependency bump reads as one upgrade rather than an add plus a remove, even when the two documents came from different tools. Versions are compared semantically, so `1.2.10 → 1.2.9` is a downgrade.

### In a pull request

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
- name: SBOM change review
  run: |
    git worktree add "$RUNNER_TEMP/base" "origin/${{ github.base_ref }}"
    vulnetix cdx "$RUNNER_TEMP/base" --output-file base.cdx.json
    vulnetix cdx --output-file head.cdx.json
    vulnetix bom diff base.cdx.json head.cdx.json -o markdown --fail-on vuln-added,downgraded >> "$GITHUB_STEP_SUMMARY"
```

`bom diff` makes no network calls, so this step needs no Vulnetix credentials. A vulnerability can only be counted as added when the documents carry `vulnerabilities`, for example after [`bom enrich`](/sbom/read/enrich/).

## bom merge

```bash
vulnetix bom merge <file> <file...> [flags]
```

```bash
vulnetix bom merge app.cdx.json image.spdx.json --out combined.cdx.json
```

| Flag | Default | Description |
|---|---|---|
| `--out` | stdout | Write the merged CycloneDX document here |
| `-o`, `--output` | `pretty` | `pretty` (alias `table`) or `json` |

The merge is keyed on purl and never overwrites. Components from an earlier document are kept as they are. Later documents fill gaps and add new components, tools, vulnerabilities and dependency edges. The inputs may mix formats; the output is CycloneDX.

## bom tree

```bash
vulnetix bom tree <file> [flags]
```

```bash
vulnetix bom tree sbom.cdx.json
vulnetix bom tree sbom.cdx.json --component lodash --invert
vulnetix bom tree sbom.cdx.json --depth 3
```

| Flag | Default | Description |
|---|---|---|
| `--component` | the document subject | Root the tree at this component: a purl, `bom-ref`, name, or substring |
| `--invert` | `false` | Show what depends on the component, instead of what it depends on |
| `--depth` | `0` | Maximum depth. `0` is unlimited. |
| `-o`, `--output` | `pretty` | `pretty` (alias `table`) or `json` |

`--invert` answers "what pulls this in":

```text
left-pad@1.3.0
└── express@4.18.2
    └── payment-service@2.3.0
```

Cycles are marked and not followed. Go modules and Maven both allow them.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success, and no `--fail-on` condition met |
| `1` | A `--fail-on` condition was met, a document could not be read, or a flag was invalid |
