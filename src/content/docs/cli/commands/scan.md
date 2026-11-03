---
title: scan
description: vulnetix scan runs every scanner in one pass over a directory, prints one verdict, writes one SBOM, and applies one set of gates. Every flag, output target and file it writes.
order: 1
sources: [cli/cmd/scan.go, cli/cmd/scan_report.go, cli/cmd/scan_help.go, cli/internal/scanopts/surface.go, cli/internal/scanopts/failon.go, cli/internal/scanopts/deployment.go, cli/internal/scanopts/authorship.go, cli/internal/report/options.go, cli/cmd/quality_gate_enforce.go, cli/cmd/scan_jail.go]
checked: [cli@v4.4.0, vdb-api@6df53b3]
updated: 03 Nov 2026
---

```sh
vulnetix scan [flags]
```

`scan` walks a directory, parses manifests, lockfiles, CI files and shell install commands on your machine, asks the VDB about each package version, and runs the rule-based passes over the source. It owns none of the analyses: each pass is the same code its own command runs, so `scan --only licenses --allow MIT` and `license --allow MIT` reach the same verdict. What `scan` adds is one result, one SBOM and one gate decision across all of them.

> [!CAREFUL] scan takes no positional path
> `vulnetix scan ./service` ignores `./service` and scans the current directory. Use `--path ./service`. (`report` and `analyze` do accept a positional path.)

## Passes

| Pass | Owner | Select with | Turn off with |
|---|---|---|---|
| Dependency vulnerabilities | [`sca`](/sca/) | `--only sca` | `--skip sca` |
| Static analysis | [`sast`](/sast/) | `--only sast` | `--skip sast` |
| Secret detection | [`secrets`](/secrets/) | `--only secrets` | `--skip secrets` |
| Container files | [`containers`](/sca/) | `--only containers` | `--skip containers` |
| Infrastructure as Code | [`iac`](/iac-scanning/) | `--only iac` | `--skip iac` |
| Licence policy | [`license`](/sca/) | `--only licenses` | `--skip licenses` |
| Malware in installed dependencies | [`malscan`](/malware/) | always on | `--no-malscan` |
| AI inventory (AIBOM) | [`aibom`](/sbom/) | always on | `--no-aibom` |
| Cryptography inventory (CBOM) | [`cbom`](/sbom/) | always on | `--no-cbom` |
| Dependency fixes | [`fix`](/sca/) | `--fix` | off by default |

`--only` and `--skip` take a comma-separated list and can be repeated. Two things differ from running the owner directly:

- `--rule org/repo` on `scan` runs every rule kind the pack ships. On `sast`, `secrets`, `iac` or `containers` only that command's kind runs.
- The SAST, secrets, container and IaC passes skip `.gitignore`d paths unless `--include-ignored` is set. `sca` and `malscan` always read gitignored paths, because dependency install directories usually are.

## Reading the output

The first line is the verdict, the groups say what to do, and the tail lists the files written:

```text
vulnetix scan: FINDINGS  5 advisories, 1 package, 1 need action

NEEDS ACTION
  CRITICAL  lodash 4.17.20 -> 4.18.0   CVE-2021-23337 +4   KEV weaponized SSVC-act   ./package-lock.json

vulnetix scan: CLEAN  no sast findings
  [OK] BOM:      .vulnetix/sbom.cdx.json
  [OK] Memory:   .vulnetix/memory.yaml
```

The unit is the package: the arrow is the version that clears its advisories, taken from the advisories' own ranges. When one upgrade does not clear all of them it says how many it does, for example `-> 2.31.0 (12 of 14)`.

