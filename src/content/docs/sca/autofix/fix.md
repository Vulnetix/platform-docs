---
title: vulnetix fix
description: Plan, apply and confirm dependency fixes with your own package manager, from the command line or inside a scan.
order: 1
sources: [cli/cmd/fix.go, cli/cmd/fix_autofix.go, cli/cmd/fix_prompt.go, cli/cmd/scan.go, cli/internal/fix/plan.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

`vulnetix fix` runs the SCA pipeline with remediation on. It finds the same vulnerabilities `vulnetix sca` finds, chooses a Safe Harbour target for each vulnerable package, edits the manifests, runs your package manager, and scans again to confirm. `vulnetix autofix` is an alias.

```bash
vulnetix fix [path] [flags]
```

The same workflow runs inside a wider scan with `--sca-autofix`:

```bash
vulnetix sca --sca-autofix --yes
vulnetix scan --sca-autofix --yes
```

## Flags

| `fix` flag | Scan-family spelling | Default | Effect |
|---|---|---|---|
| `[path]` or `--path` | `--path` | `.` | Directory to fix. The positional argument wins. |
| `--strategy` | `--sca-autofix-strategy` | `stable` | `safest`, `stable`, `latest` or `rolling`. See [Strategies](/sca/autofix/strategies/). |
| `--manifest` | `--sca-autofix-manifest` | none | Edit only this manifest |
| `--max-major-bump` | `--sca-autofix-max-major-bump` | `0` | Refuse targets crossing more than N major versions. `0` stays on the current major; a negative value removes the cap. |
| `--yes` | `--yes` | `false` | Never prompt; fix every manifest |
| `--dry-run` | `--dry-run` | `false` | Print the plan and stop. It still queries the VDB. |
| (always on) | `--sca-autofix` | `false` on `sca` and `scan` | Turns remediation on |

`fix` accepts every other `sca` flag: `--depth`, `--exclude`, `--output`, `--fail-on` and the display flags. The scan-family spellings work on `fix` too, but are hidden from its help. An org [quality gate](/sca/gates/org-quality-gate/) that sets `scaAutofixStrategy` or `scaAutofixMaxMajorBump` replaces `--strategy` and `--max-major-bump`.

## What a run does

1. **Scan.** Manifests are parsed and `/v2/cli.sca` returns findings and, for each package, the Safe Harbour picks.
2. **Plan.** Each vulnerable package gets a target and a method: `direct-bump`, `parent-update`, `parent-upgrade` or `override`. A package with no acceptable target is kept as manual, with the reason. See [How fixes are applied](/sca/autofix/how-fixes-apply/).
3. **Choose manifests.** With more than one manifest to fix and neither `--manifest` nor `--yes`, `fix` asks which one (`0` for all). Without a terminal it stops with `multiple manifests have autofix candidates; pass --sca-autofix-manifest or --yes in non-interactive mode`.
4. **Apply.** Manifests are edited, then the package manager runs once per manifest directory.
5. **Confirm.** An SCA-only rescan runs. Findings the rescan no longer reports are marked resolved.
6. **Record.** Resolved findings are written as OpenVEX to `.vulnetix/vex-autofix.json`. Packages with no safe version are written as risk-accepted to `.vulnetix/vex-risk-accepted.json`. Both are posted to the scan snapshot when you are signed in.

`--dry-run` stops after step 3, prints the plan and the commands, and exits `0`. No gate is evaluated.

## Exit codes

| Code | When |
|---|---|
| `0` | Fixes applied (or nothing to fix) and the confirmation scan breached no gate. Also every `--dry-run`. |
| `1` | A manifest edit or install command failed; a gate breached on the confirmation scan; the manifest choice was needed without a terminal; or any other error |
| `3` | With `--jail`, the jail gate could not reach a verdict |

The gates run on the confirmation scan, so `vulnetix fix --fail-on high` fails only if high findings remain after the fix.

## Report

The run prints proof-of-work counts:

| Count | Meaning |
|---|---|
| direct fixes | Declared dependencies bumped |
| transitive via parent update | Lockfile re-resolved within the parent's existing range |
| transitive via parent upgrade | The direct parent bumped to a version whose range admits the safe child |
| transitive via override | The child pinned through the package manager's override mechanism |
| unresolved deep chains | Transitive chains it could not fix |

Every finding, including skipped and manual ones, gets a command you can copy and run, in the project's own package manager (`bun add cookie`, not `npm install cookie`).

## Examples

```bash
vulnetix fix --dry-run                          # the plan, nothing changed
vulnetix fix --yes                              # CI: fix everything, no prompts
vulnetix fix --strategy safest --yes            # highest stable clean release
vulnetix fix --max-major-bump 1 --yes           # allow one major version jump
vulnetix fix --manifest services/api/package.json
vulnetix fix --yes --fail-on high               # fail if high findings remain
```
