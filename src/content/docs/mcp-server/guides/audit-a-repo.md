---
title: Audit an inherited repository
description: First contact with an unknown codebase, checking in order what is actively exploited, unsupported, hostile, and leaked before the broad sweep, then recording and baselining.
order: 7
nav: Audit a repository
sources:
  - mcp-server/src/tools/
  - mcp-server/src/prompts/generated.ts
  - cli/cmd/agent.go
checked: [mcp-server@1725a04, cli@4c8c3b7]
updated: 02 Nov 2026
---

The failure mode is a 400-item list nobody reads. Order matters more than completeness.

## 1. What is it built from

```bash
vulnetix agent capabilities
```

Writes `.vulnetix/capabilities.yaml`: package managers, containers, IaC, CI and the scanners on your machine. The prompts read it.

## 2. Is anything actively exploited

Skip the total. Start with what is used against real systems:

```text
List every dependency in this repository's lockfiles, then for each one call vulnetix_package_search
and report only packages where exploitationSignals shows CISA or VulnCheck KEV membership. Sort by
the earliest KEV due date.
```

If this is empty, you have learned the most important thing.

## 3. Is anything unsupported

```text
/mcp__vulnetix__vulnetix_eol_check
```

An end-of-life runtime is a vulnerability that will not be fixed, and every future advisory against it is permanent. `vulnetix_eol_products` checks one runtime directly.

## 4. Is anything hostile

```text
/mcp__vulnetix__vulnetix_typosquat_check --installed
```

Rare, and worth ruling out early, because the answer changes what kind of problem you have.

## 5. The broad sweep

```text
/mcp__vulnetix__vulnetix_secret_scan
/mcp__vulnetix__vulnetix_sast_scan
/mcp__vulnetix__vulnetix_iac_scan
/mcp__vulnetix__vulnetix_container_scan
/mcp__vulnetix__vulnetix_license_check
```

Secrets first. A committed credential is exploitable today by anyone with read access and needs no vulnerability.

## 6. A shortlist

```text
Group the findings into (a) KEV-listed or actively exploited, (b) fix available without a major
version bump, (c) needs a migration, (d) not reachable from our entry points. Give me the top ten
in (a) and (b) with the single command that closes each.
```

(a) and (b) are this week. (c) is a planning conversation. (d) gets recorded and closed:

```text
/mcp__vulnetix__vulnetix_vex_publish
```

## 7. Baseline

```text
/mcp__vulnetix__vulnetix_sbom_generate --format both
```

An SBOM turns the next audit into a diff.

## 8. Keep it from coming back

Add the dependency check from [Gate a new dependency](/mcp-server/guides/gate-a-dependency/) and the CLI gate in CI.

## Done looks like

- No KEV-listed vulnerability reachable from an entry point
- No unsupported runtime
- No committed secret
- Every remaining finding fixed, scheduled, or recorded as not affected with a justification
- An SBOM
