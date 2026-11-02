---
title: Reachability analysis
nav: Overview
description: How vulnetix sca and vdb vuln check whether vulnerable code is present in an installed package and called from your tree, the four verdicts, and what a match does and does not prove.
order: 1
sources: [cli/cmd/cli_sca.go, cli/cmd/vdb_reachability.go, cli/cmd/vdb.go, cli/cmd/scan.go, cli/internal/reachability/scanner.go, cli/internal/reachability/symbol_match.go, cli/internal/report/build.go, vdb-api/internal/handler/v2_cli_sca_reachability.go]
checked: [cli@4c8c3b7, vdb-api@4145f0a]
updated: 02 Nov 2026
---

A version match says a package is affected. Reachability asks whether the vulnerable code is on disk in the version you installed, and whether anything in your repository calls it.

The VDB derives tree-sitter S-expression queries from each advisory's affected symbols (function, method, decorator, attribute access) and returns them with the findings. The CLI runs them locally against your source with grammars compiled into the binary. Source code is never uploaded; only the verdict and match locations are.

## Modes

`--reachability` is accepted by `sca`, `scan`, `fix` and every `vdb` subcommand.

| Mode | Scans the installed package | Scans the rest of the project | Fetches queries |
|---|---|---|---|
| `both` (default) | yes | yes | yes |
| `direct` | yes | no | yes |
| `transitive` | no | yes | yes |
| `off` | no | no | no |

`off`, `none`, `false` and `0` all mean `off`. `direct` finishes in under a second; `transitive` walks the whole tree and can take 30 seconds or more on a large monorepo. Use `--reachability direct` in CI if the sweep is too slow.

## Verdicts in a scan

| Verdict | Meaning | Report signal |
|---|---|---|
| `direct` | A query matched inside the installed package's directory | `reachable` |
| `transitive` | A query matched in your code or another dependency | `reachable` |
| `unreachable` | Queries ran cleanly and matched nothing | none |
| `semantic` | No queries exist, but the advisory's affected routine, file or module names appear in your source | `referenced` |
| (empty) | No queries and no symbol hit, or the queries could not run | none |

`semantic` comes from a name-matching fallback that runs when the VDB has no tree-sitter query for a CVE. It is weaker evidence than an AST match: the package's own name often matches any import. It is shown, but it does not count for `--filter reachable` and does not move a package into the `action` group.

A `reachable` signal moves a package into the `action` group. See [Result groups](/sca/scanning/output/#result-groups).

## What the console does with it

The scan posts verdicts to `/v2/cli.sca-reachability` after it has answered (the write does not hold the exit). In the console:

| Verdict | Triage state set |
|---|---|
| `unreachable` | `not_affected`, justification `code_not_reachable` |
| `direct`, `transitive`, `semantic` | `affected` |

A CVE whose queries did not run is not posted, so it stays `under_investigation` rather than being closed.

## What a match means

Tree-sitter is syntactic. It does not resolve types and never runs code.

- **A match is not proof of exploitability.** A query for `_.template(x)` also matches a `template` method on any other object called `_`. Read the `captures` before marking a finding affected.
- **No match is a strong signal, not a guarantee.** Reflection (`obj[name]()`), dynamic dispatch, code generation and framework wiring can reach a symbol the query cannot see. Treat "no match" in Spring, Rails or Django code with care.

| Affected package is | Transitive match | Reading |
|---|---|---|
| direct | yes | Treat as affected |
| direct | no | Defensible `not_affected`, after checking for dynamic calls |
| transitive | yes | Unusual. The match is probably in another dependency's code. |
| transitive | no | Strong `not_affected` signal |

## Single vulnerability lookups

```bash
vulnetix vdb vuln CVE-2021-23337
vulnetix vdb vuln CVE-2021-23337 --output json --reachability direct
```

`vdb vuln` and `vdb remediation plan` fetch `GET /v2/vuln/{id}/tree-sitter` and scan the current project. Reachability is skipped on the legacy `-V v1` API. See [Output and memory](/sca/reachability/output/).

## Related

- [Languages](/sca/reachability/languages/)
- [Troubleshooting](/sca/reachability/troubleshooting/)
- [Internals](/sca/reachability/internals/)
