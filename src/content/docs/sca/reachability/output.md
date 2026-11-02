---
title: Reachability output and memory
nav: Output and memory
description: The pretty and JSON reachability blocks from vdb vuln, the x_reachability fields, and the evidence recorded in .vulnetix/memory.yaml.
order: 3
sources: [cli/cmd/vdb_reachability.go, cli/cmd/vdb.go, cli/internal/memory/memory.go, cli/internal/reachability/types.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

## Pretty output

`vulnetix vdb vuln <id>` prints a block below the vulnerability detail:

```text
Reachability: 2 direct, 1 transitive (1 queries)
  direct       node_modules/lodash/template.js  142:158  (prototype-pollution)
  direct       node_modules/lodash/template.js  201:204  (prototype-pollution)
  transitive   src/render.ts                    88:97    (prototype-pollution)
```

Each line is the mode, the path relative to the project root, `start:end` lines (1-indexed, inclusive) and the query name. A requested mode that could not run prints a skipped line, for example `direct skipped: install directory for npm/lodash not found`.

## JSON

With `--output json` the block is attached as `x_reachability`. When the response is not an object it is wrapped as `{"data": ..., "x_reachability": ...}`.

```json
{
  "x_reachability": {
    "queries_run": 1,
    "direct": [
      { "file": "node_modules/lodash/template.js", "start_line": 142, "end_line": 158,
        "query": "prototype-pollution", "language": "javascript",
        "captures": { "callee": "_.template", "arg": "userInput" } }
    ],
    "transitive": [
      { "file": "src/render.ts", "start_line": 88, "end_line": 97,
        "query": "prototype-pollution", "language": "javascript" }
    ]
  }
}
```

| Field | Type | Notes |
|---|---|---|
| `queries_run` | int | Distinct queries executed |
| `direct` | array | Matches inside the installed package. Omitted when empty. |
| `transitive` | array | Matches elsewhere in the project. Omitted when empty. |
| `skipped_direct` | string | Why direct mode could not run |
| `skipped_transitive` | string | Why transitive mode could not run |

Match fields: `file`, `start_line`, `end_line`, `query`, `language`, `captures` (capture name to matched source text). `query`, `language` and `captures` are omitted when empty. The block is omitted when nothing ran and nothing was skipped.

## `.vulnetix/memory.yaml`

Each run replaces the finding's `threat_model.reachability_evidence`. Earlier evidence is not merged.

```yaml
findings:
  CVE-2021-23337:
    package: lodash
    ecosystem: npm
    threat_model:
      reachability: Network          # CVSS attack vector, not code reachability
      reachability_evidence:
        direct:
          - file: node_modules/lodash/template.js
            range: "142:158"
            query: prototype-pollution
        transitive:
          - file: src/render.ts
            range: "88:97"
            query: prototype-pollution
```

`threat_model.reachability` is the CVSS attack vector: how an attacker reaches the bug if it is reachable. `reachability_evidence` is the code path from your tree to the bug. Both are kept.

`--disable-memory` turns off the memory file. To record a false positive, set the finding's `decision.choice` to `not_affected` with a `reason`; the evidence stays as the audit trail.
