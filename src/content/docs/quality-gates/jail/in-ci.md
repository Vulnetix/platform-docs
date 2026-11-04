---
title: Jail in CI
description: Run the Jail gate as its own pipeline step or fold it into a scan with --jail, the VEX and SARIF artefacts it writes, and how to adopt it safely.
order: 4
sources: [cli/cmd/jail.go, cli/cmd/jail_artifacts.go, cli/cmd/scan_jail.go, cli/cmd/scan.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

## As its own step

Run after the scan stages have uploaded:

```yaml
- run: vulnetix scan
- run: vulnetix jail
```

## Folded into a scan

```yaml
- run: vulnetix sca --jail
```

`--jail` is available on `scan`, `sca`, `sast`, `secrets`, `containers` and `iac`. The command scans, uploads, then assesses the repository in one invocation. It passes the snapshots it just created to the server, so reading through a replica does not report its own upload as missing.

Only the categories the command ran are refreshed, so a useful verdict reads "SCA current and clean, SAST forty days old: indeterminate". Jail breaches join the scan's own gate output as `jail:<rule>`. The run exits `1` on a breach and `3` when a rule cannot be evaluated. `--jail` does not write the VEX and SARIF artefacts; run `vulnetix jail` for those.

## Artefacts

`vulnetix jail` writes both files before it decides the exit code, because a red gate is when the evidence is needed.

| File | Default path | Contents |
|---|---|---|
| VEX | `.vulnetix/jail.vex.json` | OpenVEX, or CycloneDX with `--vex-format cyclonedx`, for the `VULN` breaches |
| SARIF | `.vulnetix/jail.sarif` | The `EOL`, `GOAL` and `HYGIENE` breaches |

VEX has no way to say "this runtime is past end of life" or "this migration missed its deadline", so those go to SARIF. The SARIF is written to disk and not uploaded: a gate that published its own findings would create the coverage the next run measures freshness against.

Upload the SARIF to code scanning yourself if you want it there:

```yaml
- run: vulnetix jail
- uses: github/codeql-action/upload-sarif@v3
  if: always()
  with:
    sarif_file: .vulnetix/jail.sarif
```

## Gate flags

| Flag | Default | Meaning |
|---|---|---|
| `--no-fail` | `false` | Report the verdict, always exit `0` |
| `--on-stale` | policy | `fail`, `warn` or `pass`. Tightening only. |
| `--staleness-days` | policy | Tightening only |
| `--vex-out` | `.vulnetix/jail.vex.json` | |
| `--vex-format` | `openvex` | `openvex`, `cyclonedx` |
| `--sarif-out` | `.vulnetix/jail.sarif` | |
| `--no-artefacts` | `false` | Write neither file |

`--on-stale` and `--staleness-days` can only make the gate stricter. A pipeline may demand fresher evidence than the organization requires; a looser value is ignored and reported, or the flag would be a way to opt out of the gate.

## Adoption

- An organization with no policy reports `no policy` and exits `0`, so adding `vulnetix jail` to a pipeline cannot break it.
- `--no-fail` shows what would fail before it does.
- Setting the policy's enforcement to **warn** in the Resolve Platform downgrades every rule at once, server-side, with no pipeline change.

Every flag of `jail`, `jail explain`, `jail list` and `jail exempt` is on [CLI commands](/quality-gates/reference/commands/).
