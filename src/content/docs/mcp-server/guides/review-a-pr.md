---
title: Review a pull request
description: Security review of a diff, checking added dependencies first, then the changed code with local scans, then asking for a verdict a pipeline can act on.
order: 6
sources:
  - mcp-server/src/tools/packages.ts
  - mcp-server/src/tools/analysis.ts
  - mcp-server/src/prompts/generated.ts
  - cli/cmd/scan.go
checked: [mcp-server@1725a04, cli@4c8c3b7]
updated: 02 Nov 2026
---

Scope the review to the diff, and check the dependencies first: a new dependency is code nobody on the team has read.

## Dependencies

```text
For each dependency this pull request adds or upgrades, call vulnetix_package_search with the right
ecosystem. Report vulnerability count, max severity, KEV membership, EOL status, scorecard and the
recommended safe version.
```

For an upgrade, compare the old and new versions with `vulnetix_purl` on both coordinates.

## Changed code

These need the repository, so they are local prompts:

```text
/mcp__vulnetix__vulnetix_sast_scan --paths src/ --baseline
/mcp__vulnetix__vulnetix_secret_scan --staged-only
/mcp__vulnetix__vulnetix_iac_scan
/mcp__vulnetix__vulnetix_container_scan
/mcp__vulnetix__vulnetix_license_check
```

## Coach, do not only catch

For a change touching auth, crypto, deserialisation, SQL or file handling:

```text
/mcp__vulnetix__vulnetix_secure_code_write auth
```

Or the tool, for the weakness class behind a specific advisory:

```json
{ "identifier": "CVE-2021-44228", "cweId": "CWE-502", "language": "java" }
```

On Pro, `vulnetix_secure_code_write` adds an unsafe example, a safe replacement and `reviewChecks` that catch the unsafe form, which you can reuse as a checklist.

## A verdict

```text
For every dependency added in this diff, call vulnetix_package_search and vulnetix_kev_status.
Output ONLY one line of JSON: {"verdict":"pass"|"fail","reasons":[...]}. Fail if any added
package has a KEV-listed vulnerability with no fixed version.
```

The full pipeline is on [Agents in CI](/mcp-server/clients/ci-cd/). For a gate that must hold, use the CLI, which exits 1 with no model in the path:

```bash
vulnetix scan --evaluate-sca --severity high --exploits weaponized
```

## Useful review output

A line that says "3 highs, 12 mediums" tells the author nothing. Aim for the fact, the exploitation reality, the fix and the effort:

```text
lodash@4.17.20: blocking. CVE-2021-23337, command injection, CVSS 7.2. Not in KEV, EPSS 0.004.
Fixed in 4.17.21, one patch release, no API change. Pin 4.17.21.

left-pad@1.3.0: question. No known advisories, scorecard 2.1, last commit 2018.
Fine to merge; open an issue to replace it.
```