| Group | Means |
|---|---|
| `NEEDS ACTION` | Exploited, on a KEV list, reachable from your code, malicious, or SSVC `Act` |
| `CAN WAIT` | Affected, with none of those signals |
| `UNVERIFIED` | Matched by name, but the advisory's range cannot be compared with your version (a git commit, `*`). Still counted. |
| `PROTECTED` | No fix, and an unexpired recorded control blocks it. Still affected and counted. |
| `MONITORED` | No fix, with a recorded detection or a block rule in log-only mode |
| `NOT AFFECTED` | Matched by name and ruled out by version |

Every finding also has a version verdict: `affected`, `unverified`, `likely not affected` or `not affected`. Only the first two count toward `--fail-on` unless `--strict` is set. Nothing is dropped from the SBOM, SARIF or `-o json-cyclonedx`: ruled-out findings stay there with their verdict. How the version check works is on [SCA](/sca/).

For a finding with no fix, `scan` looks up the block rules and detections built for it, in one request with a 20-second limit, and prints `block` and `detect` lines and a `vulnetix defend <id>` command. `--hide defences` skips the lookup. See [Virtual patching](/virtual-patching/).

## What to show

These change only the output, never the exit code.

| Flag | Values | Default | Effect |
|---|---|---|---|
| `--view` | `auto`, `packages`, `findings`, `tree`, `table`, `plain`, `json` | `auto` | `auto` is `plain` for a pipe, file or CI, `packages` on a terminal. `plain` is one stable ASCII line per package for scripts. `table` is the old wide table. |
| `--filter` | `kev`, `exploited`, `reachable`, `fixable`, `nofix`, `defended`, `unprotected`, `direct`, `transitive` | none | Show only findings that match all of them |
| `--min-severity` | `low`, `medium`, `high`, `critical` | none | Hide anything below |
| `--show` | `paths`, `files`, `clean`, `scores`, `defences`, `tests` | none | Add the dependency path, the detected files, clean manifests, scores, defence detail, test-code findings |
| `--hide` | `fixes`, `exploits`, `defences`, `not-affected` | none | Remove sections |
| `--sort` | `threat`, `severity`, `package` | `threat` | Order within a group |
| `-q`, `--quiet` | | off | Findings only; nothing at all when clean |
| `-v`, `-vv` | | | `-v` adds diagnostics and per-advisory version checks; `-vv` adds the raw evidence |
| `--explain <query>` | advisory id, package, `name@version`, purl, rule id or file path | | Explain one finding (below) |
| `--color` | `auto`, `always`, `never` | `auto` | `NO_COLOR` is honoured |
| `--ascii` | | off | ASCII symbols only |
| `--width <n>` | | terminal, or `COLUMNS` | Force the layout width |

Under GitHub Actions the plain view is followed by workflow-command annotations on the manifest lines, and a Markdown summary is appended to `$GITHUB_STEP_SUMMARY`.

### Explaining one finding

```sh
vulnetix scan --explain CVE-2021-23337
vulnetix scan --explain lodash@4.17.20
vulnetix iac --rule Vulnetix/opa-cigna-tf --explain CIGNA-TF-AWS-RDS-02
```

`--explain` runs only what the query needs: a package query sends only that package to the VDB and runs no rules; an advisory id looks up the packages it affects (from the last `.vulnetix/sbom.cdx.json`, else the VDB); a rule id runs that rule alone; a file path runs the rules and skips the dependency lookup. It writes no memory, SBOM, SARIF or VEX, uploads nothing, fails no gate, and exits `1` only when nothing matches. The `NEXT` commands it prints name the owning scanner and repeat your `--path`, `--exclude`, `--rule`, `--rule-registry` and `--vex-file` flags.

## When to fail

Without a gate, `scan` exits `0` whatever it finds.

```sh
vulnetix scan --fail-on high
vulnetix scan --fail-on kev,malware,unprotected
vulnetix scan --fail-on malware,unpinned,lag=1,cooldown=3d,high
vulnetix scan --fail-on high --strict
```

