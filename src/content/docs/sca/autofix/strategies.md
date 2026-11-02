---
title: Safe Harbour strategies
nav: Strategies
description: Exactly how safest, stable, latest and rolling choose a target version, what is excluded first, and why a pick can be dropped from the plan.
order: 2
sources: [vdb-sca-match/version/pick.go, vdb-sca-match/version/scheme.go, vdb-sca-match/version/ecosystems.go, vdb-api/internal/handler/safe_harbour_picks.go, cli/internal/fix/resolve.go, cli/internal/fix/plan.go]
checked: [vdb-sca-match@ec6757e, vdb-api@4145f0a, cli@4c8c3b7]
updated: 02 Nov 2026
---

A Safe Harbour version is a release of the package with no known vulnerability, exploit or end-of-life status, and no malware report. The VDB computes four picks per package with `vdb-sca-match` and returns them in the `/v2/cli.sca` response. The CLI reads them; it does not recompute them.

## Before any pick

1. Releases reported as malware are removed.
2. Duplicate version strings are merged, keeping the earliest publish date.
3. For `safest`, `stable` and `latest`, releases marked exposed (a known vulnerability, exploit or end of life) are removed. `rolling` keeps them.
4. For `safest`, `stable` and `latest`, unstable releases are removed. A release is unstable for any of these reasons: `prerelease`, `dev`, `snapshot`, `nightly`, `milestone`, `build-metadata`, `local-version`, `pseudo-version`, `branch-ref`, `canary`, `edge`, `floating-tag`, `digest`, `git-snapshot`, `odd-minor-unstable`, `unparseable`, `calver-shape`.

## The four strategies

| Strategy | Picks |
|---|---|
| `stable` (default) | The clean stable release closest to the version you run: smallest change in major, then minor, then patch. A tie goes to the higher version. It can be lower than your version. If your version has no numeric core, the highest clean release. |
| `latest` | The highest clean stable release. For a package whose versions can be ordered, by the ecosystem's version scheme; otherwise by newest publish date. |
| `safest` | Today the same computation as `latest`. It is a separate key so the two can diverge. |
| `rolling` | Every release published on the UTC day of the highest dated release, pre-releases and exposed releases included, then the one closest to the version you run. For a package that cannot be ordered, the most recent release day. |

A package is orderable when at least 80% of its stable versions parse under its scheme, the scheme is not recency-only (git refs are not), and its history does not switch between CalVer and SemVer majors.

> [!CAREFUL] rolling can land on a vulnerable version
> `rolling` follows the newest release day, not the advisory data. It still excludes malware. The plan and the findings report any advisory that applies to the target.

## From pick to plan

The CLI then applies these rules, in order, in `ResolveTarget`:

| Check | Result |
|---|---|
| The server sent no pick for the strategy | Derive one from the ranked Safe Harbour versions. `rolling` uses the `stable` logic and prints `server did not return a rolling set; using stable` or `no rolling target (<reason>); using stable`. |
| Still no target | Use the server's recommended version, if any |
| No target at all | Skipped: `no Safe-Harbour fix version available` |
| Target equals the installed version | Skipped: `target X is already installed` |
| Target is lower than the installed version | Skipped: `target X would downgrade from Y` |
| Target crosses more majors than `--max-major-bump` | Skipped: `target X is a new major version and the major-version cap is 0`, or `crosses more than N major version(s)` |

A plan never downgrades. A `stable` pick below your version is dropped, not applied. A skipped package is written to `.vulnetix/vex-risk-accepted.json` when it has no safe version at all.

The major-version cap also covers parent upgrades. A parent upgrade that crosses the cap is not applied; the plan falls back to a parent update or an override, or leaves the package manual with the reason, for example `the fix needs express 5.1.0, a new major version from 4.17.1, and the major-version cap is 0`.

## Version schemes

Picks order versions with the ecosystem's own scheme. Examples: `semver` for npm and Cargo, `pep440` for PyPI, `go` for Go modules, `maven` for Maven, Gradle, sbt and Leiningen, `debian` for Debian and Ubuntu, `rpm` for RHEL, Rocky, AlmaLinux, SUSE, Fedora and Amazon Linux, `alpine` for Alpine, `wolfi` for Wolfi and Chainguard. An ecosystem with no scheme of its own uses a generic comparison: segments split on `.`, `-`, `+` and `_`, numbers compared as integers and ranked below letters. Git refs have no order and are picked by recency only.
