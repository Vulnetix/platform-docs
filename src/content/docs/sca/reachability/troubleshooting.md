---
title: Reachability troubleshooting
nav: Troubleshooting
description: Empty results, skipped modes, failed queries, false positives and slow sweeps, with what to change for each.
order: 4
sources: [cli/internal/reachability/scanner.go, cli/internal/reachability/discovery.go, cli/internal/reachability/engine.go, cli/cmd/vdb_reachability.go, cli/cmd/cli_sca.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

## `0 direct, 0 transitive (0 queries)`

The VDB has no tree-sitter query for this CVE yet. Recent CVEs and distribution-only advisories often have none. In a scan, the [semantic fallback](/sca/reachability/overview/#verdicts-in-a-scan) may still mark it `semantic`.

## Queries ran, nothing matched

`queries_run` is above zero and both lists are empty. In a scan the verdict is `unreachable`, which the console triages as `not_affected` (`code_not_reachable`). Check for reflection or dynamic dispatch before relying on it.

## `direct skipped: install directory for <eco>/<pkg> not found`

| Cause | Fix |
|---|---|
| Dependencies not installed | `npm install`, `pip install -r requirements.txt`, `bundle install --path vendor/bundle`, `cargo vendor`, `go mod vendor` |
| Monorepo package with its own `node_modules` | Run from that package's directory, or pass its path |
| Yarn Plug'n'Play | Set `nodeLinker: node-modules` in `.yarnrc.yml` |
| Go module cache | Not searched. Use `go mod vendor`. |
| NuGet | Not searched |

Transitive mode still runs when direct mode is skipped.

## `skipped_transitive`

The CLI could not determine a project root. Run from inside the repository.

## A query fails

A query that does not compile against the bundled grammar, or whose `#match?` regex does not compile, is skipped for that file and logged at `--verbose`. The other queries still run. A run where every query failed still reports `queries_run` above zero with empty lists. Update the CLI; if it persists, report the CVE and language to support.

## False positives

A transitive match on a same-named method is the common one. Read `captures`: `callee: _.template` is the library, `callee: myUtil.template` is not. Record the decision in `memory.yaml` (`decision.choice: not_affected` with a reason) or triage it in the console. There is no per-match suppression.

## Slow sweeps

| Lever | Effect |
|---|---|
| `--reachability direct` | Skips the whole-tree sweep |
| `--reachability off` | Skips reachability and the query fetch |
| `VULNETIX_REACHABILITY_CONCURRENCY` | Files parsed in parallel, default `GOMAXPROCS`, clamped 1 to 32 |
| Skipped directories | `.git`, `node_modules`, `vendor`, `.venv`, `venv`, `env`, `__pycache__`, `.tox`, `dist`, `build`, `target`, `.gradle`, `.idea`, `.vscode`, `.next`, `.nuxt`, `coverage`, `.cache`. Other generated trees are walked. |
| File size | Files over 4 MiB are skipped |

The semantic fallback in a scan has a 60 second budget.

## `-V v1`

Reachability is skipped on the legacy v1 API because queries are published only on v2, the default.

## Re-running

There is no standalone reachability command. Re-run `vdb vuln <id>`; the vulnerability record comes from cache when fresh. `vulnetix vdb cache clear` empties the VDB response cache.
