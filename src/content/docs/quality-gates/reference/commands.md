---
title: CLI commands
description: Flags for vulnetix config set and get quality-gate and eol-policy, vulnetix jail and its explain, list and exempt subcommands, and their exit codes.
order: 1
sources: [cli/cmd/config.go, cli/cmd/jail.go, cli/cmd/config_jail.go, cli/cmd/scan.go, cli/cmd/exit_codes.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

All of these act on the organization of the authenticated session (`vulnetix auth login`).

## vulnetix config set quality-gate

```bash
vulnetix config set quality-gate --severity high --block-malware true --cooldown 3
vulnetix config set quality-gate --severity null
```

Every flag takes a value, or `null` to unset that setting for the organization. Flags you do not pass are left as stored.

| Flag | Values |
|---|---|
| `--severity` | `low`, `medium`, `high`, `critical`, `null` |
| `--exploits` | `poc`, `active`, `weaponized`, `null` |
| `--block-malware` | `true`, `false`, `null` |
| `--block-unpinned` | `true`, `false`, `null` |
| `--block-eol` | `true`, `false`, `null` |
| `--cooldown` | integer `>= 0`, `null` |
| `--version-lag` | integer `>= 0`, `null` |
| `--sca-autofix-strategy` | `latest`, `safest`, `stable`, `rolling`, `null` |
| `--sca-autofix-max-major-bump` | integer `>= 0`, `null` |
| `--base-url` | VDB API base URL |
| `-o`, `--output` | `pretty`, `json` |

## vulnetix config set eol-policy

```bash
vulnetix config set eol-policy --this-quarter-severity high --retired-severity critical
```

| Flag | Values |
|---|---|
| `--next-quarter-severity` | `skip`, `low`, `medium`, `high`, `critical` |
| `--this-quarter-severity` | same |
| `--within-30-days-severity` | same |
| `--retired-severity` | same |
| `--base-url`, `-o` | as above |

Only the buckets you pass are written. See [EOL policy](/quality-gates/gate/eol-policy/).

## vulnetix config get quality-gate and eol-policy

```bash
vulnetix config get quality-gate
vulnetix config get eol-policy -o json
```

Unset enforcement settings print as **not set**.

## Scan flags the gate overrides

`--severity`, `--exploits`, `--block-malware`, `--block-unpinned`, `--block-eol`, `--cooldown`, `--version-lag`, `--sca-autofix-strategy`, `--sca-autofix-max-major-bump`. `--block-eol-severity` (default `critical`) is a scan flag only. All are documented with the scan commands at [SCA](/sca/) and [CLI](/cli/).

## vulnetix jail

```text
vulnetix jail [flags]
vulnetix jail explain [flags]
vulnetix jail list [flags]
vulnetix jail exempt [flags]
```

Flags on every jail command:

| Flag | Default | Meaning |
|---|---|---|
| `--path` | `.` | Repository path to derive identity from |
| `--repo` | | Repository to assess (`explain` and `list` only) |
| `--branch` | | Branch to assess (`explain` and `list` only) |
| `--rule-uuid` | | Restrict to these rule UUIDs; repeatable |
| `--base-url` | | VDB API base URL |
| `-o`, `--output` | `pretty` | `pretty`, `json` |
| `--timeout` | `60s` | Maximum wait for the gate |
| `--max-lookback-days` | `0` (server default) | How far back to consider scan coverage |

`vulnetix jail` also takes the gate flags `--no-fail`, `--on-stale`, `--staleness-days`, `--vex-out`, `--vex-format`, `--sarif-out` and `--no-artefacts`; see [Jail in CI](/quality-gates/jail/in-ci/#gate-flags).

| Subcommand | Does |
|---|---|
| `jail` | Evaluate, write artefacts, set the exit code |
| `jail explain` | Every rule's verdict with the matched items. No artefacts, no exit code, does not move a ratchet baseline. |
| `jail list` | The resolved policy: rules, thresholds, current observed values, and whether the org default or a per-repository policy applied. Also `vulnetix config get jail`. |
| `jail exempt` | Create or retire an exemption: `--rule`, `--reason`, `--expires` (default `720h`), `--deactivate`, `--deactivate-reason`. Also `vulnetix config set jail exempt`. See [Exemptions](/quality-gates/jail/exemptions/). |

## Exit codes

| Code | Name | `jail` | `scan` family |
|---|---|---|---|
| `0` | OK | clear | no gate breached |
| `1` | Failure | a rule breached, or the command failed | a gate breached, or the command failed |
| `2` | Usage | bad arguments or configuration | not used: bad arguments exit `1` |
| `3` | Indeterminate | evidence stale or missing | only with `--jail` |
