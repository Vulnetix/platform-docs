---
title: Enforcement in CI
description: How the organization's Quality Gate overrides scan flags in CI, the verbose output that shows it, the exit codes, and pipeline examples.
order: 3
sources: [cli/cmd/quality_gate_enforce.go, cli/cmd/scan.go, cli/cmd/exit_codes.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

## Org policy always wins

When an authenticated scan starts, the CLI fetches the organization's Quality Gate once and applies it before any gate is evaluated:

- A setting the organization has set replaces the scan's value, including a flag passed explicitly on the command line.
- A setting the organization left unset changes nothing; the flag or its default applies.

This is not "most restrictive wins". If the organization sets severity `high`, a pipeline that passes `--severity critical` is evaluated at `high`, and one that passes `--severity low` is also evaluated at `high`.

The gate is skipped, and only flags apply, when:

| Situation | Verbose message |
|---|---|
| No credentials, or the shared community fallback | `Org quality gate: skipped (no authenticated org ...` |
| The lookup fails | `Org quality gate: lookup failed (<error>) ...` |
| The organization has no gate row | `Org quality gate: no policy configured ...` |

## Verbose output

With `--verbose`, each setting the organization applied is printed to stderr. Organization policy `severity=high`, `cooldown=3`:

```bash
vulnetix scan --severity low --verbose
```

```text
--severity low superseded by org policy: high
org policy applied: --cooldown 3
Org quality gate: applied 2 settings from org policy (org policy always wins).
```

Run `vulnetix config get quality-gate` to see the active policy.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | No gate breached |
| `1` | A gate breached, or the command failed |
| `2` | A local argument or configuration error |
| `3` | Only with `--jail`: a jail rule could not be evaluated. See [Jail in CI](/quality-gates/jail/in-ci/). |

Gate breaches are reported by name: `malware`, `exploits`, `severity`, `sast-severity`, `eol`, `unpinned`, `version-lag`, `cooldown`, `unprotected`, `sca-autofix`, and `jail:<rule>` with `--jail`.

## Pipeline examples

The organization's settings apply automatically once the CLI is authenticated. Flags in the pipeline are defaults for anything the organization leaves unset.

GitHub Actions:

```yaml
- name: Vulnetix scan
  env:
    VULNETIX_API_KEY: ${{ secrets.VULNETIX_API_KEY }}
    VULNETIX_ORG_ID: ${{ secrets.VULNETIX_ORG_ID }}
  run: vulnetix scan --severity high --block-malware --verbose
```

GitLab CI:

```yaml
vulnetix:
  script:
    - vulnetix scan --severity high --block-malware --verbose
  variables:
    VULNETIX_API_KEY: $VULNETIX_API_KEY
    VULNETIX_ORG_ID: $VULNETIX_ORG_ID
```

Rolling out a stricter gate:

1. Run `vulnetix scan` with the stricter flags in a few pipelines and read the breaches.
2. Set the values org-wide with `vulnetix config set quality-gate`.
3. Watch for red builds; to back out one setting, set it to `null`.

Installing the CLI and authenticating in CI are covered in [CLI CI/CD](/cli/).
