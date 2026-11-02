---
title: Gate a new dependency
description: Check a package before installing it, covering vulnerability history, exploitation signals, typosquat risk, maintenance and a Safe Harbour version to pin.
order: 3
sources:
  - mcp-server/src/tools/packages.ts
  - mcp-server/src/shaping/filters/packages.ts
  - mcp-server/src/prompts/generated.ts
  - cli/cmd/scan.go
checked: [mcp-server@1725a04, cli@4c8c3b7]
updated: 02 Nov 2026
---

The cheapest security decision is the one before `npm install`. Afterwards it is a migration.

## Ask before installing

```text
Before I add express, what is its risk profile and which version should I pin?
```

`vulnetix_package_search` returns, per package:

```json
{
  "packageName": "express",
  "vulnerabilityCount": 40,
  "maxSeverity": "high",
  "exploitationSignals": { "crowdSecSightings": 0, "exploitCount": 3, "inCisaKev": false, "inVulnCheckKev": false },
  "eolStatus": null,
  "scorecardScore": 7.4,
  "safeHarbour": { "recommendedVersions": ["4.21.2"] }
}
```

| Field | Decides |
|---|---|
| `exploitationSignals.inCisaKev` | A KEV-listed package with no fixed version is a stop |
| `exploitationSignals.exploitCount` | Public exploits make known advisories a different proposition |
| `safeHarbour.recommendedVersions` | The version to pin |
| `safeHarbour.picks.stable` | The stable release closest to the version you use |
| `scorecardScore` | Whether the project will fix the next one |

## Is it the package you meant

Search the exact string you are about to install. A name one character from something popular is the classic typosquat shape. The local prompt checks properly, against AI-malware family intelligence and maintainer health:

```text
/mcp__vulnetix__vulnetix_typosquat_check expres
```

## What is wrong with it

`vulnetix_package_vulns` returns the distinct advisory set (`cveIds`) and a per-version breakdown. Then `vulnetix_vuln` on the ids that affect the version you would install. Forty advisories against a ten-year-old package is normal.

## Pick the version

`vulnetix_package_versions` lists every known version. For an exact coordinate from a lockfile or SBOM:

```json
{ "purl": "pkg:npm/express@4.18.2" }
```

`vulnetix_purl` returns `versionStatus`, the advisories at that version and the Safe Harbour recommendation.

## Choosing between candidates

```text
/mcp__vulnetix__vulnetix_dependency_choice http-client
```

Works through which package to add for a capability: maintenance, licence, bundle weight, transitive risk, and whether the platform already does it.

## Making it automatic

In the agent's project instructions:

```text
Before adding any dependency, call vulnetix_package_search for it. Do not add anything with a
KEV-listed vulnerability and no fixed version. Pin to safeHarbour.recommendedVersions when offered.
```

In CI, use the CLI for the hard gate. It exits 1 on its own:

```bash
vulnetix scan --evaluate-sca --severity high --exploits weaponized
```

See [Agents in CI](/mcp-server/clients/ci-cd/).
