---
title: Quality gates quickstart
nav: Quickstart
description: Set your organisation's Quality Gate in a QualityGate document, apply it, run vulnetix scan and read the exit code, then add the Jail gate.
order: 1.5
sources: [cli/cmd/config.go, cli/cmd/config_engine_alias.go, cli/cmd/quality_gate_enforce.go, cli/cmd/scan.go, cli/cmd/jail.go, cli/cmd/jail_render.go]
checked: [cli@v4.17.1]
updated: 04 Nov 2026
---

The Quality Gate decides whether one scan's findings fail a build, for every authenticated scan in your organisation. This page sets it, sees it applied, and adds the Jail gate after it.

## Prerequisites

- The Vulnetix CLI on your `PATH` ([installing the CLI](/cli/get-started/install/)).
- `VULNETIX_ORG_ID` and `VULNETIX_API_KEY` for an owner, or for a service account with the developer role. A member is refused with `403`.
- An unauthenticated scan skips the organisation's gate and uses only its own flags.

## 1. Declare the gate

```bash
mkdir -p .vulnetix/config
cat > .vulnetix/config/quality-gate.yaml <<'EOF'
apiVersion: vulnetix.com/v1
kind: QualityGate
metadata:
  name: default
spec:
  severity: high
  blockMalware: true
EOF
vulnetix config validate
```

```text
1 documents valid in 1 files
```

A field you leave out leaves the matching scan flag in charge. [Settings](/quality-gates/gate/settings/) lists every field.

## 2. Apply it to the organisation

```bash
vulnetix config apply
```

Apply prints the plan and accepts only `yes`. In CI, pass `--auto-approve`. `vulnetix config set quality-gate --severity high` does the same, but is deprecated in favour of the document.

## 3. Scan

```bash
vulnetix scan --severity low --verbose
```

The organisation's settings replace the scan's flags, even ones you pass. With `--verbose` the CLI says so on stderr:

```text
org policy applied: --block-malware true
--severity low superseded by org policy: high
Org quality gate: applied 2 settings from org policy (org policy always wins).
```

## 4. Read the exit code

```bash
echo $?
```

| Code | Meaning |
|---|---|
| `0` | No gate breached |
| `1` | A gate breached, or the command failed |
| `2` | A local argument or configuration error |

A breach is named with its count, for example `--severity high: 2 vulnerabilities at or above the threshold`.

## 5. Add Jail

Jail judges the repository's accumulated state across every tool, on the server. Run it after the scan has uploaded:

```bash
vulnetix jail
```

The verdict starts with `CLEAR`, `JAILED`, `INDETERMINATE` or `NO POLICY`, then names the repository, branch and policy. It exits `0` clear, `1` jailed and `3` indeterminate. An organisation with no jail policy reports `NO POLICY` and exits `0`, so the step is safe to add before rules exist. `vulnetix scan --jail` folds both gates into one step.

## Next

- [Enforcement in CI](/quality-gates/gate/enforcement-in-ci/) for the override rule and pipeline examples.
- [EOL policy](/quality-gates/gate/eol-policy/) for end-of-life severities.
- [Jail rules](/quality-gates/jail/rules/) to write the first policy.
- [Jail in CI](/quality-gates/jail/in-ci/) for the VEX and SARIF artefacts.