| `--fail-on` rule | Exits 1 when |
|---|---|
| `low`, `medium`, `high`, `critical` | Any counted finding is at or above that severity |
| `kev` | Any finding is actively exploited (CISA or EU KEV). Same as `exploit=active`. |
| `exploit=poc`, `exploit=active`, `exploit=weaponized` | Exploit maturity reaches that level: any public exploit, actively exploited, or weaponised in the wild |
| `malware` | A dependency is a known malicious package, or the malscan pass finds malware in the installed files |
| `eol` | A runtime or package is past its end-of-life date |
| `eol=<severity>` | An end-of-life component is graded at or above that severity |
| `unpinned` | A direct dependency uses a range (`^`, `~`, `>=`) instead of an exact version |
| `unprotected` | A finding has no fix and no recorded control |
| `lag=<n>` | A dependency is within the `n` most recently published versions of its package |
| `cooldown=<n>d` | A dependency version was published in the last `n` days |

| Flag | Effect |
|---|---|
| `--strict` | Also count `not affected` and `likely not affected` findings |
| `--accept-defended` | An unexpired recorded control satisfies the gates for the finding it covers |
| `--jail` | After uploading, assess the repository against the organisation's jail policy. Exits `1` on a breach and `3` when a rule cannot be evaluated. See [Quality gates](/quality-gates/). |

Rules combine: a comma list or a repeated flag. An unknown rule fails at once: `--fail-on: unknown rule "nonsense" (valid: ...)`.

> [!CAREFUL] Organisation policy wins
> When the scan runs as a real organisation, the organisation's stored quality-gate policy is fetched and applied over the gate flags. A value the organisation set overrides the flag you passed; a value it left unset leaves your flag alone. `-v` prints each override. Community scans use only the flags. See [Quality gates](/quality-gates/).

Exit codes are listed on [Exit codes](/cli/reference/exit-codes/).

### Superseded flags

They still work and are hidden from `--help`. On a terminal outside CI the first use prints `--<flag> still works; it is now <replacement>`.

| Flag | Now |
|---|---|
| `--severity <level>` | `--fail-on <level>` |
| `--block-malware` | `--fail-on malware` |
| `--block-eol` | `--fail-on eol` |
| `--block-eol-severity <s>` (still in help) | `--fail-on eol=<s>` |
| `--block-unpinned` | `--fail-on unpinned` |
| `--exploits poc\|active\|weaponized` | `--fail-on exploit=<tier>` |
| `--version-lag <n>`, `--cooldown <n>` | `--fail-on lag=<n>`, `--fail-on cooldown=<n>d` |
| `--no-exploits`, `--no-remediation` | `--hide exploits`, `--hide fixes` |
| `--show-introduced-paths`, `--paths` | `--show paths` |
| `--show-detected`, `--show-all-manifests` | `--show files`, `--show clean` |
| `--results-only` | `-q` |
| `--evaluate-sca`, `--evaluate-sast`, `--evaluate-secrets`, `--evaluate-licenses`, `--evaluate-iac`, `--enable-containers` | `--only <kind>` |
| `--no-sca`, `--no-sast`, `--no-secrets`, `--no-licenses`, `--no-iac`, `--no-containers` | `--skip <kind>` |
| `--from-memory`, with `--fresh-exploits`, `--fresh-advisories`, `--fresh-vulns` | [`vulnetix report`](/cli/commands/replay/) |
| `-f`, `--format` | `-o`, `--output` |
| `--concurrency` | Never had an effect; set `VULNETIX_SCA_CONCURRENCY` |

`--fix`, `--fix-strategy`, `--fix-manifest` and `--fix-max-major-bump` are aliases of the `--sca-autofix*` flags, not superseded.

## What to scan

