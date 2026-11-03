---
title: vulnetix sca flag reference
nav: Flags
description: Every flag vulnetix sca accepts, with type, default and effect, including the hidden legacy spellings.
order: 1
sources: [cli/cmd/scan.go, cli/cmd/specialized_scans.go, cli/cmd/root.go, cli/internal/scanopts/surface.go, cli/internal/scanopts/failon.go, cli/internal/scanopts/deployment.go, cli/internal/scanopts/authorship.go, cli/cmd/license_policy.go]
checked: [cli@4c8c3b7]
updated: 02 Nov 2026
---

```bash
vulnetix sca [flags]
```

`vulnetix fix` accepts the same set, with the renamed autofix flags described on [vulnetix fix](/sca/autofix/fix/). Global flags (`--verbose`, `--no-progress`, `--disable-memory`, credentials) are on the [CLI reference](/cli/reference/global-flags/).

## Discovery

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--path` | string | `.` | Directory to scan |
| `--depth` | int | `3` | Directory levels below `--path` |
| `--exclude` | string, repeatable | none | Glob to skip |
| `--no-ci-package-analysis` | bool | `false` | Skip packages installed in CI pipeline files, GitHub Actions included |
| `--no-shell-package-analysis` | bool | `false` | Skip packages installed by shell scripts, Makefiles and task runners |
| `--include-ignored` | bool | `false` | No effect on `sca`, which always reads gitignored paths |
| `--dry-run` | bool | `false` | Detect and parse locally, replay stored results, exit. No API calls. |

## Analysis

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--reachability` | string | `both` | `direct`, `transitive`, `both`, `off`. See [Reachability](/sca/reachability/overview/). |
| `--no-malscan` | bool | `false` | Skip the local malware pass over dependency install directories |
| `--vex-file` | string, repeatable | none | Apply VEX statements from a file or directory before gates |
| `--vex` | string, repeatable | none | As `--vex-file`, and an `https://` URL is downloaded for the run. CLI v4.2.0 and later. |
| `--no-vex` | bool | `false` | Ignore `--vex-file`, `--vex` and the declared `VexSource` documents |

## Gates

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--fail-on` | string, repeatable | none | `low`, `medium`, `high`, `critical`, `kev`, `exploit=poc\|active\|weaponized`, `malware`, `eol[=severity]`, `unpinned`, `unprotected`, `lag=<n>`, `cooldown=<n>d` |
| `--strict` | bool | `false` | Count findings the advisory rules out by version |
| `--accept-defended` | bool | `false` | Let an unexpired recorded control satisfy the gates for its finding |
| `--block-eol-severity` | string | `critical` | With the EOL gate, the graded severity that fails the build |
| `--jail` | bool | `false` | Gate on the org's jail policy after upload. Exit `1` on breach, `3` when indeterminate. |

See [Gates and exit codes](/sca/gates/fail-on/). An org [quality gate](/sca/gates/org-quality-gate/) overrides these.

## Autofix

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--sca-autofix` | bool | `false` | Apply fixes, then rescan |
| `--sca-autofix-strategy` | string | `stable` | `safest`, `stable`, `latest`, `rolling` |
| `--sca-autofix-manifest` | string | none | Limit edits to one manifest |
| `--sca-autofix-max-major-bump` | int | `0` | Major versions a target may cross; negative removes the cap |
| `--yes` | bool | `false` | Never prompt |

## Output

| Flag | Type | Default | Effect |
|---|---|---|---|
| `-o, --output` | string, repeatable | none | `json-cyclonedx`, `json-report`, `json-sarif`, or a file path. See [Output](/sca/scanning/output/). |
| `--view` | string | `auto` | `auto`, `packages`, `findings`, `tree`, `table`, `plain`, `json` |
| `--filter` | string, repeatable | none | `kev`, `exploited`, `reachable`, `fixable`, `nofix`, `defended`, `unprotected`, `direct`, `transitive` |
| `--min-severity` | string | none | Hide below `low`, `medium`, `high`, `critical` |
| `--sort` | string | `threat` | `threat`, `severity`, `package` |
| `--show` | string, repeatable | none | `paths`, `files`, `clean`, `scores`, `defences`, `tests` |
| `--hide` | string, repeatable | none | `fixes`, `exploits`, `defences`, `not-affected` |
| `-q, --quiet` | bool | `false` | Findings only; silent when clean |
| `--explain` | string | none | Explain one advisory, package, `name@version`, rule or file |
| `--color` | string | `auto` | `auto`, `always`, `never` |
| `--ascii` | bool | `false` | ASCII symbols |
| `--width` | int | `0` | Output width; `0` uses the terminal or `COLUMNS` |

## Labels

| Flag | Type | Default | Effect |
|---|---|---|---|
| `--project` | string | `VULNETIX_PROJECT` | Project label |
| `--cluster` | string | `VULNETIX_CLUSTER` | Cluster label |
| `--namespace` | string | `VULNETIX_NAMESPACE` | Namespace label |
| `--environment` | string | `VULNETIX_ENVIRONMENT` | Environment label |
| `--tag` | `key=value`, repeatable | none | Extra deployment label |
| `--bom-manufacturer` | string | `VULNETIX_BOM_MANUFACTURER` | SBOM manufacturer |
| `--lifecycle` | string | none | CycloneDX lifecycle phase of the data |

## Accepted, with no effect on `sca`

These belong to the shared scan flag set. They matter for other scanners in `vulnetix scan`.

| Flags | Used by |
|---|---|
| `--allow`, `--allow-file`, `--license-mode`, `--policy-file`, `--exceptions-file` | Licence evaluation (`--no-licenses` is fixed on `sca`) |
| `--ignore`, `--ignore-git`, `--ignore-binaries`, `--git-history`, `--git-history-max-commits`, `--git-history-max-files` | Secrets |

## Hidden legacy flags

| Flag | Replacement |
|---|---|
| `--severity <level>` | `--fail-on <level>` |
| `--block-malware` | `--fail-on malware` |
| `--block-eol` | `--fail-on eol` |
| `--block-unpinned` | `--fail-on unpinned` |
| `--exploits <tier>` | `--fail-on exploit=<tier>` |
| `--version-lag <n>` | `--fail-on lag=<n>` |
| `--cooldown <n>` | `--fail-on cooldown=<n>d` |
| `--no-exploits` | `--hide exploits` |
| `--no-remediation` | `--hide fixes` |
| `--show-introduced-paths`, `--paths` | `--show paths` |
| `--show-detected` | `--show files` |
| `--show-all-manifests` | `--show clean` |
| `--results-only` | `-q` |
| `-f, --format` | `--output json-cyclonedx` |
| `--concurrency` | Never had an effect. Use `VULNETIX_SCA_CONCURRENCY`. |
