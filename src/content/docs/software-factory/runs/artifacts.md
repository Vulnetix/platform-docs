---
title: Run artifacts
nav: Artifacts
description: The files a run writes to its storage folder, how to list and open them, and how long they are kept.
order: 2
sources: [vdb-site/docs/factory.md, vdb-site/api/internal/handler/factory_runs_artifacts.go]
checked: [vdb-site@284f1d6, website@a31d470]
updated: 28 Oct 2026
---

Every run has a storage folder. Each step writes what it produced under a folder named for it, for example:

| Folder | Written by | Holds |
|---|---|---|
| `trigger/` | the trigger step | `run.json` (the run's starting facts) and `context.json` (the event's facts) |
| `scan/` | a scan step | `findings.json`, SARIF files, the SBOM |
| `crew/` | a crew step | what the crew handed back |
| `gate/` | a gate step | the gate's evidence |
| `evidence/` | outputs | `vex.openvex.json`, provenance |
| `output/` | outputs | results such as `conflicts.json` |

A decision step writes no file: its record is a decision ledger row.

Artifacts are kept 400 days. Findings files hold counts and identifiers, not source code.

## Opening artifacts

The run page lists the folders under **Where it is stored**. The evidence panel lists the run's files, and summarises its SARIF results, the first time it scrolls into view.

| Method | Path | Returns |
|---|---|---|
| GET | `/v1/factory/runs/{id}/artifacts?prefix=scan/` | The objects under the run's folder, with size, type and when each was written |
| GET | `/v1/factory/runs/{id}/artifacts/content?key=scan/findings.json` | The object. JSON up to 2 MiB comes back directly. Anything larger, or not JSON, redirects to a link that works for 60 seconds. |
| GET | `/v1/factory/runs/{id}/evidence.zip` | The evidence pack: the run's `evidence/` files, its decision ledger rows (`decisions.json`) and a `manifest.json`. 409 `bad_state` when there is nothing to export yet. |

A key outside the run's own folder is refused. None of these call GitHub.

## Related

- [Runs and steps](/software-factory/runs/runs-and-steps/)
- [Trust and SLSA](/software-factory/evidence/trust-and-slsa/) for exporting evidence across runs.