| Flag | Default | Effect |
|---|---|---|
| `--path <dir>` | `.` | Directory to scan |
| `--depth <n>` | `3` | Maximum directory depth |
| `--exclude <glob>` | none | Skip matching paths (repeatable) |
| `--include-ignored` | off | Let SAST, secrets, container and IaC passes read gitignored paths |
| `--only`, `--skip` | all | Passes: `sca`, `sast`, `secrets`, `licenses`, `containers`, `iac` |
| `--reachability` | `both` | Tree-sitter reachability for the CVEs found: `direct` (the package's own directory), `transitive` (callers in the project), `both`, `off`. Needs a Pro or higher plan. |
| `--dry-run` | off | Detect and parse files, show memory, exit. No API calls. |
| `--no-ci-package-analysis` | off | Skip dependencies installed by CI files (GitHub Actions, GitLab CI, CircleCI, Buildkite, Azure Pipelines, Jenkinsfiles) |
| `--no-shell-package-analysis` | off | Skip packages installed by shell scripts |
| `--no-malscan`, `--no-aibom`, `--no-cbom` | off | Skip those always-on passes |

## What to write

| Flag | Effect |
|---|---|
| `-o`, `--output <target>` | Repeatable. `json-cyclonedx`, `json-sarif` or `json-report` print that document to stdout instead of the terminal view (only one per run). A path ending `.cdx.json`, `.cdx`, `.bom.json` or `.sbom.json` gets CycloneDX; `.sarif` or `.sarif.json` gets SARIF; `.report.json` gets the JSON report. Files are written in addition to the terminal view. |
| `--disable-memory` | Do not read or write `.vulnetix/memory.yaml` |

```sh
vulnetix scan -o dist/sbom.cdx.json -o dist/results.sarif
vulnetix scan -o json-cyclonedx > sbom.cdx.json
```

Whatever `-o` says, `scan` writes under `<path>/.vulnetix/`:

| File | When |
|---|---|
| `sbom.cdx.json` | Packages were found |
| `sast.sarif` | The rule passes found something; removed when clean |
| `containers.sarif` | `--only containers` found something |
| `malscan.sarif` | The malscan pass ran |
| `memory.yaml` | Always, unless `--disable-memory` |
| `detection-rules.rules` | IDS rules were returned for findings with no fix |

`report` replays them; [Files](/cli/reference/files/) lists everything under `.vulnetix/`. When signed in, results are also published as snapshots and their links printed; community scans print `Snapshots are skipped for unauthenticated scans.`

## Deployment context and BOM identity

Labels stamped on the SBOM and the published snapshot. Flags win; otherwise the first set environment variable is used.

| Flag | Environment fallback | Meaning |
|---|---|---|
| `--project` | `VULNETIX_PROJECT`, `CI_PROJECT_NAME` | What this is and who owns it |
| `--environment` | `VULNETIX_ENVIRONMENT`, `CI_ENVIRONMENT_NAME`, `ENVIRONMENT_NAME` | `production`, `staging`, ... |
| `--cluster` | `VULNETIX_CLUSTER`, `CLUSTER_NAME`, `KUBERNETES_CLUSTER_NAME` | Where it runs |
| `--namespace` | `VULNETIX_NAMESPACE`, `POD_NAMESPACE`, `KUBERNETES_NAMESPACE` | Namespace within the cluster |
| `--tag key=value` | | Extra label, repeatable. A pair with no `=` is dropped. |
| `--bom-manufacturer` | `VULNETIX_BOM_MANUFACTURER` | CycloneDX `metadata.manufacturer`. Defaults to the repository owner the CI system reports. |
| `--lifecycle` | | Comma list of `design`, `pre-build`, `build`, `post-build`, `operations`, `discovery`, `decommission`. An unknown phase is an error. Default: derived from what was read. |

Nothing is inferred from branch names.

## Third-party VEX

| Flag | Effect |
|---|---|
| `--vex-file <file or dir>` | Apply these VEX statements before the gates (repeatable) |
| `--vex <file, dir or https URL>` | As `--vex-file`; an `https://` URL is downloaded for the run (repeatable, CLI v4.2.0 and later) |
| `--no-vex` | Ignore `--vex-file`, `--vex`, the `VexSource` documents declared in `.vulnetix/config` and the statements the Resolve Platform holds |

A scan also reads the `path` and `urls` sources of the declared [`VexSource`](/platform-iac/kinds/vex-source/) documents. An authenticated scan also applies the statements the Resolve Platform holds for the repository, including those of `tea`, `s3` and `git` sources (CLI v4.4.0); community mode applies none from the Resolve Platform. See [VEX in a scan](/vex/scans/vex-file/) and [VEX](/vex/).

## SSVC decisions

For an authenticated organization that has stored an [`SsvcPolicy`](/platform-iac/kinds/ssvc-policy/), the SSVC decision a scan reports (the `SSVC-act` tag and the `vulnetix:ssvc` property of each CycloneDX vulnerability) is made under that policy, with mission and well-being from the scanned repository's [criticality](/vulnerability-management/scope/repository-assets/). A decision made under a policy adds `vulnetix:ssvc:priority`, `:source`, `:exploitation`, `:automatable`, `:technicalImpact`, `:missionWellBeing`, and `:rule` and `:dueDays` when they apply. With no stored policy, a community-mode scan, a policy that does not compile, or a database without the policy migration, the scan keeps its previous decision and adds none of them. See [SSVC decisions](/vulnerability-management/prioritisation/ssvc/#in-the-cli-scan-and-the-remediation-plan).

## Scanner options passed through

`scan` accepts the options of the passes it runs. They are documented with their owners.

| Flags | Pass | Documented in |
|---|---|---|
| `--sca-autofix` (`--fix`), `--sca-autofix-strategy` (`safest`, `stable`, `latest`, `rolling`; default `stable`), `--sca-autofix-manifest`, `--sca-autofix-max-major-bump` (default `0`), `--yes` | fix | [SCA](/sca/) |
| `--allow`, `--allow-file`, `--license-mode` (`inclusive`, `individual`), `--policy-file`, `--exceptions-file` | license | [SCA](/sca/) |
| `-R`, `--rule <org/repo>`, `--rule-registry`, `--rule-id`, `--disable-default-rules`, `--list-default-rules`, `--suppress-test-code`, `--snippet-context` (default `-1`), `--no-cache`, `--github-publish` (`code-scanning`, `dependency-graph`) | SAST family; `--github-publish` is on [gha publish](/cli/commands/gha-publish/#publishing-from-a-scan) | [SAST](/sast/) |
| `--ignore <glob>`, `--ignore-git`, `--ignore-binaries`, `--git-history` (default on), `--git-history-max-commits` (default `500`), `--git-history-max-files` (default `5000`) | secrets | [Secrets](/secrets/) |

## Global flags

`--org-id`, `--silent`, `--no-progress`, `--no-banner`, `--no-analytics`, `--disable-memory`, `-v`. See [Global flags](/cli/reference/global-flags/).

## Tuning

| Variable | Effect |
|---|---|
| `VULNETIX_SCA_CONCURRENCY` | Parallel `cli.sca` batches. Default `6`, clamped to 1 to 16. |
| `VULNETIX_SCA_TIMEOUT` | Seconds per `cli.sca` request. Default `75`, clamped to 10 to 300. |
| `VULNETIX_SAST_WORKERS` | Concurrent rule evaluations. Default: CPU count, up to the shard ceiling. |
| `VULNETIX_SAST_SHARDS` | Concurrent compile and evaluate shards; `1` forces a single compile |
| `VULNETIX_SAST_CACHE_DIR` | Rule-result cache location (default `<user cache dir>/vulnetix/sast`), for a CI cache step |
| `VULNETIX_REACHABILITY_CONCURRENCY` | Files analysed in parallel by reachability. Default: CPU count, clamped to 1 to 32. |

All environment variables: [Environment variables](/cli/reference/environment-variables/).
